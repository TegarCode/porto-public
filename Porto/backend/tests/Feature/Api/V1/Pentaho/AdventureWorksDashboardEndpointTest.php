<?php

namespace Tests\Feature\Api\V1\Pentaho;

use Tests\TestCase;

class AdventureWorksDashboardEndpointTest extends TestCase
{
    public function test_adventureworks_dashboard_endpoint_returns_etl_dashboard_data(): void
    {
        $response = $this->getJson('/api/v1/pentaho/adventureworks');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'AdventureWorks ETL Dashboard')
            ->assertJsonPath('data.source', 'porto_side')
            ->assertJsonPath('data.summary.fact_rows', 64515)
            ->assertJsonPath('message', 'AdventureWorks ETL dashboard is ready.')
            ->assertJsonStructure([
                'data' => [
                    'title',
                    'source',
                    'source_tables',
                    'summary',
                    'insight',
                    'charts' => [
                        'sales_by_region',
                        'freight_by_region',
                        'yearly_sales_by_region',
                        'yearly_freight_by_region',
                        'transactions_by_country_year',
                        'sales_reason_by_year',
                        'product_category_share',
                        'product_category_monthly_share',
                    ],
                    'tables' => [
                        'top_products',
                        'table_counts',
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.insight'));
        $this->assertSame('North America', $response->json('data.charts.sales_by_region.0.region'));
        $this->assertGreaterThan(0, $response->json('data.summary.total_sales'));
    }
}
