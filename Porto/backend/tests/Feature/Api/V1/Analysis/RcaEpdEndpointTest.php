<?php

namespace Tests\Feature\Api\V1\Analysis;

use Tests\TestCase;

class RcaEpdEndpointTest extends TestCase
{
    public function test_rca_epd_endpoint_returns_matrix_points_and_strategic_insight(): void
    {
        $response = $this->getJson('/api/v1/analysis/rca-epd?origin=idn&dest=chn&level=4');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'RCA EPD Analysis')
            ->assertJsonPath('data.chart.type', 'matrix')
            ->assertJsonPath('data.chart.x_axis.key', 'growth_share')
            ->assertJsonPath('data.chart.y_axis.key', 'growth_demand')
            ->assertJsonPath('data.chart.size_key', 'avg_rca')
            ->assertJsonPath('data.filters.origin', 'IDN')
            ->assertJsonPath('data.filters.dest', 'CHN')
            ->assertJsonPath('data.filters.level', 4)
            ->assertJsonPath('message', 'RCA EPD analysis is ready.')
            ->assertJsonStructure([
                'data' => [
                    'insight',
                    'matrix' => [
                        '*' => ['key', 'label', 'count', 'avg_rca', 'items'],
                    ],
                    'chart' => [
                        'type',
                        'x_axis',
                        'y_axis',
                        'size_key',
                        'points' => [
                            '*' => [
                                'label',
                                'x',
                                'y',
                                'growth_share',
                                'growth_demand',
                                'avg_rca',
                                'position',
                                'position_label',
                                'record',
                            ],
                        ],
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.insight'));
        $this->assertNotEmpty($response->json('data.chart.points'));
        $this->assertNotEmpty($response->json('data.chart.points.0.label'));
        $this->assertNotEmpty($response->json('data.matrix'));
    }
}
