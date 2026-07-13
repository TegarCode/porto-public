<?php

namespace Tests\Feature\Api\V1\Analysis;

use Tests\TestCase;

class RscaTbiEndpointTest extends TestCase
{
    public function test_rsca_tbi_endpoint_returns_quadrants_scatter_points_and_insight(): void
    {
        $response = $this->getJson('/api/v1/analysis/rsca-tbi?origin=idn&dest=chn&level=6');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.title', 'RSCA TBI Analysis')
            ->assertJsonPath('data.scatter.x_axis.key', 'rsca')
            ->assertJsonPath('data.scatter.y_axis.key', 'tbi')
            ->assertJsonPath('data.quadrants.0.key', 'competitive_exporter')
            ->assertJsonPath('data.filters.origin', 'IDN')
            ->assertJsonPath('data.filters.dest', 'CHN')
            ->assertJsonPath('message', 'RSCA TBI analysis is ready.')
            ->assertJsonStructure([
                'data' => [
                    'insight',
                    'quadrants' => [
                        '*' => ['key', 'label', 'description', 'count', 'items'],
                    ],
                    'scatter' => [
                        'x_axis',
                        'y_axis',
                        'points' => [
                            '*' => ['label', 'x', 'y', 'rsca', 'tbi', 'quadrant', 'record'],
                        ],
                    ],
                ],
            ]);

        $this->assertNotEmpty($response->json('data.insight'));
        $this->assertNotEmpty($response->json('data.scatter.points'));
        $this->assertNotEmpty($response->json('data.scatter.points.0.label'));
        $this->assertIsNumeric($response->json('data.scatter.points.0.rsca'));
        $this->assertIsNumeric($response->json('data.scatter.points.0.tbi'));
    }
}
