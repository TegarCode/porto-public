<?php

namespace App\Services\Side;

use App\Services\Insight\InsightGenerator;

class RcaEpdAnalysisService
{
    public function __construct(
        private readonly SideDataAdapter $sideDataAdapter,
        private readonly InsightGenerator $insightGenerator,
    )
    {
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function analyze(array $filters = []): array
    {
        $data = $this->sideDataAdapter->rcaEpdData($filters);
        $rows = $data['rows'] ?? [];
        $points = $this->matrixPointsFromRows($rows);
        $matrix = $this->matrix($points);
        $xModelOptions = $this->xModelOptions($filters)['options'] ?? [];

        return [
            'title' => 'RCA EPD Analysis',
            'insight' => $this->insightGenerator->rcaEpd($matrix, $points),
            'rows' => $rows,
            'matrix' => array_values($matrix),
            'chart' => [
                'type' => 'matrix',
                'x_axis' => [
                    'key' => 'growth_share',
                    'label' => 'Export Share Growth',
                    'threshold' => 0,
                ],
                'y_axis' => [
                    'key' => 'growth_demand',
                    'label' => 'Demand Growth',
                    'threshold' => 0,
                ],
                'size_key' => 'avg_rca',
                'points' => $points,
            ],
            'filters' => $data['filters'] ?? [],
            'source' => $data['source'] ?? 'porto_side',
            'sourceName' => $data['source_name'] ?? 'porto_side.tbhasil_rca_epd',
            'origin' => $this->countryPayload($data['origin'] ?? []),
            'destination' => $this->countryPayload($data['destination'] ?? []),
            'xModelOptions' => $xModelOptions,
            'recordCount' => count($rows),
            'highlight' => $this->highlight($matrix),
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function data(array $filters = []): array
    {
        return $this->sideDataAdapter->rcaEpdData($filters);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function calculation(array $filters = []): array
    {
        return $this->sideDataAdapter->rcaEpdCalculation($filters);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function comparison(array $filters = []): array
    {
        return $this->sideDataAdapter->rcaEpdComparison($filters);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function xModelOptions(array $filters = []): array
    {
        $result = $this->sideDataAdapter->rcaEpdXModelOptions($filters);

        return [
            'options' => $result['rows']['options'] ?? [],
            'origin' => $this->countryPayload($result['origin'] ?? []),
            'destination' => $this->countryPayload($result['destination'] ?? []),
            'filters' => $result['filters'] ?? [],
            'source' => $result['source'] ?? 'porto_side',
            'sourceName' => $result['source_name'] ?? 'porto_side.tbhasil_rca_epd',
        ];
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function matrixPointsFromRows(array $rows): array
    {
        $points = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $growthShare = $this->metric($row, ['avgGrowthShare', 'avg_growth_share', 'growth_share']);
            $growthDemand = $this->metric($row, ['avgGrowthDemand', 'avg_growth_demand', 'growth_demand']);
            $avgRca = $this->metric($row, ['avgRca', 'avg_rca', 'rca']);

            if ($growthShare === null || $growthDemand === null) {
                continue;
            }

            $positionLabel = trim((string) ($row['kategoriEpd'] ?? ''));

            if ($positionLabel === '') {
                $positionLabel = $this->position([], $growthShare, $growthDemand)['label'];
            }

            $points[] = [
                'label' => (string) ($row['komoditas'] ?? $row['kode'] ?? 'Unknown product'),
                'kode' => (string) ($row['kode'] ?? $row['hs4'] ?? ''),
                'hs4' => (string) ($row['hs4'] ?? $row['kode'] ?? ''),
                'x' => $growthShare,
                'y' => $growthDemand,
                'growth_share' => $growthShare,
                'growth_demand' => $growthDemand,
                'avg_rca' => $avgRca,
                'position' => $this->positionKey($positionLabel),
                'position_label' => $positionLabel,
                'x_model' => $row['xModel'] ?? null,
                'record' => [
                    'kode_hs' => $row['kode'] ?? $row['hs4'] ?? null,
                    'hs4' => $row['hs4'] ?? $row['kode'] ?? null,
                    'komoditas' => $row['komoditas'] ?? null,
                    'kategori_epd' => $positionLabel,
                    'avg_growth_share' => $growthShare,
                    'avg_growth_demand' => $growthDemand,
                    'avg_rca' => $avgRca,
                    'x_model' => $row['xModel'] ?? null,
                ],
            ];
        }

        return $points;
    }

    private function matrixPoints(array $records, ?string $labelKey): array
    {
        $points = [];

        foreach ($records as $record) {
            if (! is_array($record)) {
                continue;
            }

            $growthShare = $this->metric($record, ['avg_growth_share', 'growth_share']);
            $growthDemand = $this->metric($record, ['avg_growth_demand', 'growth_demand']);
            $avgRca = $this->metric($record, ['avg_rca', 'rca']);

            if ($growthShare === null || $growthDemand === null) {
                continue;
            }

            $position = $this->position($record, $growthShare, $growthDemand);

            $points[] = [
                'label' => $this->label($record, $labelKey),
                'x' => $growthShare,
                'y' => $growthDemand,
                'growth_share' => $growthShare,
                'growth_demand' => $growthDemand,
                'avg_rca' => $avgRca,
                'position' => $position['key'],
                'position_label' => $position['label'],
                'x_model' => $record['x_model'] ?? null,
                'record' => $record,
            ];
        }

        return $points;
    }

    private function metric(array $record, array $candidates): ?float
    {
        foreach ($candidates as $key) {
            if (isset($record[$key]) && is_numeric($record[$key])) {
                return (float) $record[$key];
            }
        }

        foreach ($record as $key => $value) {
            $normalizedKey = strtolower((string) $key);

            foreach ($candidates as $candidate) {
                if (str_contains($normalizedKey, $candidate) && is_numeric($value)) {
                    return (float) $value;
                }
            }
        }

        return null;
    }

    private function label(array $record, ?string $labelKey): string
    {
        foreach (['komoditas', 'nama_produk', 'produk', 'product', 'kode_hs', 'hs_code'] as $key) {
            if (isset($record[$key])) {
                return (string) $record[$key];
            }
        }

        if ($labelKey !== null && isset($record[$labelKey])) {
            return (string) $record[$labelKey];
        }

        return 'Unknown product';
    }

    /**
     * @return array{key: string, label: string}
     */
    private function position(array $record, float $growthShare, float $growthDemand): array
    {
        $category = trim((string) ($record['kategori_epd'] ?? $record['kategori'] ?? ''));

        if ($category !== '') {
            return [
                'key' => $this->positionKey($category),
                'label' => $category,
            ];
        }

        if ($growthShare >= 0 && $growthDemand >= 0) {
            return ['key' => 'rising_star', 'label' => 'Rising Star'];
        }

        if ($growthShare < 0 && $growthDemand >= 0) {
            return ['key' => 'lost_opportunity', 'label' => 'Lost Opportunity'];
        }

        if ($growthShare >= 0 && $growthDemand < 0) {
            return ['key' => 'falling_star', 'label' => 'Falling Star'];
        }

        return ['key' => 'retreat', 'label' => 'Retreat'];
    }

    private function positionKey(string $category): string
    {
        $key = preg_replace('/[^A-Za-z0-9]+/', '_', trim($category)) ?: $category;
        $key = preg_replace('/_+/', '_', $key) ?: $key;

        return strtolower(trim($key, '_'));
    }

    private function matrix(array $points): array
    {
        $matrix = [];

        foreach ($points as $point) {
            $key = $point['position'];

            if (! isset($matrix[$key])) {
                $matrix[$key] = [
                    'key' => $key,
                    'label' => $point['position_label'],
                    'count' => 0,
                    'avg_rca' => null,
                    'items' => [],
                ];
            }

            $matrix[$key]['count']++;
            $matrix[$key]['items'][] = [
                'label' => $point['label'],
                'growth_share' => $point['growth_share'],
                'growth_demand' => $point['growth_demand'],
                'avg_rca' => $point['avg_rca'],
                'x_model' => $point['x_model'],
            ];
        }

        foreach ($matrix as $key => $group) {
            $rcaValues = array_values(array_filter(
                array_column($group['items'], 'avg_rca'),
                fn (mixed $value): bool => is_numeric($value),
            ));

            $matrix[$key]['avg_rca'] = $rcaValues === []
                ? null
                : round(array_sum($rcaValues) / count($rcaValues), 4);
        }

        return collect($matrix)
            ->sortByDesc('count')
            ->all();
    }

    private function highlight(array $matrix): array
    {
        return collect($matrix)
            ->take(3)
            ->map(fn (array $position): array => [
                'label' => $position['label'],
                'count' => $position['count'],
                'avg_rca' => $position['avg_rca'],
            ])
            ->values()
            ->all();
    }

    /**
     * @param array<string, mixed> $country
     * @return array{code: string|null, name: string|null, alpha2: string|null}
     */
    private function countryPayload(array $country): array
    {
        return [
            'code' => $country['a3'] ?? null,
            'name' => $country['nama'] ?? null,
            'alpha2' => $country['a2'] ?? null,
        ];
    }
}
