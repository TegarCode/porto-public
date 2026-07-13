<?php

namespace App\Services\Side;

use App\Exceptions\SideAdapterException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SideDataAdapter
{
    private const ANALYSES = [
        'rca_cmsa' => [
            'chart_type' => 'strategy_bar',
            'series' => ['value'],
        ],
        'rsca_tbi' => [
            'chart_type' => 'scatter',
            'series' => ['rsca_2023', 'tbi_2023'],
        ],
        'rca_epd' => [
            'chart_type' => 'matrix',
            'series' => ['avg_rca', 'growth'],
        ],
    ];

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rcaCmsa(array $filters = []): array
    {
        return $this->fetchAnalysis('rca_cmsa', $this->normalizePairFilters($filters, true));
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rscaTbi(array $filters = []): array
    {
        return $this->fetchAnalysis('rsca_tbi', $this->normalizePairFilters($filters));
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rscaTbiData(array $filters = []): array
    {
        $filters = $this->normalizeRscaTbiFilters($filters);

        return $this->rememberRscaTbi('data', $filters, function () use ($filters): array {
            $rows = $this->rscaTbiBaseQuery($filters)
                ->selectRaw('
                    HsCode,
                    NamaProduk,
                    PM_Tahun2 as PM_2019,
                    PM_Tahun4 as PM_2023,
                    ROUND((Tahun2 / NULLIF(Tahun2_Dunia,0)) * 100, 2) as share_2019,
                    ROUND((Tahun4 / NULLIF(Tahun4_Dunia,0)) * 100, 2) as share_2023,
                    RSCA_Tahun2 as RSCA_2019,
                    RSCA_Tahun4 as RSCA_2023,
                    TBI_Tahun2 as TBI_2019,
                    TBI_Tahun4 as TBI_2023
                ')
                ->orderByDesc('RSCA_Tahun4')
                ->limit($this->rowLimit($filters))
                ->get()
                ->map(fn (object $row): array => $this->transformRscaTbiSummaryRow($row))
                ->values()
                ->all();

            return $this->rscaTbiResult($filters, $rows, 'porto_side.tbhasil_rsca_tbi');
        });
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rscaTbiCalculation(array $filters = []): array
    {
        $filters = $this->normalizeRscaTbiFilters($filters);

        return $this->rememberRscaTbi('calculation', $filters, function () use ($filters): array {
            $rows = $this->rscaTbiBaseQuery($filters)
                ->orderByDesc('RSCA_Tahun4')
                ->limit($this->rowLimit($filters))
                ->get()
                ->map(fn (object $row): array => $this->transformRscaTbiCalculationRow($row))
                ->values()
                ->all();

            return $this->rscaTbiResult($filters, $rows, 'porto_side.tbhasil_rsca_tbi');
        });
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rscaTbiComparison(array $filters = []): array
    {
        $filters = $this->normalizeRscaTbiFilters($filters);

        return $this->rememberRscaTbi('comparison', $filters, function () use ($filters): array {
            $rows = $this->db()
                ->table('tbhasilakhir_rsca_tbi')
                ->select($this->rscaTbiComparisonColumns())
                ->where('KodeNegara_1', $filters['origin'])
                ->where('KodeNegara_2', $filters['dest'])
                ->where('LevelHS', (string) $filters['level'])
                ->limit($this->rowLimit($filters))
                ->get()
                ->map(fn (object $row): array => $this->transformRscaTbiComparisonRow($row))
                ->values()
                ->all();

            return $this->rscaTbiResult($filters, $rows, 'porto_side.tbhasilakhir_rsca_tbi');
        });
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rcaEpd(array $filters = []): array
    {
        return $this->fetchAnalysis('rca_epd', $this->normalizePairFilters($filters));
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rcaEpdData(array $filters = []): array
    {
        $filters = $this->normalizeRcaEpdFilters($filters);

        return $this->rememberRcaEpd('data', $filters, function () use ($filters): array {
            $rows = $this->rcaEpdBaseQuery($filters)
                ->select([
                    'Kategori',
                    'HsCode',
                    'NamaProduk',
                    'Avg_Growth_Share',
                    'Avg_Growth_Demand',
                    'Avg_RCA',
                    'xModel',
                ])
                ->orderBy('HsCode')
                ->limit($this->rowLimit($filters))
                ->get()
                ->map(fn (object $row): array => $this->transformRcaEpdSummaryRow($row))
                ->values()
                ->all();

            return $this->rcaEpdResult($filters, $rows, 'porto_side.tbhasil_rca_epd');
        });
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rcaEpdCalculation(array $filters = []): array
    {
        $filters = $this->normalizeRcaEpdFilters($filters);

        return $this->rememberRcaEpd('calculation', $filters, function () use ($filters): array {
            $rows = $this->rcaEpdBaseQuery($filters)
                ->orderBy('HsCode')
                ->limit($this->rowLimit($filters))
                ->get()
                ->map(fn (object $row): array => $this->transformRcaEpdCalculationRow($row))
                ->values()
                ->all();

            return $this->rcaEpdResult($filters, $rows, 'porto_side.tbhasil_rca_epd');
        });
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rcaEpdComparison(array $filters = []): array
    {
        $filters = $this->normalizeRcaEpdFilters($filters);

        return $this->rememberRcaEpd('comparison', $filters, function () use ($filters): array {
            $rows = $this->db()
                ->table('tbhasilakhir_rca_epd')
                ->select($this->rcaEpdComparisonColumns())
                ->where('KodeNegara_1', $filters['origin'])
                ->where('KodeNegara_2', $filters['dest'])
                ->where('LevelHS', (string) $filters['level'])
                ->orderBy('HsCode')
                ->limit($this->rowLimit($filters))
                ->get()
                ->map(fn (object $row): array => $this->transformRcaEpdComparisonRow($row))
                ->values()
                ->all();

            return $this->rcaEpdResult($filters, $rows, 'porto_side.tbhasilakhir_rca_epd');
        });
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function rcaEpdXModelOptions(array $filters = []): array
    {
        $filters = $this->normalizeRcaEpdFilters($filters);
        unset($filters['x_model']);

        return $this->rememberRcaEpd('xmodel_options', $filters, function () use ($filters): array {
            $options = $this->db()
                ->table('tbhasil_rca_epd')
                ->select('xModel')
                ->where('KodeNegara', $filters['dest'])
                ->where('LevelHS', (string) $filters['level'])
                ->whereNotNull('xModel')
                ->distinct()
                ->orderBy('xModel')
                ->pluck('xModel')
                ->map(fn (mixed $value): string => trim((string) $value))
                ->filter(fn (string $value): bool => $value !== '')
                ->values()
                ->all();

            return $this->rcaEpdResult($filters, ['options' => $options], 'porto_side.tbhasil_rca_epd');
        });
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function fetchAnalysis(string $analysis, array $filters = []): array
    {
        if (! isset(self::ANALYSES[$analysis])) {
            throw new SideAdapterException("Unsupported SIDE analysis [{$analysis}].");
        }

        $definition = self::ANALYSES[$analysis];
        $cacheKey = $this->cacheKey($analysis, $filters);
        $ttl = (int) config('portfolio.cache.side_ttl', 300);

        if ($ttl > 0) {
            return Cache::remember($cacheKey, $ttl, fn (): array => $this->fetchFresh($analysis, $definition, $filters));
        }

        return $this->fetchFresh($analysis, $definition, $filters);
    }

    /**
     * @param array<string, mixed> $definition
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function fetchFresh(string $analysis, array $definition, array $filters): array
    {
        try {
            $response = match ($analysis) {
                'rca_cmsa' => $this->rcaCmsaPayload($filters),
                'rsca_tbi' => $this->rscaTbiPayload($filters),
                'rca_epd' => $this->rcaEpdPayload($filters),
                default => throw new SideAdapterException("Unsupported SIDE analysis [{$analysis}]."),
            };
        } catch (QueryException $exception) {
            throw new SideAdapterException('Local SIDE portfolio database is unavailable or missing required tables.', previous: $exception);
        }

        return $this->transform($analysis, $definition, $filters, $response);
    }

    private function db()
    {
        return DB::connection('side_portfolio');
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function rcaCmsaPayload(array $filters): array
    {
        $db = $this->db();
        $origin = $this->firstCountry($filters['origin'] ?? 'IDN', 'IDN');
        $dest = $this->firstCountry($filters['dest'] ?? 'CHN', 'CHN');
        $colMap = [
            'IMPORT' => 'Impor_RI_From_Partner',
            'EXPORT' => 'Ekspor_RI_To_Partner',
            'FDI OUTBOUND' => 'Impor_RI_From_Partner',
            'FDI INBOUND' => 'Ekspor_RI_To_Partner',
        ];

        $fetch = function (string $strategy) use ($db, $origin, $dest, $colMap): array {
            $nilaiCol = $colMap[$strategy];

            return $db->table('tbhasilakhir as t')
                ->select([
                    't.HsCode as Kode',
                    't.NamaProduk as Nama Produk',
                    't.Strategy as Strategi',
                ])
                ->selectRaw("SUM(t.`{$nilaiCol}`) as Nilai")
                ->where('t.KodeNegara_1', $origin)
                ->where('t.KodeNegara_2', $dest)
                ->where('t.Strategy', $strategy)
                ->whereNotNull($nilaiCol)
                ->groupBy('t.HsCode', 't.NamaProduk', 't.Strategy')
                ->orderByDesc('Nilai')
                ->get()
                ->values()
                ->map(fn (object $row, int $index): array => [
                    'Rank' => $index + 1,
                    'Kode' => (string) $row->{'Kode'},
                    'Nama Produk' => (string) $row->{'Nama Produk'},
                    'Strategi' => (string) $row->{'Strategi'},
                    'Nilai' => $row->{'Nilai'} === null ? null : (float) $row->{'Nilai'},
                ])
                ->all();
        };

        $payload = [
            'import' => $fetch('IMPORT'),
            'export' => $fetch('EXPORT'),
            'fdi_outbound' => $fetch('FDI OUTBOUND'),
            'fdi_inbound' => $fetch('FDI INBOUND'),
        ];

        foreach ($colMap as $strategy => $column) {
            $sum = (float) $db->table('tbhasilakhir')
                ->where('KodeNegara_1', $origin)
                ->where('KodeNegara_2', $dest)
                ->where('Strategy', $strategy)
                ->sum($column);

            match ($strategy) {
                'IMPORT' => $payload['SUMimport'] = $sum,
                'EXPORT' => $payload['SUMexport'] = $sum,
                'FDI OUTBOUND' => $payload['SUMfdi_outbound'] = $sum,
                'FDI INBOUND' => $payload['SUMfdi_inbound'] = $sum,
            };
        }

        return [
            'message' => 'Data Analisis RCA CMSA dari database lokal Porto.',
            'meta' => [
                'sumber' => 'porto_side',
                'origin' => $this->countryMeta($origin),
                'dest' => $this->countryMeta($dest),
            ],
            'data' => $payload,
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function rscaTbiPayload(array $filters): array
    {
        $dest = $this->firstCountry($filters['dest'] ?? 'CHN', 'CHN');
        $level = (int) ($filters['level'] ?? 6);

        $rows = $this->db()
            ->table('tbhasil_rsca_tbi')
            ->selectRaw('
                HsCode,
                NamaProduk,
                PM_Tahun2 as PM_2019,
                PM_Tahun4 as PM_2023,
                ROUND((tahun2 / NULLIF(tahun2_dunia,0)) * 100, 2) as share_2019,
                ROUND((tahun4 / NULLIF(tahun4_dunia,0)) * 100, 2) as share_2023,
                RSCA_Tahun2 as RSCA_2019,
                RSCA_Tahun4 as RSCA_2023,
                TBI_Tahun2 as TBI_2019,
                TBI_Tahun4 as TBI_2023
            ')
            ->where('KodeNegara', $dest)
            ->where('LevelHS', $level)
            ->orderByDesc('RSCA_Tahun4')
            ->limit($this->rowLimit($filters))
            ->get()
            ->map(fn (object $row): array => (array) $row)
            ->all();

        return [
            'message' => 'Data RSCA TBI dari database lokal Porto.',
            'meta' => [
                'sumber' => 'porto_side',
                'dest' => $this->countryMeta($dest),
                'level' => $level,
            ],
            'data' => $rows,
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function rcaEpdPayload(array $filters): array
    {
        $dest = $this->firstCountry($filters['dest'] ?? 'CHN', 'CHN');
        $level = (int) ($filters['level'] ?? 6);
        $xModel = isset($filters['x_model']) && filled($filters['x_model'])
            ? trim((string) $filters['x_model'])
            : null;

        $rows = $this->db()
            ->table('tbhasil_rca_epd')
            ->selectRaw('
                Kategori as `Kategori EPD`,
                HsCode as `Kode HS`,
                NamaProduk as `Komoditas`,
                Avg_Growth_Share as `AVG Growth Share`,
                Avg_Growth_Demand as `AVG Growth Demand`,
                Avg_RCA as `AVG RCA`,
                xModel as `X Model`
            ')
            ->where('KodeNegara', $dest)
            ->where('LevelHS', $level)
            ->when($xModel, fn ($query, string $value) => $query->where('xModel', $value))
            ->orderBy('HsCode')
            ->limit($this->rowLimit($filters))
            ->get()
            ->map(fn (object $row): array => (array) $row)
            ->all();

        return [
            'message' => 'Data RCA EPD dari database lokal Porto.',
            'meta' => [
                'sumber' => 'porto_side',
                'dest' => $this->countryMeta($dest),
                'level' => $level,
                'x_model' => $xModel,
            ],
            'data' => $rows,
        ];
    }

    /**
     * @param array<string, mixed> $filters
     */
    private function cacheKey(string $analysis, array $filters): string
    {
        ksort($filters);

        return 'portfolio:side:local:v2:'.$analysis.':'.md5(json_encode($filters, JSON_THROW_ON_ERROR));
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function normalizePairFilters(array $filters, bool $useArrayCountry = false): array
    {
        $origin = $this->countryValue($filters['origin'] ?? 'IDN', $useArrayCountry);
        $dest = $this->countryValue($filters['dest'] ?? 'CHN', $useArrayCountry);

        $normalized = [
            'origin' => $origin,
            'dest' => $dest,
        ];

        if (isset($filters['level'])) {
            $normalized['level'] = (int) $filters['level'];
        }

        if (isset($filters['x_model']) && filled($filters['x_model'])) {
            $xModel = trim((string) $filters['x_model']);

            if ($xModel !== '' && strtoupper($xModel) !== 'ALL') {
                $normalized['x_model'] = $xModel;
            }
        }

        if (isset($filters['limit'])) {
            $normalized['limit'] = $filters['limit'];
        }

        return $normalized;
    }

    /**
     * SIDE uses an "ALL" table option; keep a hard cap so portfolio responses stay bounded.
     *
     * @param array<string, mixed> $filters
     */
    private function rowLimit(array $filters, int $default = 10000): int
    {
        $limit = $filters['limit'] ?? $default;

        if (is_string($limit) && strtoupper(trim($limit)) === 'ALL') {
            return 10000;
        }

        if (! is_numeric($limit)) {
            return $default;
        }

        return max(1, min(10000, (int) $limit));
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function normalizeRscaTbiFilters(array $filters): array
    {
        $normalized = $this->normalizePairFilters($filters);

        $normalized['origin'] = $this->firstCountry($normalized['origin'] ?? 'IDN', 'IDN');
        $normalized['dest'] = $this->firstCountry($normalized['dest'] ?? 'CHN', 'CHN');
        $normalized['level'] = (int) ($normalized['level'] ?? 6);

        return $normalized;
    }

    /**
     * @param array<string, mixed> $filters
     */
    private function rscaTbiBaseQuery(array $filters)
    {
        return $this->db()
            ->table('tbhasil_rsca_tbi')
            ->where('KodeNegara', $filters['dest'])
            ->where('LevelHS', (string) $filters['level']);
    }

    /**
     * @param array<string, mixed> $filters
     * @param callable(): array<string, mixed> $callback
     * @return array<string, mixed>
     */
    private function rememberRscaTbi(string $name, array $filters, callable $callback): array
    {
        $ttl = (int) config('portfolio.cache.side_ttl', 300);

        if ($ttl <= 0) {
            return $callback();
        }

        return Cache::remember($this->cacheKey('rsca_tbi_'.$name, $filters), $ttl, $callback);
    }

    /**
     * @param array<string, mixed> $filters
     * @param array<int, array<string, mixed>> $rows
     * @return array<string, mixed>
     */
    private function rscaTbiResult(array $filters, array $rows, string $sourceName): array
    {
        return [
            'rows' => $rows,
            'origin' => $this->countryMeta($filters['origin']),
            'destination' => $this->countryMeta($filters['dest']),
            'filters' => $filters,
            'source' => 'porto_side',
            'source_name' => $sourceName,
            'record_count' => count($rows),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRscaTbiSummaryRow(object $row): array
    {
        $kode = (string) ($row->HsCode ?? '');

        return [
            'kode' => $kode,
            'hs4' => $kode,
            'nama' => (string) ($row->NamaProduk ?? ''),
            'pm2019' => $row->PM_2019 === null ? null : (string) $row->PM_2019,
            'pm2023' => $row->PM_2023 === null ? null : (string) $row->PM_2023,
            'share2019' => $this->nullableFloat($row->share_2019 ?? null),
            'share2023' => $this->nullableFloat($row->share_2023 ?? null),
            'rsca2019' => $this->nullableFloat($row->RSCA_2019 ?? null),
            'rsca2023' => $this->nullableFloat($row->RSCA_2023 ?? null),
            'tbi2019' => $this->nullableFloat($row->TBI_2019 ?? null),
            'tbi2023' => $this->nullableFloat($row->TBI_2023 ?? null),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRscaTbiCalculationRow(object $row): array
    {
        $kode = (string) ($row->HsCode ?? '');

        return [
            'kode' => $kode,
            'hs4' => $kode,
            'nama' => (string) ($row->NamaProduk ?? ''),
            'nilai2019' => $this->nullableFloat($row->Tahun2 ?? null),
            'nilai2023' => $this->nullableFloat($row->Tahun4 ?? null),
            'dunia2019' => $this->nullableFloat($row->Tahun2_Dunia ?? null),
            'dunia2023' => $this->nullableFloat($row->Tahun4_Dunia ?? null),
            'rca2019' => $this->nullableFloat($row->RCA_Tahun2 ?? null),
            'rca2023' => $this->nullableFloat($row->RCA_Tahun4 ?? null),
            'rsca2019' => $this->nullableFloat($row->RSCA_Tahun2 ?? null),
            'rsca2023' => $this->nullableFloat($row->RSCA_Tahun4 ?? null),
            'tbi2019' => $this->nullableFloat($row->TBI_Tahun2 ?? null),
            'tbi2023' => $this->nullableFloat($row->TBI_Tahun4 ?? null),
            'groupRsca2019' => $this->nullableFloat($row->GroupRSCA_Tahun2 ?? null),
            'groupRsca2023' => $this->nullableFloat($row->GroupRSCA_Tahun4 ?? null),
            'groupTbi2019' => $this->nullableFloat($row->GroupTBI_Tahun2 ?? null),
            'groupTbi2023' => $this->nullableFloat($row->GroupTBI_Tahun4 ?? null),
            'pm2019' => $row->PM_Tahun2 === null ? null : (string) $row->PM_Tahun2,
            'pm2023' => $row->PM_Tahun4 === null ? null : (string) $row->PM_Tahun4,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function rscaTbiComparisonColumns(): array
    {
        $columns = [
            'KodeNegara_1',
            'KodeNegara_2',
            'HsCode',
            'NamaProduk',
        ];

        foreach (['RCA_Asal', 'RSCA_Asal', 'RCA_Tujuan', 'RSCA_Tujuan', 'TBI_Asal', 'TBI_Tujuan'] as $base) {
            foreach (array_keys($this->rscaTbiComparisonYearSuffixMap()) as $suffix) {
                $columns[] = "{$base}_{$suffix}";
            }
        }

        foreach (['PM_Asal', 'PM_Tujuan', 'Strategy'] as $base) {
            foreach (array_keys($this->rscaTbiComparisonYearSuffixMap()) as $suffix) {
                $columns[] = "{$base}_{$suffix}";
            }
        }

        return [
            ...$columns,
            'Impor_RI_From_World',
            'Impor_RI_From_Partner',
            'Ekspor_RI_To_Partner',
            'Impor_Partner_From_World',
            'Ekspor_RI_To_World',
            'Ekspor_Partner_To_World',
        ];
    }

    /**
     * @return array<string, string>
     */
    private function rscaTbiComparisonYearSuffixMap(): array
    {
        return [
            'Tahun2' => '2019',
            'Tahun4' => '2023',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRscaTbiComparisonRow(object $row): array
    {
        $result = [];

        foreach ((array) $row as $key => $value) {
            $label = $this->readableRscaTbiComparisonKey($key);

            if ($label !== null) {
                $result[$label] = $this->normalizeRscaTbiTableValue($label, $value);
            }
        }

        return $result;
    }

    private function readableRscaTbiComparisonKey(string $key): ?string
    {
        if (in_array($key, ['Year1', 'Year2', 'LevelHS'], true)) {
            return null;
        }

        $map = [
            'KodeNegara_1' => 'Negara 1',
            'KodeNegara_2' => 'Negara 2',
            'HsCode' => 'Kode HS',
            'NamaProduk' => 'Nama Produk',
            'Impor_RI_From_World' => 'Impor RI dari Dunia',
            'Impor_RI_From_Partner' => 'Impor RI dari Mitra',
            'Ekspor_RI_To_Partner' => 'Ekspor RI ke Mitra',
            'Impor_Partner_From_World' => 'Impor Mitra dari Dunia',
            'Ekspor_RI_To_World' => 'Ekspor RI ke Dunia',
            'Ekspor_Partner_To_World' => 'Ekspor Mitra ke Dunia',
        ];

        if (isset($map[$key])) {
            return $map[$key];
        }

        $label = $key;

        foreach ($this->rscaTbiComparisonYearSuffixMap() as $suffix => $year) {
            $label = preg_replace('/_'.preg_quote($suffix, '/').'$/', ' '.$year, $label) ?? $label;
        }

        return str_replace('_', ' ', $label);
    }

    private function normalizeRscaTbiTableValue(string $label, mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if (str_contains($label, 'Kode') || str_contains($label, 'Negara') || str_contains($label, 'Nama Produk') || str_contains($label, 'PM ') || str_contains($label, 'Strategy')) {
            return (string) $value;
        }

        return $this->normalizeValue($value);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    private function normalizeRcaEpdFilters(array $filters): array
    {
        $normalized = $this->normalizePairFilters($filters);

        $normalized['origin'] = $this->firstCountry($normalized['origin'] ?? 'IDN', 'IDN');
        $normalized['dest'] = $this->firstCountry($normalized['dest'] ?? 'CHN', 'CHN');
        $normalized['level'] = (int) ($normalized['level'] ?? 4);

        return $normalized;
    }

    /**
     * @param array<string, mixed> $filters
     */
    private function rcaEpdBaseQuery(array $filters)
    {
        return $this->db()
            ->table('tbhasil_rca_epd')
            ->where('KodeNegara', $filters['dest'])
            ->where('LevelHS', (string) $filters['level'])
            ->when($filters['x_model'] ?? null, fn ($query, string $xModel) => $query->where('xModel', $xModel));
    }

    /**
     * @param array<string, mixed> $filters
     * @param callable(): array<string, mixed> $callback
     * @return array<string, mixed>
     */
    private function rememberRcaEpd(string $name, array $filters, callable $callback): array
    {
        $ttl = (int) config('portfolio.cache.side_ttl', 300);

        if ($ttl <= 0) {
            return $callback();
        }

        return Cache::remember($this->cacheKey('rca_epd_'.$name, $filters), $ttl, $callback);
    }

    /**
     * @param array<string, mixed> $filters
     * @param array<string, mixed>|array<int, array<string, mixed>> $rows
     * @return array<string, mixed>
     */
    private function rcaEpdResult(array $filters, array $rows, string $sourceName): array
    {
        return [
            'rows' => $rows,
            'origin' => $this->countryMeta($filters['origin']),
            'destination' => $this->countryMeta($filters['dest']),
            'filters' => $filters,
            'source' => 'porto_side',
            'source_name' => $sourceName,
            'record_count' => array_is_list($rows) ? count($rows) : count($rows['options'] ?? []),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRcaEpdSummaryRow(object $row): array
    {
        return [
            'kode' => (string) ($row->HsCode ?? ''),
            'hs4' => (string) ($row->HsCode ?? ''),
            'komoditas' => (string) ($row->NamaProduk ?? ''),
            'kategoriEpd' => $row->Kategori === null ? null : (string) $row->Kategori,
            'avgGrowthShare' => $this->nullableFloat($row->Avg_Growth_Share ?? null),
            'avgGrowthDemand' => $this->nullableFloat($row->Avg_Growth_Demand ?? null),
            'avgRca' => $this->nullableFloat($row->Avg_RCA ?? null),
            'xModel' => $row->xModel === null ? null : (string) $row->xModel,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRcaEpdCalculationRow(object $row): array
    {
        $result = [];

        foreach ((array) $row as $key => $value) {
            $label = $this->readableRcaEpdCalculationKey($key, $row);

            if ($label !== null) {
                $result[$label] = $this->normalizeRcaEpdTableValue($label, $value);
            }
        }

        return $result;
    }

    private function readableRcaEpdCalculationKey(string $key, object $row): ?string
    {
        if (in_array($key, ['ID', 'Year1', 'Year2', 'LevelHS'], true)) {
            return null;
        }

        $map = [
            'KodeNegara' => 'Kode Negara',
            'HsCode' => 'Kode HS',
            'NamaProduk' => 'Nama Produk',
            'Avg_Growth_Share' => 'AVG Growth Share',
            'Avg_Growth_Demand' => 'AVG Growth Demand',
            'Avg_RCA' => 'AVG RCA',
            'Kategori' => 'Kategori EPD',
            'xModel' => 'X Model',
        ];

        if (isset($map[$key])) {
            return $map[$key];
        }

        if (preg_match('/^Tahun([1-5])$/', $key, $matches)) {
            return 'EXP '.$this->rcaEpdYearLabel($row, (int) $matches[1]);
        }

        if (preg_match('/^Tahun([1-5])_Dunia$/', $key, $matches)) {
            return 'EXP W '.$this->rcaEpdYearLabel($row, (int) $matches[1]);
        }

        if (preg_match('/^RCA_Tahun([1-5])$/', $key, $matches)) {
            return 'RCA '.$this->rcaEpdYearLabel($row, (int) $matches[1]);
        }

        if (preg_match('/^Growth_Share([1-5])$/', $key, $matches)) {
            return 'Growth Share '.$this->rcaEpdYearLabel($row, (int) $matches[1]);
        }

        if (preg_match('/^Growth_Demand([1-5])$/', $key, $matches)) {
            return 'Growth Demand '.$this->rcaEpdYearLabel($row, (int) $matches[1]);
        }

        return str_replace('_', ' ', $key);
    }

    private function rcaEpdYearLabel(object $row, int $index): string
    {
        $baseYear = isset($row->Year1) && is_numeric($row->Year1) ? (int) $row->Year1 : null;

        if ($baseYear === null) {
            return 'Tahun '.$index;
        }

        return (string) ($baseYear + $index - 1);
    }

    /**
     * @return array<int, string>
     */
    private function rcaEpdComparisonColumns(): array
    {
        return [
            'KodeNegara_1',
            'KodeNegara_2',
            'HsCode',
            'NamaProduk',
            'AVG_RCA_Asal',
            'AVG_Growth_Share_Asal',
            'AVG_Growth_Demand_Asal',
            'xModel_Asal',
            'Kategori_Asal',
            'AVG_RCA_Tujuan',
            'AVG_Growth_Share_Tujuan',
            'AVG_Growth_Demand_Tujuan',
            'Kategori_Tujuan',
            'xModel_Tujuan',
            'Strategy',
            'Impor_RI_From_World',
            'Impor_RI_From_Partner',
            'Ekspor_RI_To_Partner',
            'Impor_Partner_From_World',
            'Ekspor_RI_To_World',
            'Ekspor_Partner_To_World',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformRcaEpdComparisonRow(object $row): array
    {
        $result = [];

        foreach ((array) $row as $key => $value) {
            $label = $this->readableRcaEpdComparisonKey($key);

            if ($label !== null) {
                $result[$label] = $this->normalizeRcaEpdTableValue($label, $value);
            }
        }

        return $result;
    }

    private function readableRcaEpdComparisonKey(string $key): ?string
    {
        $map = [
            'KodeNegara_1' => 'Negara 1',
            'KodeNegara_2' => 'Negara 2',
            'HsCode' => 'Kode HS',
            'NamaProduk' => 'Nama Produk',
            'AVG_RCA_Asal' => 'AVG RCA Asal',
            'AVG_Growth_Share_Asal' => 'AVG Growth Share Asal',
            'AVG_Growth_Demand_Asal' => 'AVG Growth Demand Asal',
            'xModel_Asal' => 'X Model Asal',
            'Kategori_Asal' => 'Kategori EPD Asal',
            'AVG_RCA_Tujuan' => 'AVG RCA Tujuan',
            'AVG_Growth_Share_Tujuan' => 'AVG Growth Share Tujuan',
            'AVG_Growth_Demand_Tujuan' => 'AVG Growth Demand Tujuan',
            'xModel_Tujuan' => 'X Model Tujuan',
            'Kategori_Tujuan' => 'Kategori EPD Tujuan',
            'Strategy' => 'Strategy',
            'Impor_RI_From_World' => 'Impor RI dari Dunia',
            'Impor_RI_From_Partner' => 'Impor RI dari Mitra',
            'Ekspor_RI_To_Partner' => 'Ekspor RI ke Mitra',
            'Impor_Partner_From_World' => 'Impor Mitra dari Dunia',
            'Ekspor_RI_To_World' => 'Ekspor RI ke Dunia',
            'Ekspor_Partner_To_World' => 'Ekspor Mitra ke Dunia',
        ];

        return $map[$key] ?? str_replace('_', ' ', $key);
    }

    private function nullableFloat(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function normalizeRcaEpdTableValue(string $label, mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if (str_contains($label, 'Kode') || str_contains($label, 'Negara') || str_contains($label, 'Nama Produk') || str_contains($label, 'X Model') || str_contains($label, 'Kategori') || $label === 'Strategy') {
            return (string) $value;
        }

        return $this->normalizeValue($value);
    }

    private function countryValue(mixed $value, bool $asArray): string|array
    {
        $items = is_array($value) ? $value : [$value];
        $items = array_map(
            fn (mixed $item): string => strtoupper(trim((string) $item)),
            $items,
        );
        $items = array_values(array_unique(array_filter(
            $items,
            fn (string $item): bool => (bool) preg_match('/^[A-Z]{3}$/', $item),
        )));

        if ($items === []) {
            $items = ['IDN'];
        }

        return $asArray ? $items : $items[0];
    }

    private function firstCountry(mixed $value, string $fallback): string
    {
        $normalized = $this->countryValue($value, false);

        return is_string($normalized) ? $normalized : $fallback;
    }

    /**
     * @return array{a3: string, a2: string|null, nama: string|null}
     */
    private function countryMeta(string $code): array
    {
        $row = $this->db()
            ->table('tbnegara')
            ->select('Negara_IDN as nama', 'Kode_Alpha2 as a2', 'Kode_Alpha3 as a3')
            ->where('Kode_Alpha3', $code)
            ->first();

        return [
            'a3' => $code,
            'a2' => $row->a2 ?? null,
            'nama' => $row->nama ?? null,
        ];
    }

    /**
     * @param array<string, mixed> $definition
     * @param array<string, mixed> $filters
     * @param array<string, mixed> $response
     * @return array<string, mixed>
     */
    private function transform(string $analysis, array $definition, array $filters, array $response): array
    {
        $payload = Arr::get($response, 'data', []);
        $records = $this->extractRecords($payload);

        return [
            'source' => 'porto_side',
            'analysis' => $analysis,
            'filters' => $filters,
            'records' => $records,
            'payload' => $payload,
            'chart' => [
                'type' => $definition['chart_type'],
                'label_key' => $this->guessLabelKey($records),
                'series' => $definition['series'],
                'data' => $records,
            ],
            'meta' => [
                'source_message' => Arr::get($response, 'message'),
                'source_meta' => Arr::get($response, 'meta', []),
                'record_count' => count($records),
            ],
            'insight_seed' => $this->buildInsightSeed($analysis, $records),
        ];
    }

    private function extractRecords(mixed $payload): array
    {
        if (! is_array($payload)) {
            return [];
        }

        if ($this->isListOfRows($payload)) {
            return $this->normalizeRows($payload);
        }

        foreach (['records', 'rows', 'items', 'table', 'data', 'result', 'results'] as $key) {
            $candidate = Arr::get($payload, $key);

            if ($this->isListOfRows($candidate)) {
                return $this->normalizeRows($candidate);
            }
        }

        foreach ($payload as $candidate) {
            if ($this->isListOfRows($candidate)) {
                return $this->normalizeRows($candidate);
            }
        }

        return $this->normalizeRows([$payload]);
    }

    private function isListOfRows(mixed $value): bool
    {
        return is_array($value)
            && array_is_list($value)
            && ($value === [] || is_array($value[0]));
    }

    private function normalizeRows(array $rows): array
    {
        return array_values(array_map(function (array $row): array {
            $normalized = [];

            foreach ($row as $key => $value) {
                $normalized[$this->normalizeKey((string) $key)] = $this->normalizeValue($value);
            }

            return $normalized;
        }, $rows));
    }

    private function normalizeValue(mixed $value): mixed
    {
        if (is_numeric($value)) {
            return (float) $value;
        }

        return $value;
    }

    private function normalizeKey(string $key): string
    {
        $key = preg_replace('/[^A-Za-z0-9]+/', '_', trim($key)) ?: $key;
        $key = preg_replace('/_+/', '_', $key) ?: $key;

        return strtolower(trim($key, '_'));
    }

    private function guessLabelKey(array $records): ?string
    {
        $first = $records[0] ?? [];

        foreach (['produk', 'product', 'nama_produk', 'namaproduk', 'komoditas', 'hs_code', 'hscode', 'kode_hs', 'kode'] as $key) {
            if (array_key_exists($key, $first)) {
                return $key;
            }
        }

        return array_key_first($first);
    }

    private function buildInsightSeed(string $analysis, array $records): array
    {
        return [
            'analysis' => $analysis,
            'record_count' => count($records),
            'top_record' => $records[0] ?? null,
            'numeric_keys' => $this->numericKeys($records[0] ?? []),
        ];
    }

    private function numericKeys(array $row): array
    {
        return array_values(array_filter(
            array_keys($row),
            fn (string $key): bool => is_float($row[$key] ?? null) || is_int($row[$key] ?? null),
        ));
    }
}
