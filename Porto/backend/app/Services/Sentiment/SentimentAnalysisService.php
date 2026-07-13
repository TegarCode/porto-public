<?php

namespace App\Services\Sentiment;

use App\Services\Insight\InsightGenerator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Symfony\Component\Process\Process;
use Throwable;

class SentimentAnalysisService
{
    public function __construct(private readonly InsightGenerator $insightGenerator)
    {
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, UploadedFile|null> $files
     * @return array<string, mixed>
     */
    public function analyze(array $payload = [], array $files = []): array
    {
        if ((bool) config('portfolio.services.sentiment.python_adapter.enabled', true)) {
            try {
                return $this->fromJson($this->sendToPythonAdapter($payload, $files));
            } catch (Throwable $exception) {
                if (! (bool) config('portfolio.services.sentiment.python_adapter.fallback_to_flask', false)) {
                    throw new \RuntimeException(
                        'BenchmarkSentimen adapter failed: '.$exception->getMessage(),
                        previous: $exception,
                    );
                }
            }
        }

        $response = $this->sendToFlask($payload, $files);

        return $this->transform($response);
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, UploadedFile|null> $files
     * @return array<string, mixed>
     */
    private function sendToPythonAdapter(array $payload, array $files): array
    {
        $script = base_path('scripts/sentiment_benchmark_analyze.py');
        $pythonBin = (string) config('portfolio.services.sentiment.python_adapter.python_bin', 'python');
        $benchmarkRoot = (string) config('portfolio.services.sentiment.python_adapter.benchmark_root');

        $command = [
            $pythonBin,
            $script,
            '--benchmark-root',
            $benchmarkRoot,
            '--aspect',
            (string) Arr::get($payload, 'aspect', 'all'),
        ];

        if ((bool) config('portfolio.services.sentiment.python_adapter.enable_ocr', false)) {
            $command[] = '--enable-ocr';
        }

        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $command[] = '--file';
            $command[] = (string) $file->getRealPath();
            $command[] = '--name';
            $command[] = $file->getClientOriginalName();
        }

        $userProfile = getenv('USERPROFILE') ?: 'C:\\Users\\Tegar Oktavianto';
        $appData = getenv('APPDATA') ?: $userProfile.'\\AppData\\Roaming';

        $process = new Process($command, base_path(), [
            'PYTHONHOME' => false,
            'PYTHONPATH' => false,
            'PYTHONIOENCODING' => 'utf-8',
            'PYTHONWARNINGS' => 'ignore',
            'SYSTEMROOT' => getenv('SYSTEMROOT') ?: getenv('SystemRoot') ?: 'C:\\Windows',
            'USERPROFILE' => $userProfile,
            'HOME' => $userProfile,
            'APPDATA' => $appData,
            'NLTK_DATA' => $appData.'\\nltk_data',
        ]);
        $process->setTimeout((int) config('portfolio.services.sentiment.python_adapter.timeout', 120));
        $process->run();

        if (! $process->isSuccessful()) {
            throw new \RuntimeException(trim($process->getErrorOutput()) ?: 'Python process failed.');
        }

        $decoded = json_decode($process->getOutput(), true);

        if (! is_array($decoded)) {
            throw new \RuntimeException('Python adapter returned invalid JSON.');
        }

        return $decoded;
    }

    /**
     * @param array<string, mixed> $payload
     * @param array<string, UploadedFile|null> $files
     */
    private function sendToFlask(array $payload, array $files): Response
    {
        $request = Http::baseUrl((string) config('portfolio.services.sentiment.base_url'))
            ->acceptJson()
            ->timeout((int) config('portfolio.services.sentiment.timeout'));

        foreach ($files as $field => $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $request = $request->attach(
                $field,
                fopen($file->getRealPath(), 'r'),
                $file->getClientOriginalName(),
                ['Content-Type' => $file->getMimeType() ?: 'text/csv'],
            );
        }

        try {
            return $request
                ->retry(
                    (int) config('portfolio.services.sentiment.retry_times', 0),
                    (int) config('portfolio.services.sentiment.retry_sleep', 250),
                )
                ->post((string) config('portfolio.services.sentiment.analyze_endpoint'), $payload)
                ->throw();
        } catch (ConnectionException $exception) {
            throw new \RuntimeException('Sentiment service is unavailable or timed out.', previous: $exception);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function transform(Response $response): array
    {
        $json = $response->json();

        if (is_array($json)) {
            return $this->fromJson($json);
        }

        return $this->fromHtml($response->body());
    }

    /**
     * @param array<string, mixed> $json
     * @return array<string, mixed>
     */
    private function fromJson(array $json): array
    {
        $source = Arr::get($json, 'data', $json);
        $distribution = $this->normalizeDistribution(
            Arr::get($source, 'distribution', Arr::get($source, 'sentiment_distribution', $source)),
        );

        $aspects = Arr::get($source, 'aspects', Arr::get($source, 'aspect_distribution', []));
        $insight = $this->insightGenerator->sentiment($distribution, is_array($aspects) ? $aspects : []);
        $summary = Arr::get($source, 'summary') ?: $insight;

        return [
            'summary' => $summary,
            'insight' => $insight,
            'distribution' => $distribution,
            'highlight' => $this->highlight($distribution, is_array($aspects) ? $aspects : []),
            'aspects' => is_array($aspects) ? $aspects : [],
            'datasets' => is_array(Arr::get($source, 'datasets')) ? Arr::get($source, 'datasets') : [],
            'spider' => is_array(Arr::get($source, 'spider')) ? Arr::get($source, 'spider') : [],
            'meta' => [
                'source' => 'BenchmarkSentimen',
                'mode' => Arr::get($source, 'meta.mode', 'json'),
                'source_message' => Arr::get($json, 'message'),
                'ocr_enabled' => Arr::get($source, 'meta.ocr_enabled'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fromHtml(string $html): array
    {
        $aspects = $this->parsePositiveAspectTable($html);
        $positive = array_sum(array_map(
            fn (array $row): int => array_sum($row['datasets']),
            $aspects,
        ));
        $distribution = [
            'positive' => $positive,
            'neutral' => 0,
            'negative' => 0,
        ];

        return [
            'summary' => $this->insightGenerator->sentiment($distribution, $aspects),
            'insight' => $this->insightGenerator->sentiment($distribution, $aspects),
            'distribution' => $distribution,
            'highlight' => $this->highlight($distribution, $aspects),
            'aspects' => $aspects,
            'meta' => [
                'source' => 'BenchmarkSentimen',
                'mode' => 'html_fallback',
                'note' => 'Flask dashboard returned HTML; negative and neutral counts are unavailable from the legacy result page.',
            ],
        ];
    }

    /**
     * @param mixed $raw
     * @return array{positive: int, neutral: int, negative: int}
     */
    private function normalizeDistribution(mixed $raw): array
    {
        if (! is_array($raw)) {
            return ['positive' => 0, 'neutral' => 0, 'negative' => 0];
        }

        return [
            'positive' => $this->countValue($raw, ['positive', 'positif', 'pos']),
            'neutral' => $this->countValue($raw, ['neutral', 'netral', 'neu']),
            'negative' => $this->countValue($raw, ['negative', 'negatif', 'neg']),
        ];
    }

    private function countValue(array $raw, array $keys): int
    {
        foreach ($keys as $key) {
            if (isset($raw[$key]) && is_numeric($raw[$key])) {
                return (int) $raw[$key];
            }
        }

        return 0;
    }

    private function parsePositiveAspectTable(string $html): array
    {
        if (! preg_match_all('/<tr>\s*<td>(.*?)<\/td>(.*?)<\/tr>/is', $html, $matches, PREG_SET_ORDER)) {
            return [];
        }

        $rows = [];

        foreach ($matches as $match) {
            $aspect = Str::lower(trim(strip_tags($match[1])));

            if ($aspect === '') {
                continue;
            }

            preg_match_all('/<td>(.*?)<\/td>/is', $match[2], $countMatches);
            $counts = array_map(
                fn (string $value): int => (int) trim(strip_tags($value)),
                $countMatches[1] ?? [],
            );

            $rows[] = [
                'aspect' => $aspect,
                'positive' => array_sum($counts),
                'datasets' => $counts,
            ];
        }

        return $rows;
    }

    private function highlight(array $distribution, array $aspects): array
    {
        $dominant = collect($distribution)
            ->map(fn (int $count, string $label): array => ['label' => $label, 'count' => $count])
            ->sortByDesc('count')
            ->take(1)
            ->values()
            ->all();

        $topAspects = collect($aspects)
            ->sortByDesc('positive')
            ->take(2)
            ->map(fn (array $aspect): array => [
                'label' => $aspect['aspect'] ?? 'unknown',
                'count' => $aspect['positive'] ?? 0,
            ])
            ->values()
            ->all();

        return array_values(array_merge($dominant, $topAspects));
    }
}
