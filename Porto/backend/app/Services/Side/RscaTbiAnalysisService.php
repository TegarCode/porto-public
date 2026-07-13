<?php

namespace App\Services\Side;

use App\Services\Insight\InsightGenerator;

class RscaTbiAnalysisService
{
    private const QUADRANTS = [
        'competitive_exporter' => [
            'label' => 'Competitive Exporter',
            'description' => 'RSCA positif dan TBI positif. Produk berada pada posisi daya saing kuat sekaligus net exporter.',
        ],
        'competitive_importer' => [
            'label' => 'Competitive but Import-Oriented',
            'description' => 'RSCA positif namun TBI negatif. Produk punya daya saing relatif, tetapi neraca masih cenderung impor.',
        ],
        'fragile_exporter' => [
            'label' => 'Fragile Exporter',
            'description' => 'RSCA negatif namun TBI positif. Produk tercatat net exporter, tetapi keunggulan komparatifnya belum kuat.',
        ],
        'weak_position' => [
            'label' => 'Weak Position',
            'description' => 'RSCA negatif dan TBI negatif. Produk belum menunjukkan daya saing dan masih cenderung import-dependent.',
        ],
    ];

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
        $data = $this->sideDataAdapter->rscaTbiData($filters);
        $rows = $data['rows'] ?? [];
        $points = $this->scatterPointsFromRows($rows);
        $quadrants = $this->quadrants($points);

        return [
            'title' => 'RSCA TBI Analysis',
            'insight' => $this->insightGenerator->rscaTbi($quadrants, $points),
            'rows' => $rows,
            'quadrants' => array_values($quadrants),
            'scatter' => [
                'x_axis' => [
                    'key' => 'rsca',
                    'label' => 'RSCA',
                    'threshold' => 0,
                ],
                'y_axis' => [
                    'key' => 'tbi',
                    'label' => 'TBI',
                    'threshold' => 0,
                ],
                'points' => $points,
            ],
            'filters' => $data['filters'] ?? [],
            'source' => $data['source'] ?? 'porto_side',
            'sourceName' => $data['source_name'] ?? 'porto_side.tbhasil_rsca_tbi',
            'origin' => $this->countryPayload($data['origin'] ?? []),
            'destination' => $this->countryPayload($data['destination'] ?? []),
            'recordCount' => count($rows),
            'highlight' => $this->highlight($quadrants),
        ];
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function data(array $filters = []): array
    {
        return $this->sideDataAdapter->rscaTbiData($filters);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function calculation(array $filters = []): array
    {
        return $this->sideDataAdapter->rscaTbiCalculation($filters);
    }

    /**
     * @param array<string, mixed> $filters
     * @return array<string, mixed>
     */
    public function comparison(array $filters = []): array
    {
        return $this->sideDataAdapter->rscaTbiComparison($filters);
    }

    /**
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function scatterPointsFromRows(array $rows): array
    {
        $points = [];

        foreach ($rows as $row) {
            if (! is_array($row)) {
                continue;
            }

            $rsca = $this->metric($row, ['rsca2023', 'rsca_2023', 'rsca']);
            $tbi = $this->metric($row, ['tbi2023', 'tbi_2023', 'tbi']);

            if ($rsca === null || $tbi === null) {
                continue;
            }

            $points[] = [
                'label' => (string) ($row['nama'] ?? $row['kode'] ?? 'Unknown product'),
                'kode' => (string) ($row['kode'] ?? $row['hs4'] ?? ''),
                'hs4' => (string) ($row['hs4'] ?? $row['kode'] ?? ''),
                'x' => $rsca,
                'y' => $tbi,
                'rsca' => $rsca,
                'tbi' => $tbi,
                'quadrant' => $this->quadrantKey($rsca, $tbi),
                'record' => [
                    'kode_hs' => $row['kode'] ?? $row['hs4'] ?? null,
                    'hs4' => $row['hs4'] ?? $row['kode'] ?? null,
                    'nama' => $row['nama'] ?? null,
                    'pm_2019' => $row['pm2019'] ?? null,
                    'pm_2023' => $row['pm2023'] ?? null,
                    'share_2019' => $row['share2019'] ?? null,
                    'share_2023' => $row['share2023'] ?? null,
                    'rsca_2019' => $row['rsca2019'] ?? null,
                    'rsca_2023' => $row['rsca2023'] ?? null,
                    'tbi_2019' => $row['tbi2019'] ?? null,
                    'tbi_2023' => $row['tbi2023'] ?? null,
                ],
            ];
        }

        return $points;
    }

    private function scatterPoints(array $records, ?string $labelKey): array
    {
        $points = [];

        foreach ($records as $record) {
            if (! is_array($record)) {
                continue;
            }

            $rsca = $this->metric($record, ['rsca', 'rsca_tujuan', 'rsca_asal', 'rsca_2023', 'rsca_tahun4', 'rsca_tahun5']);
            $tbi = $this->metric($record, ['tbi', 'tbi_tujuan', 'tbi_asal', 'tbi_2023', 'tbi_tahun4', 'tbi_tahun5']);

            if ($rsca === null || $tbi === null) {
                continue;
            }

            $points[] = [
                'label' => $this->label($record, $labelKey),
                'x' => $rsca,
                'y' => $tbi,
                'rsca' => $rsca,
                'tbi' => $tbi,
                'quadrant' => $this->quadrantKey($rsca, $tbi),
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
        if ($labelKey !== null && isset($record[$labelKey])) {
            return (string) $record[$labelKey];
        }

        foreach (['produk', 'nama_produk', 'product', 'hs_code', 'kode_hs'] as $key) {
            if (isset($record[$key])) {
                return (string) $record[$key];
            }
        }

        return 'Unknown product';
    }

    private function quadrantKey(float $rsca, float $tbi): string
    {
        if ($rsca >= 0 && $tbi >= 0) {
            return 'competitive_exporter';
        }

        if ($rsca >= 0 && $tbi < 0) {
            return 'competitive_importer';
        }

        if ($rsca < 0 && $tbi >= 0) {
            return 'fragile_exporter';
        }

        return 'weak_position';
    }

    private function quadrants(array $points): array
    {
        $quadrants = [];

        foreach (self::QUADRANTS as $key => $definition) {
            $items = array_values(array_filter(
                $points,
                fn (array $point): bool => $point['quadrant'] === $key,
            ));

            $quadrants[$key] = [
                'key' => $key,
                'label' => $definition['label'],
                'description' => $definition['description'],
                'count' => count($items),
                'items' => array_map(
                    fn (array $point): array => [
                        'label' => $point['label'],
                        'rsca' => $point['rsca'],
                        'tbi' => $point['tbi'],
                    ],
                    $items,
                ),
            ];
        }

        return $quadrants;
    }

    private function highlight(array $quadrants): array
    {
        return collect($quadrants)
            ->sortByDesc('count')
            ->take(2)
            ->map(fn (array $quadrant): array => [
                'label' => $quadrant['label'],
                'count' => $quadrant['count'],
                'description' => $quadrant['description'],
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
