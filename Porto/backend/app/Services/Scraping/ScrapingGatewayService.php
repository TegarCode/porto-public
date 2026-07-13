<?php

namespace App\Services\Scraping;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Client\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use PDO;
use Throwable;
use ZipArchive;

class ScrapingGatewayService
{
    private const SOURCE_MAP = [
        'bps' => 'bps-trade',
        'trademap' => 'trademap-folder-parser',
        'custom' => 'ssinas',
        'ssinas' => 'ssinas',
        'bps-trade' => 'bps-trade',
        'trademap-folder-parser' => 'trademap-folder-parser',
    ];

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function start(array $payload = [], array $files = []): array
    {
        $source = $this->normalizeSource($payload['source'] ?? 'bps');
        $params = $this->defaultParams($source, $payload);

        try {
            $request = $this->client()
                ->withOptions(['allow_redirects' => false]);

            if ($files !== []) {
                foreach ($files as $file) {
                    if (! $file instanceof UploadedFile) {
                        continue;
                    }

                    $request = $request->attach(
                        'folder_upload',
                        fopen($file->getRealPath(), 'r'),
                        $file->getClientOriginalName(),
                        ['Content-Type' => $file->getMimeType() ?: 'application/octet-stream'],
                    );
                }

                $response = $request->post("/run/{$source}", $params);
            } else {
                $response = $request
                    ->asForm()
                    ->post("/run/{$source}", $params);
            }
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Scraping service is unavailable or timed out.', previous: $exception);
        }

        if ($response->failed() && ! $response->redirect()) {
            throw new \RuntimeException('Scraping service returned an unsuccessful response.');
        }

        return $this->normalizeStartResponse($response, $source);
    }

    /**
     * @return array<string, mixed>
     */
    public function options(): array
    {
        $currentYear = (int) now()->format('Y');
        $years = range($currentYear - 10, $currentYear - 1);
        $checkpoints = $this->bpsCheckpointOptions();

        return [
            'sources' => [
                [
                    'id' => 'bps',
                    'tool_key' => 'bps-trade',
                    'name' => 'BPS Trade Unified',
                    'kind' => 'script',
                    'description' => 'Runner BPS gabungan dengan pilihan tahun, flow export/import, dan checkpoint HS dari Excel.',
                ],
                [
                    'id' => 'ssinas',
                    'tool_key' => 'ssinas',
                    'name' => 'SSINAS Session Token',
                    'kind' => 'internal',
                    'description' => 'Menerima PHPSESSID atau full cookie header dari browser user, lalu menjalankan scraping tanpa membuka browser server.',
                ],
                [
                    'id' => 'trademap',
                    'tool_key' => 'trademap-folder-parser',
                    'name' => 'TradeMap Folder Import',
                    'kind' => 'script',
                    'description' => 'Parser folder Excel/HTML TradeMap ke database, dengan pilihan mode dan status data.',
                ],
            ],
            'bps' => [
                'years' => array_map(fn (int $year): array => [
                    'value' => (string) $year,
                    'label' => (string) $year,
                ], $years),
                'default_year' => (string) max($years),
                'flows' => [
                    ['value' => 'export', 'label' => 'Export'],
                    ['value' => 'import', 'label' => 'Import'],
                ],
                'checkpoints' => $checkpoints['items'],
                'checkpoint_count' => $checkpoints['total'],
                'checkpoint_source' => $checkpoints['source'],
            ],
            'ssinas' => [
                'default_start_page' => 1,
                'default_end_page' => 5,
                'auth_flow' => 'Login dilakukan di browser user, paste PHPSESSID/full cookie ke form, lalu server menjalankan scraping dengan session tersebut.',
                'auth_modes' => [
                    ['value' => 'manual_token', 'label' => 'Manual PHPSESSID / Cookie'],
                    ['value' => 'browser_manual', 'label' => 'Browser Manual Lokal'],
                ],
            ],
            'trademap' => [
                'parser_modes' => [
                    ['value' => 'model_1_default', 'label' => 'Negara-Mitra'],
                    ['value' => 'model_2_negara_all', 'label' => 'Negara-ALL'],
                ],
                'statuses' => [
                    ['value' => 'export', 'label' => 'Export'],
                    ['value' => 'import', 'label' => 'Import'],
                ],
                'parser_profiles' => [
                    ['value' => 'auto', 'label' => 'Auto Detect'],
                    ['value' => 'html', 'label' => 'HTML TradeMap'],
                    ['value' => 'excel', 'label' => 'Excel Template'],
                ],
            ],
            'dashboard' => [
                'base_url' => config('portfolio.services.scraping.base_url'),
                'root' => config('portfolio.services.scraping.dashboard_root'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function databaseStatus(): array
    {
        try {
            $response = $this->client()
                ->get('/setup/database')
                ->throw();
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Scraping service is unavailable or timed out.', previous: $exception);
        } catch (RequestException $exception) {
            throw new \RuntimeException('Scraping database status request failed.', previous: $exception);
        }

        return $this->normalizeDatabaseSetupResponse($response);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    public function initializeDatabase(array $payload): array
    {
        $params = [
            'host' => (string) ($payload['host'] ?? 'localhost'),
            'port' => (int) ($payload['port'] ?? 3306),
            'user' => (string) ($payload['user'] ?? 'root'),
            'password' => (string) ($payload['password'] ?? ''),
            'database' => (string) ($payload['database'] ?? 'flask'),
        ];

        try {
            $response = $this->client()
                ->asJson()
                ->post('/setup/database', $params);
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Scraping service is unavailable or timed out.', previous: $exception);
        }

        if ($response->failed() && $response->status() !== 422) {
            throw new \RuntimeException('Scraping database setup request failed.');
        }

        return $this->normalizeDatabaseSetupResponse($response);
    }

    /**
     * @return array<string, mixed>
     */
    public function status(?string $jobId = null): array
    {
        $job = $this->fetchJob($jobId);

        return [
            'job_id' => $job['job_id'],
            'status' => $this->normalizeStatus($job['status'] ?? 'running'),
            'status_label' => $job['status_label'] ?? Str::headline($this->normalizeStatus($job['status'] ?? 'running')),
            'status_tone' => $job['status_tone'] ?? 'info',
            'progress' => $this->progress($job),
            'current_step' => $this->currentStep($job),
            'source' => $job['source'],
            'updated_at' => $job['updated_at'],
            'logs' => $this->logs($job),
            'can_stop' => (bool) ($job['can_stop'] ?? false),
            'awaiting_decision' => (bool) ($job['awaiting_decision'] ?? false),
            'decision_context' => is_array($job['decision_context'] ?? null) ? $job['decision_context'] : null,
            'insight' => $this->statusInsight($job),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function result(?string $jobId = null): array
    {
        $job = $this->fetchJob($jobId);
        $rows = $this->databasePreviewRows($job);

        if ($rows === []) {
            $rows = $this->rows($job);
        }

        return [
            'summary' => $this->summary($job, $rows),
            'insight' => $this->summary($job, $rows),
            'source' => $job['source'],
            'rows' => $rows,
            'meta' => [
                'total_rows' => count($rows),
                'columns' => $this->columns($rows),
                'mode' => $job['mode'] ?? 'gateway',
                'job_id' => $job['job_id'],
                'status' => $this->normalizeStatus($job['status'] ?? 'running'),
                'preview_source' => $this->previewSource($job),
                'logs' => $this->logs($job),
                'can_stop' => (bool) ($job['can_stop'] ?? false),
                'awaiting_decision' => (bool) ($job['awaiting_decision'] ?? false),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function stop(string $jobId): array
    {
        try {
            $response = $this->client()
                ->asForm()
                ->post("/jobs/{$jobId}/stop")
                ->throw();
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Scraping service is unavailable or timed out.', previous: $exception);
        } catch (RequestException $exception) {
            throw new \RuntimeException('Scraping job stop request failed.', previous: $exception);
        }

        return $this->normalizeJobActionResponse($response, $jobId, 'Stop request sent.');
    }

    /**
     * @return array<string, mixed>
     */
    public function decision(string $jobId, string $choice): array
    {
        $choice = in_array($choice, ['continue', 'stop'], true) ? $choice : 'stop';

        try {
            $response = $this->client()
                ->asForm()
                ->post("/jobs/{$jobId}/decision", ['choice' => $choice])
                ->throw();
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Scraping service is unavailable or timed out.', previous: $exception);
        } catch (RequestException $exception) {
            throw new \RuntimeException('Scraping job decision request failed.', previous: $exception);
        }

        return $this->normalizeJobActionResponse($response, $jobId, 'Decision request sent.');
    }

    private function client(): PendingRequest
    {
        if (
            ! (bool) config('portfolio.services.scraping.enabled')
            || blank(config('portfolio.services.scraping.base_url'))
        ) {
            throw new \RuntimeException('Scraping service is unavailable in this deployment.');
        }

        return Http::baseUrl((string) config('portfolio.services.scraping.base_url'))
            ->acceptJson()
            ->timeout((int) config('portfolio.services.scraping.timeout'))
            ->retry(
                (int) config('portfolio.services.scraping.retry_times', 0),
                (int) config('portfolio.services.scraping.retry_sleep', 250),
            );
    }

    private function normalizeSource(mixed $source): string
    {
        $key = Str::of((string) $source)->lower()->trim()->toString();

        return self::SOURCE_MAP[$key] ?? 'bps-trade';
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function defaultParams(string $source, array $payload): array
    {
        $params = Arr::except($payload, ['source']);

        if ($source === 'bps-trade') {
            $params['year'] = $params['year'] ?? now()->subYear()->format('Y');
            $params['flow'] = $params['flow'] ?? 'export';
            $params['launch_mode'] = $params['launch_mode'] ?? 'background';
        }

        if ($source === 'ssinas') {
            $params['start_page'] = $params['start_page'] ?? 1;
            $params['end_page'] = $params['end_page'] ?? 3;
            $params['auth_mode'] = $params['auth_mode'] ?? 'manual_token';
        }

        if ($source === 'trademap-folder-parser') {
            $params['parser_mode'] = $params['parser_mode'] ?? 'model_1_default';
            $params['status'] = $params['status'] ?? 'export';
            $params['parser_profile'] = $params['parser_profile'] ?? 'auto';
            $params['launch_mode'] = $params['launch_mode'] ?? 'background';
        }

        return $params;
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeStartResponse(Response $response, string $source): array
    {
        $json = $response->json();

        if (is_array($json)) {
            $payload = Arr::get($json, 'data', $json);

            return [
                'job_id' => (string) Arr::get($payload, 'job_id', Arr::get($payload, 'id', 'unknown-job')),
                'status' => $this->normalizeStatus(Arr::get($payload, 'status', 'queued')),
                'source' => (string) Arr::get($payload, 'source', Arr::get($payload, 'tool_key', $source)),
                'message' => (string) Arr::get($payload, 'message', Arr::get($payload, 'note', 'Scraping job started.')),
                'started_at' => (string) Arr::get($payload, 'started_at', Arr::get($payload, 'created_at', now()->toDateTimeString())),
                'insight' => 'Scraping job sudah masuk pipeline dan siap dipantau dari endpoint status.',
            ];
        }

        $location = $response->header('Location', '');
        $jobId = $this->jobIdFromLocation($location);

        return [
            'job_id' => $jobId,
            'status' => 'queued',
            'source' => $source,
            'message' => 'Scraping job started through DashboardScraper.',
            'started_at' => now()->toDateTimeString(),
            'insight' => 'Scraping job sudah dipicu di DashboardScraper; status berikutnya dibaca dari halaman job legacy.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchJob(?string $jobId): array
    {
        $jobId = filled($jobId) ? (string) $jobId : 'latest';

        try {
            $response = $this->client()
                ->get("/jobs/{$jobId}")
                ->throw();
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Scraping service is unavailable or timed out.', previous: $exception);
        } catch (RequestException $exception) {
            throw new \RuntimeException('Scraping job is unavailable from the source dashboard.', previous: $exception);
        }

        $json = $response->json();

        if (is_array($json)) {
            return $this->normalizeJobPayload(Arr::get($json, 'data', $json), $jobId);
        }

        return $this->jobFromHtml($response->body(), $jobId);
    }

    /**
     * @param mixed $payload
     * @return array<string, mixed>
     */
    private function normalizeJobPayload(mixed $payload, string $fallbackJobId): array
    {
        $payload = is_array($payload) ? $payload : [];

        return [
            'job_id' => (string) Arr::get($payload, 'job_id', Arr::get($payload, 'id', $fallbackJobId)),
            'status' => (string) Arr::get($payload, 'status', 'running'),
            'status_label' => (string) Arr::get($payload, 'status_label', ''),
            'status_tone' => (string) Arr::get($payload, 'status_tone', 'info'),
            'source' => (string) Arr::get($payload, 'source', Arr::get($payload, 'tool_key', Arr::get($payload, 'tool_title', 'DashboardScraper'))),
            'updated_at' => (string) Arr::get($payload, 'updated_at', Arr::get($payload, 'finished_at', Arr::get($payload, 'created_at', now()->toDateTimeString()))),
            'current_step' => (string) Arr::get($payload, 'current_step', Arr::get($payload, 'note', 'Reading scraper progress')),
            'progress' => Arr::get($payload, 'progress'),
            'rows' => Arr::get($payload, 'rows', Arr::get($payload, 'data', [])),
            'params' => is_array(Arr::get($payload, 'params')) ? Arr::get($payload, 'params') : [],
            'logs' => Arr::get($payload, 'logs', []),
            'mode' => Arr::get($payload, 'mode', 'json'),
            'can_stop' => (bool) Arr::get($payload, 'can_stop', false),
            'awaiting_decision' => (bool) Arr::get($payload, 'awaiting_decision', false),
            'decision_context' => Arr::get($payload, 'decision_context'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeJobActionResponse(Response $response, string $jobId, string $message): array
    {
        $json = $response->json();
        $payload = is_array($json) ? Arr::get($json, 'data', $json) : [];
        $job = $this->normalizeJobPayload($payload, $jobId);

        return [
            'job_id' => $job['job_id'],
            'status' => $this->normalizeStatus($job['status']),
            'source' => $job['source'],
            'message' => (string) Arr::get($json, 'message', $message),
            'updated_at' => $job['updated_at'],
            'insight' => $this->statusInsight($job),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeDatabaseSetupResponse(Response $response): array
    {
        $json = $response->json();
        $payload = is_array($json) ? Arr::get($json, 'data', $json) : [];
        $snapshot = is_array(Arr::get($payload, 'status_snapshot'))
            ? Arr::get($payload, 'status_snapshot')
            : [];
        $formState = is_array(Arr::get($payload, 'form_state'))
            ? Arr::get($payload, 'form_state')
            : [];
        $config = is_array(Arr::get($snapshot, 'config'))
            ? Arr::get($snapshot, 'config')
            : $formState;

        return [
            'configured' => (bool) Arr::get($snapshot, 'configured', false),
            'server_ok' => (bool) Arr::get($snapshot, 'server_ok', false),
            'database_exists' => (bool) Arr::get($snapshot, 'database_exists', false),
            'schema_ready' => (bool) Arr::get($snapshot, 'schema_ready', false),
            'message' => (string) Arr::get($snapshot, 'message', Arr::get($json, 'message', 'Database status unavailable.')),
            'missing_tables' => array_values((array) Arr::get($snapshot, 'missing_tables', [])),
            'table_counts' => (array) Arr::get($snapshot, 'table_counts', []),
            'config' => [
                'host' => (string) Arr::get($config, 'host', 'localhost'),
                'port' => (int) Arr::get($config, 'port', 3306),
                'user' => (string) Arr::get($config, 'user', 'root'),
                'password' => '',
                'database' => (string) Arr::get($config, 'database', 'flask'),
            ],
            'setup_result' => Arr::get($payload, 'setup_result'),
            'setup_error' => Arr::get($payload, 'setup_error'),
            'dashboard' => [
                'base_url' => config('portfolio.services.scraping.base_url'),
                'root' => config('portfolio.services.scraping.dashboard_root'),
            ],
            'insight' => (bool) Arr::get($snapshot, 'schema_ready', false)
                ? 'Database DashboardScraper sudah siap; job scraping akan menulis hasil ke schema ini.'
                : 'Database DashboardScraper belum siap; jalankan setup schema sebelum mulai scraping.',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function jobFromHtml(string $html, string $jobId): array
    {
        $text = trim(preg_replace('/\s+/', ' ', strip_tags($html)) ?? '');

        return [
            'job_id' => $jobId,
            'status' => str_contains(Str::lower($text), 'selesai') ? 'completed' : 'running',
            'status_label' => '',
            'status_tone' => 'info',
            'source' => 'DashboardScraper',
            'updated_at' => now()->toDateTimeString(),
            'current_step' => $text !== '' ? Str::limit($text, 120) : 'Reading legacy dashboard page',
            'progress' => null,
            'rows' => [],
            'params' => [],
            'logs' => $text !== '' ? [$text] : [],
            'mode' => 'html_fallback',
            'can_stop' => str_contains(Str::lower($text), 'berhenti paksa'),
            'awaiting_decision' => str_contains(Str::lower($text), 'duplicate entry'),
            'decision_context' => null,
        ];
    }

    private function jobIdFromLocation(string $location): string
    {
        if (preg_match('/\/jobs\/([^\/?#]+)/', $location, $matches)) {
            return $matches[1];
        }

        return 'unknown-job';
    }

    private function normalizeStatus(mixed $status): string
    {
        $status = Str::of((string) $status)->lower()->trim()->replace('-', '_')->toString();

        return match ($status) {
            'queued', 'running', 'completed', 'failed', 'awaiting_decision', 'stopping', 'stopped', 'launched' => $status,
            'selesai' => 'completed',
            'gagal' => 'failed',
            default => 'running',
        };
    }

    private function progress(array $job): int
    {
        if (is_numeric($job['progress'] ?? null)) {
            return max(0, min(100, (int) $job['progress']));
        }

        return match ($this->normalizeStatus($job['status'] ?? 'running')) {
            'queued' => 10,
            'running' => 55,
            'awaiting_decision' => 70,
            'stopping' => 80,
            'launched' => 25,
            'completed' => 100,
            'failed', 'stopped' => 100,
            default => 35,
        };
    }

    private function currentStep(array $job): string
    {
        $step = trim((string) ($job['current_step'] ?? ''));

        return $step !== '' ? $step : 'Reading scraper progress';
    }

    private function statusInsight(array $job): string
    {
        return sprintf(
            'Job %s berada pada status %s, sehingga pipeline scraping dapat dipantau tanpa membuka dashboard Flask secara langsung.',
            $job['job_id'],
            $this->normalizeStatus($job['status'] ?? 'running'),
        );
    }

    private function rows(array $job): array
    {
        $rows = $job['rows'] ?? [];

        if (is_array($rows) && array_is_list($rows)) {
            return array_values(array_filter($rows, 'is_array'));
        }

        $logs = $job['logs'] ?? [];

        if (! is_array($logs)) {
            return [];
        }

        return collect($logs)
            ->take(8)
            ->map(fn (mixed $line, int $index): array => [
                'step' => $index + 1,
                'message' => (string) $line,
            ])
            ->values()
            ->all();
    }

    private function databasePreviewRows(array $job): array
    {
        $pdo = $this->scraperPdo();

        if (! $pdo instanceof PDO) {
            return [];
        }

        $source = Str::lower((string) ($job['source'] ?? ''));
        $params = is_array($job['params'] ?? null) ? $job['params'] : [];

        if (str_contains($source, 'bps')) {
            $where = [];
            $bindings = [];

            if (filled($params['year'] ?? null)) {
                $where[] = '`Tahun` = :year';
                $bindings['year'] = (string) $params['year'];
            }

            if (filled($params['flow'] ?? null)) {
                $where[] = '`Status` = :status';
                $bindings['status'] = Str::headline((string) $params['flow']);
            }

            if (filled($params['start_from_hs'] ?? null)) {
                $where[] = '`HSCode` >= :start_from_hs';
                $bindings['start_from_hs'] = (string) $params['start_from_hs'];
            }

            $whereSql = $where === [] ? '' : 'WHERE '.implode(' AND ', $where);

            return $this->queryPreviewRows(
                $pdo,
                "SELECT `ID`, `Kode_Alpha3_Reporter`, `Kode_Alpha3_Partner`, `Bulan`, `Tahun`, `HSCode`, `Nilai`, `Status`, `Berat_Bersih`, `Pelabuhan`
                 FROM `tbtrade`
                 {$whereSql}
                 ORDER BY `ID` DESC
                 LIMIT 25",
                $bindings,
            );
        }

        if (str_contains($source, 'ssinas')) {
            return $this->queryPreviewRows(
                $pdo,
                "SELECT `id`, `nama_perusahaan`, `id_siinas`, `nib`, `skala_usaha`, `kbli`, `tanggal_approval`, `kab_kota`, `provinsi`
                 FROM `perusahaan`
                 ORDER BY `id` DESC
                 LIMIT 25",
            );
        }

        if (str_contains($source, 'trademap')) {
            $table = ($params['parser_mode'] ?? '') === 'model_2_negara_all'
                ? 'data_perdagangan'
                : 'data_perdagangan_full_v3';

            return $this->queryPreviewRows(
                $pdo,
                "SELECT *
                 FROM `{$table}`
                 ORDER BY `id` DESC
                 LIMIT 25",
            );
        }

        return [];
    }

    /**
     * @param array<string, mixed> $bindings
     * @return array<int, array<string, mixed>>
     */
    private function queryPreviewRows(PDO $pdo, string $query, array $bindings = []): array
    {
        try {
            $statement = $pdo->prepare($query);
            foreach ($bindings as $key => $value) {
                $statement->bindValue(":{$key}", $value);
            }
            $statement->execute();

            return $statement->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable) {
            return [];
        }
    }

    private function scraperPdo(): ?PDO
    {
        try {
            $response = $this->client()
                ->get('/setup/database')
                ->throw();

            $json = $response->json();
            $payload = is_array($json) ? Arr::get($json, 'data', $json) : [];
            $config = is_array(Arr::get($payload, 'current_config'))
                ? Arr::get($payload, 'current_config')
                : Arr::get($payload, 'status_snapshot.config', []);

            if (! is_array($config) || ! (bool) Arr::get($payload, 'status_snapshot.schema_ready', false)) {
                return null;
            }

            return new PDO(
                sprintf(
                    'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
                    (string) Arr::get($config, 'host', 'localhost'),
                    (int) Arr::get($config, 'port', 3306),
                    (string) Arr::get($config, 'database', 'flask'),
                ),
                (string) Arr::get($config, 'user', 'root'),
                (string) Arr::get($config, 'password', ''),
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ],
            );
        } catch (Throwable) {
            return null;
        }
    }

    private function previewSource(array $job): string
    {
        $source = Str::lower((string) ($job['source'] ?? ''));
        $params = is_array($job['params'] ?? null) ? $job['params'] : [];

        if (str_contains($source, 'bps')) {
            return 'tbtrade';
        }

        if (str_contains($source, 'ssinas')) {
            return 'perusahaan';
        }

        if (str_contains($source, 'trademap')) {
            return ($params['parser_mode'] ?? '') === 'model_2_negara_all'
                ? 'data_perdagangan'
                : 'data_perdagangan_full_v3';
        }

        return 'logs';
    }

    private function logs(array $job): array
    {
        $logs = $job['logs'] ?? [];

        if (! is_array($logs)) {
            return [];
        }

        return collect($logs)
            ->map(fn (mixed $line): string => (string) $line)
            ->filter(fn (string $line): bool => trim($line) !== '')
            ->values()
            ->all();
    }

    /**
     * @return array{items: array<int, array{value: string, label: string, description: string}>, total: int, source: string}
     */
    private function bpsCheckpointOptions(): array
    {
        $path = (string) config('portfolio.services.scraping.bps_hs_file');

        if (! is_file($path) || ! class_exists(ZipArchive::class)) {
            return ['items' => [], 'total' => 0, 'source' => $path];
        }

        $zip = new ZipArchive();
        if ($zip->open($path) !== true) {
            return ['items' => [], 'total' => 0, 'source' => $path];
        }

        try {
            $sharedStrings = $this->xlsxSharedStrings($zip);
            $sheetXml = $zip->getFromName('xl/worksheets/sheet1.xml');

            if ($sheetXml === false) {
                return ['items' => [], 'total' => 0, 'source' => $path];
            }

            $rows = $this->xlsxRows($sheetXml, $sharedStrings);
            $items = [];

            foreach (array_slice($rows, 1) as $row) {
                $hs = trim((string) ($row['A'] ?? $row[0] ?? ''));
                $description = trim((string) ($row['B'] ?? $row[1] ?? ''));

                if ($hs === '') {
                    continue;
                }

                $items[] = [
                    'value' => $hs,
                    'label' => $description !== '' ? "{$hs} - {$description}" : $hs,
                    'description' => $description,
                ];
            }

            return [
                'items' => array_slice($items, 0, 500),
                'total' => count($items),
                'source' => $path,
            ];
        } finally {
            $zip->close();
        }
    }

    /**
     * @return array<int, string>
     */
    private function xlsxSharedStrings(ZipArchive $zip): array
    {
        $xml = $zip->getFromName('xl/sharedStrings.xml');

        if ($xml === false) {
            return [];
        }

        $document = simplexml_load_string($xml);

        if ($document === false) {
            return [];
        }

        $strings = [];
        foreach ($document->si as $item) {
            $text = '';

            if (isset($item->t)) {
                $text = (string) $item->t;
            } elseif (isset($item->r)) {
                foreach ($item->r as $run) {
                    $text .= (string) $run->t;
                }
            }

            $strings[] = $text;
        }

        return $strings;
    }

    /**
     * @param array<int, string> $sharedStrings
     * @return array<int, array<string, string>>
     */
    private function xlsxRows(string $sheetXml, array $sharedStrings): array
    {
        $document = simplexml_load_string($sheetXml);

        if ($document === false) {
            return [];
        }

        $rows = [];
        foreach ($document->sheetData->row as $row) {
            $values = [];

            foreach ($row->c as $cell) {
                $reference = (string) $cell['r'];
                $column = preg_replace('/\d+/', '', $reference) ?: (string) count($values);
                $type = (string) $cell['t'];
                $raw = (string) $cell->v;

                $values[$column] = $type === 's'
                    ? (string) ($sharedStrings[(int) $raw] ?? '')
                    : $raw;
            }

            $rows[] = $values;
        }

        return $rows;
    }

    private function summary(array $job, array $rows): string
    {
        return sprintf(
            'Scraping %s berada pada status %s dengan %d baris preview yang siap dibaca.',
            $job['source'],
            $this->normalizeStatus($job['status'] ?? 'running'),
            count($rows),
        );
    }

    private function columns(array $rows): array
    {
        $first = $rows[0] ?? [];

        return is_array($first) ? array_keys($first) : [];
    }
}
