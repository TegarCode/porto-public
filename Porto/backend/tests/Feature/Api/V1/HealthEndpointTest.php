<?php

namespace Tests\Feature\Api\V1;

use Tests\TestCase;

class HealthEndpointTest extends TestCase
{
    public function test_health_endpoint_returns_gateway_status(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.version', 'v1')
            ->assertJsonPath('data.dependencies.side.configured', true)
            ->assertJsonPath('data.dependencies.sentiment.configured', true)
            ->assertJsonPath('data.dependencies.scraping.configured', true)
            ->assertJsonPath('message', 'Portfolio API Gateway is healthy.');
    }
}
