<?php

namespace Tests\Feature\Api\V1\Analysis;

use Tests\TestCase;

class RcaCmsaEndpointTest extends TestCase
{
    public function test_rca_cmsa_endpoint_returns_portfolio_ready_chart_data_and_insight(): void
    {
        $response = $this->getJson('/api/v1/analysis/rca-cmsa?origin=idn&dest=chn&level=6');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'RCA CMSA Analysis')
            ->assertJsonPath('data.chart.type', 'strategy_bar')
            ->assertJsonPath('data.filters.origin.0', 'IDN')
            ->assertJsonPath('data.filters.dest.0', 'CHN')
            ->assertJsonPath('message', 'RCA CMSA analysis is ready.')
            ->assertJsonStructure([
                'data' => [
                    'title',
                    'insight',
                    'data' => [
                        '*' => [
                            'label',
                            'bucket',
                            'strategy',
                            'value',
                            'strength_score',
                            'record',
                        ],
                    ],
                    'buckets',
                    'totals',
                    'highlight',
                    'chart',
                ],
            ]);

        $this->assertNotEmpty($response->json('data.insight'));
        $this->assertNotEmpty($response->json('data.data.0.label'));
        $this->assertGreaterThan(0, $response->json('data.totals.allCount'));
        $this->assertGreaterThan(0, $response->json('data.totals.exportSum'));
        $this->assertNotEmpty($response->json('data.buckets.export'));
        $this->assertNotEmpty($response->json('data.buckets.import'));
    }
}
