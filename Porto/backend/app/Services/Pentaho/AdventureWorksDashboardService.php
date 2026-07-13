<?php

namespace App\Services\Pentaho;

use Illuminate\Database\ConnectionInterface;
use Illuminate\Support\Facades\DB;

class AdventureWorksDashboardService
{
    /**
     * @return array<string, mixed>
     */
    public function dashboard(): array
    {
        $summary = $this->summary();
        $salesByRegion = $this->salesByRegion();
        $freightByRegion = $this->freightByRegion();
        $topRegion = $salesByRegion[0] ?? null;
        $topProductCategory = $this->productCategoryShare()[0] ?? null;

        return [
            'title' => 'AdventureWorks ETL Dashboard',
            'source' => 'porto_side',
            'source_tables' => [
                'fact_sales',
                'product',
                'reason',
                'territory',
                'time',
            ],
            'summary' => $summary,
            'insight' => $this->insight($summary, $topRegion, $topProductCategory),
            'charts' => [
                'sales_by_region' => $salesByRegion,
                'freight_by_region' => $freightByRegion,
                'yearly_sales_by_region' => $this->yearlySalesByRegion(),
                'yearly_freight_by_region' => $this->yearlyFreightByRegion(),
                'transactions_by_country_year' => $this->transactionsByCountryYear(),
                'sales_reason_by_year' => $this->salesReasonByYear(),
                'product_category_share' => $this->productCategoryShare(),
                'product_category_monthly_share' => $this->productCategoryMonthlyShare(),
            ],
            'tables' => [
                'top_products' => $this->topProducts(),
                'table_counts' => $this->tableCounts(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(): array
    {
        $row = $this->db()
            ->table('fact_sales as fs')
            ->join('time as t', 't.Time_id', '=', 'fs.Time_id')
            ->selectRaw('SUM(fs.SubTotal) as total_sales')
            ->selectRaw('SUM(fs.Freight) as total_freight')
            ->selectRaw('MIN(t.tahun) as min_year')
            ->selectRaw('MAX(t.tahun) as max_year')
            ->selectRaw('COUNT(*) as fact_rows')
            ->first();

        return [
            'total_sales' => $this->number($row->total_sales ?? null),
            'total_freight' => $this->number($row->total_freight ?? null),
            'min_year' => (int) ($row->min_year ?? 0),
            'max_year' => (int) ($row->max_year ?? 0),
            'fact_rows' => (int) ($row->fact_rows ?? 0),
            'sales_reason_count' => (int) $this->db()->table('reason')->count(),
            'region_group_count' => (int) $this->db()->table('territory')->distinct()->count('Group'),
            'product_count' => (int) $this->db()->table('product')->count(),
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function salesByRegion(): array
    {
        return $this->db()
            ->table('fact_sales as fs')
            ->join('territory as tr', 'tr.TerritoryID', '=', 'fs.TerritoryID')
            ->selectRaw('tr.`Group` as region')
            ->selectRaw('SUM(fs.SubTotal) as subtotal')
            ->groupBy('tr.Group')
            ->orderByDesc('subtotal')
            ->get()
            ->map(fn (object $row): array => [
                'region' => (string) $row->region,
                'subtotal' => $this->number($row->subtotal),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function freightByRegion(): array
    {
        return $this->db()
            ->table('fact_sales as fs')
            ->join('territory as tr', 'tr.TerritoryID', '=', 'fs.TerritoryID')
            ->selectRaw('tr.`Group` as region')
            ->selectRaw('SUM(fs.Freight) as freight')
            ->groupBy('tr.Group')
            ->orderByDesc('freight')
            ->get()
            ->map(fn (object $row): array => [
                'region' => (string) $row->region,
                'freight' => $this->number($row->freight),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function yearlySalesByRegion(): array
    {
        return $this->db()
            ->table('fact_sales as fs')
            ->join('time as t', 't.Time_id', '=', 'fs.Time_id')
            ->join('territory as tr', 'tr.TerritoryID', '=', 'fs.TerritoryID')
            ->selectRaw('t.tahun as year')
            ->selectRaw('tr.`Group` as region')
            ->selectRaw('SUM(fs.SubTotal) as subtotal')
            ->groupBy('t.tahun', 'tr.Group')
            ->orderBy('t.tahun')
            ->orderBy('tr.Group')
            ->get()
            ->map(fn (object $row): array => [
                'year' => (int) $row->year,
                'region' => (string) $row->region,
                'subtotal' => $this->number($row->subtotal),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function yearlyFreightByRegion(): array
    {
        return $this->db()
            ->table('fact_sales as fs')
            ->join('time as t', 't.Time_id', '=', 'fs.Time_id')
            ->join('territory as tr', 'tr.TerritoryID', '=', 'fs.TerritoryID')
            ->selectRaw('t.tahun as year')
            ->selectRaw('tr.`Group` as region')
            ->selectRaw('SUM(fs.Freight) as freight')
            ->groupBy('t.tahun', 'tr.Group')
            ->orderBy('t.tahun')
            ->orderBy('tr.Group')
            ->get()
            ->map(fn (object $row): array => [
                'year' => (int) $row->year,
                'region' => (string) $row->region,
                'freight' => $this->number($row->freight),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function transactionsByCountryYear(): array
    {
        return $this->db()
            ->table('fact_sales as fs')
            ->join('territory as tr', 'tr.TerritoryID', '=', 'fs.TerritoryID')
            ->join('time as t', 't.Time_id', '=', 'fs.Time_id')
            ->selectRaw('tr.CountryRegionCode as country')
            ->selectRaw('t.tahun as year')
            ->selectRaw('COUNT(fs.ProductID) as transactions')
            ->groupBy('tr.CountryRegionCode', 't.tahun')
            ->orderBy('tr.CountryRegionCode')
            ->orderBy('t.tahun')
            ->get()
            ->map(fn (object $row): array => [
                'country' => (string) $row->country,
                'year' => (int) $row->year,
                'transactions' => (int) $row->transactions,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function salesReasonByYear(): array
    {
        return $this->db()
            ->table('time as t')
            ->crossJoin('reason as r')
            ->leftJoin('fact_sales as fs', function ($join): void {
                $join->on('t.Time_id', '=', 'fs.Time_id')
                    ->on('r.SalesReasonID', '=', 'fs.SalesReasonID');
            })
            ->whereBetween('t.tahun', [2001, 2004])
            ->selectRaw('r.SalesReason as reason')
            ->selectRaw('t.tahun as year')
            ->selectRaw('COUNT(fs.SalesReasonID) as total_sales')
            ->groupBy('r.SalesReason', 't.tahun')
            ->orderBy('r.SalesReason')
            ->orderBy('t.tahun')
            ->get()
            ->map(fn (object $row): array => [
                'reason' => (string) $row->reason,
                'year' => (int) $row->year,
                'total_sales' => (int) $row->total_sales,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function productCategoryShare(): array
    {
        $rows = $this->db()
            ->table('fact_sales as fs')
            ->join('product as p', 'p.ProductID', '=', 'fs.ProductID')
            ->join('time as t', 't.Time_id', '=', 'fs.Time_id')
            ->where('t.tahun', 2004)
            ->whereNotIn('t.bulan', [7])
            ->selectRaw('p.ProductCategory as category')
            ->selectRaw('SUM(fs.SubTotal) as subtotal')
            ->groupBy('p.ProductCategory')
            ->orderByDesc('subtotal')
            ->get()
            ->map(fn (object $row): array => [
                'category' => (string) $row->category,
                'subtotal' => $this->number($row->subtotal),
            ])
            ->values()
            ->all();

        $total = array_sum(array_column($rows, 'subtotal'));

        return array_map(fn (array $row): array => [
            ...$row,
            'share' => $total > 0 ? round(($row['subtotal'] / $total) * 100, 2) : 0,
        ], $rows);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function productCategoryMonthlyShare(): array
    {
        $categoryTotals = $this->db()
            ->table('fact_sales as fs')
            ->join('product as p', 'p.ProductID', '=', 'fs.ProductID')
            ->join('time as t', 't.Time_id', '=', 'fs.Time_id')
            ->where('t.tahun', 2004)
            ->whereNotIn('t.bulan', [7])
            ->selectRaw('p.ProductCategory as category')
            ->selectRaw('SUM(fs.SubTotal) as subtotal')
            ->groupBy('p.ProductCategory')
            ->pluck('subtotal', 'category')
            ->map(fn (mixed $value): float => $this->number($value))
            ->all();

        return $this->db()
            ->table('fact_sales as fs')
            ->join('product as p', 'p.ProductID', '=', 'fs.ProductID')
            ->join('time as t', 't.Time_id', '=', 'fs.Time_id')
            ->where('t.tahun', 2004)
            ->whereNotIn('t.bulan', [7])
            ->selectRaw('p.ProductCategory as category')
            ->selectRaw('t.bulan as month')
            ->selectRaw('SUM(fs.SubTotal) as subtotal')
            ->groupBy('p.ProductCategory', 't.bulan')
            ->orderBy('p.ProductCategory')
            ->orderBy('t.bulan')
            ->get()
            ->map(function (object $row) use ($categoryTotals): array {
                $subtotal = $this->number($row->subtotal);
                $category = (string) $row->category;
                $total = $categoryTotals[$category] ?? 0.0;

                return [
                    'category' => $category,
                    'month' => (int) $row->month,
                    'subtotal' => $subtotal,
                    'share' => $total > 0 ? round(($subtotal / $total) * 100, 2) : 0,
                ];
            })
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function topProducts(): array
    {
        return $this->db()
            ->table('fact_sales as fs')
            ->join('product as p', 'p.ProductID', '=', 'fs.ProductID')
            ->select([
                'p.ProductID as product_id',
                'p.Name as product_name',
                'p.ProductCategory as category',
            ])
            ->selectRaw('SUM(fs.SubTotal) as subtotal')
            ->selectRaw('SUM(fs.Freight) as freight')
            ->selectRaw('COUNT(*) as transactions')
            ->groupBy('p.ProductID', 'p.Name', 'p.ProductCategory')
            ->orderByDesc('subtotal')
            ->limit(12)
            ->get()
            ->map(fn (object $row): array => [
                'product_id' => (int) $row->product_id,
                'product_name' => (string) $row->product_name,
                'category' => (string) $row->category,
                'subtotal' => $this->number($row->subtotal),
                'freight' => $this->number($row->freight),
                'transactions' => (int) $row->transactions,
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, int>
     */
    private function tableCounts(): array
    {
        $tables = ['fact_sales', 'product', 'reason', 'territory', 'time'];
        $counts = [];

        foreach ($tables as $table) {
            $counts[$table] = (int) $this->db()->table($table)->count();
        }

        return $counts;
    }

    /**
     * @param array<string, mixed>|null $topRegion
     * @param array<string, mixed>|null $topCategory
     */
    private function insight(array $summary, ?array $topRegion, ?array $topCategory): string
    {
        if ($summary['fact_rows'] === 0) {
            return 'Data AdventureWorks belum tersedia di porto_side, sehingga dashboard ETL belum dapat membaca performa penjualan.';
        }

        return sprintf(
            'Warehouse AdventureWorks membaca %s transaksi dari %d sampai %d dengan total penjualan %.2f. Region paling kuat adalah %s dan kategori produk terbesar adalah %s, sehingga narasi ETL menonjol pada performa wilayah serta kontribusi kategori.',
            number_format((int) $summary['fact_rows'], 0, ',', '.'),
            $summary['min_year'],
            $summary['max_year'],
            $summary['total_sales'],
            $topRegion['region'] ?? 'unknown',
            $topCategory['category'] ?? 'unknown',
        );
    }

    private function db(): ConnectionInterface
    {
        return DB::connection('side_portfolio');
    }

    private function number(mixed $value): float
    {
        return is_numeric($value) ? round((float) $value, 2) : 0.0;
    }
}
