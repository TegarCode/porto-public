<?php

namespace Tests\Feature\Api\V1;

use Tests\TestCase;

class ApiStandardizationTest extends TestCase
{
    public function test_success_responses_use_standard_shape(): void
    {
        $response = $this->getJson('/api/v1/health');

        $response
            ->assertOk()
            ->assertJsonStructure([
                'status',
                'data',
                'meta',
                'message',
            ])
            ->assertJsonPath('status', 'success');

        $this->assertIsArray($response->json('data'));
        $this->assertIsArray($response->json('meta'));
        $this->assertIsString($response->json('message'));
    }

    public function test_api_errors_use_standard_shape(): void
    {
        $response = $this->getJson('/api/v1/missing-route');

        $response
            ->assertNotFound()
            ->assertJsonStructure([
                'status',
                'data',
                'meta',
                'message',
            ])
            ->assertJsonPath('status', 'error');

        $this->assertSame([], $response->json('data'));
        $this->assertIsArray($response->json('meta'));
        $this->assertIsString($response->json('message'));
    }
}
