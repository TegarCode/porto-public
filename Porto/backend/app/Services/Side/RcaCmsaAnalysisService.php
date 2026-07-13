<?php

namespace App\Services\Side;

use App\Services\Insight\InsightGenerator;

class RcaCmsaAnalysisService
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
        $adapted = $this->sideDataAdapter->rcaCmsa($filters);
        $overview = $this->overview($adapted);
        $data = $overview['chart_rows'] !== []
            ? $overview['chart_rows']
            : $this->productRows($adapted['records'] ?? [], $adapted['chart']['label_key'] ?? null);

        return [
            'title' => 'RCA CMSA Analysis',
            'insight' => $this->insightGenerator->rcaCmsa($data, $overview['totals']),
            'data' => $data,
            'buckets' => $overview['buckets'],
            'totals' => $overview['totals'],
            'origin' => $overview['origin'],
            'destination' => $overview['destination'],
            'highlight' => $this->highlight($data),
            'chart' => [
                'type' => 'strategy_bar',
                'label_key' => 'label',
                'bar_keys' => ['value'],
                'line_keys' => [],
                'data' => $data,
            ],
            'filters' => $adapted['filters'] ?? [],
            'source' => $adapted['source'] ?? 'porto_side',
        ];
    }

    /**
     * @param array<string, mixed> $adapted
     * @return array<string, mixed>
     */
    private function overview(array $adapted): array
    {
        $payload = is_array($adapted['payload'] ?? null) ? $adapted['payload'] : [];
        $meta = $adapted['meta']['source_meta'] ?? [];
        $meta = is_array($meta) ? $meta : [];

        $buckets = [
            'export' => $this->simpleRows($payload['export'] ?? []),
            'import' => $this->simpleRows($payload['import'] ?? []),
            'fdiInbound' => $this->simpleRows($payload['fdi_inbound'] ?? []),
            'fdiOutbound' => $this->simpleRows($payload['fdi_outbound'] ?? []),
        ];

        $totals = [
            'allCount' => array_sum(array_map('count', $buckets)),
            'exportCount' => count($buckets['export']),
            'importCount' => count($buckets['import']),
            'fdiInboundCount' => count($buckets['fdiInbound']),
            'fdiOutboundCount' => count($buckets['fdiOutbound']),
            'exportSum' => $this->number($payload['SUMexport'] ?? null),
            'importSum' => $this->number($payload['SUMimport'] ?? null),
            'fdiInboundSum' => $this->number($payload['SUMfdi_inbound'] ?? null),
            'fdiOutboundSum' => $this->number($payload['SUMfdi_outbound'] ?? null),
        ];

        return [
            'buckets' => $buckets,
            'totals' => $totals,
            'chart_rows' => $this->chartRowsFromBuckets($buckets),
            'origin' => [
                'code' => $meta['origin']['a3'] ?? null,
                'name' => $meta['origin']['nama'] ?? null,
            ],
            'destination' => [
                'code' => $meta['dest']['a3'] ?? null,
                'name' => $meta['dest']['nama'] ?? null,
            ],
        ];
    }

    private function simpleRows(mixed $rows): array
    {
        if (! is_array($rows)) {
            return [];
        }

        return collect($rows)
            ->filter(fn (mixed $row): bool => is_array($row))
            ->map(fn (array $row): array => [
                'rank' => (int) ($row['Rank'] ?? $row['rank'] ?? 0),
                'hs4' => substr((string) ($row['Kode'] ?? $row['kode'] ?? ''), 0, 4),
                'kode' => (string) ($row['Kode'] ?? $row['kode'] ?? ''),
                'nama' => (string) ($row['Nama Produk'] ?? $row['nama_produk'] ?? $row['nama'] ?? '-'),
                'strategi' => (string) ($row['Strategi'] ?? $row['strategi'] ?? ''),
                'nilai' => $this->number($row['Nilai'] ?? $row['nilai'] ?? null),
            ])
            ->values()
            ->all();
    }

    private function chartRowsFromBuckets(array $buckets): array
    {
        return collect($buckets)
            ->flatMap(fn (array $rows, string $bucket): array => array_map(
                fn (array $row): array => [
                    'label' => $row['nama'],
                    'bucket' => $bucket,
                    'strategy' => $row['strategi'],
                    'value' => $row['nilai'],
                    'rank' => $row['rank'],
                    'strength_score' => $row['nilai'] ?? 0,
                    'record' => $row,
                ],
                $rows,
            ))
            ->sortByDesc('strength_score')
            ->values()
            ->all();
    }

    private function productRows(array $records, ?string $labelKey): array
    {
        $rows = [];

        foreach ($records as $record) {
            if (! is_array($record)) {
                continue;
            }

            $rcaOrigin = $this->metric($record, ['rca_asal', 'rca_origin', 'rca_indonesia', 'rca']);
            $cmsaOrigin = $this->metric($record, ['cmsa_asal', 'cmsa_origin', 'cmsa_indonesia', 'cmsa']);
            $rcaDestination = $this->metric($record, ['rca_tujuan', 'rca_destination', 'rca_dest']);
            $cmsaDestination = $this->metric($record, ['cmsa_tujuan', 'cmsa_destination', 'cmsa_dest']);

            if ($rcaOrigin === null && $cmsaOrigin === null && $rcaDestination === null && $cmsaDestination === null) {
                continue;
            }

            $rows[] = [
                'label' => $this->label($record, $labelKey),
                'rca_origin' => $rcaOrigin,
                'cmsa_origin' => $cmsaOrigin,
                'rca_destination' => $rcaDestination,
                'cmsa_destination' => $cmsaDestination,
                'strength_score' => $this->strengthScore($rcaOrigin, $cmsaOrigin, $rcaDestination, $cmsaDestination),
                'record' => $record,
            ];
        }

        return collect($rows)
            ->sortByDesc('strength_score')
            ->values()
            ->all();
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

        foreach (['produk', 'nama_produk', 'komoditas', 'product', 'hs_code', 'kode_hs'] as $key) {
            if (isset($record[$key])) {
                return (string) $record[$key];
            }
        }

        return 'Unknown product';
    }

    private function strengthScore(?float ...$values): float
    {
        return round(array_sum(array_map(
            fn (?float $value): float => $value ?? 0.0,
            $values,
        )), 4);
    }

    private function number(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function highlight(array $data): array
    {
        return collect($data)
            ->take(3)
            ->map(fn (array $row): array => [
                'label' => $row['label'],
                'count' => 1,
                'description' => sprintf(
                    'RCA origin %.2f, CMSA destination %.2f.',
                    $row['rca_origin'] ?? 0,
                    $row['cmsa_destination'] ?? 0,
                ),
            ])
            ->values()
            ->all();
    }
}
