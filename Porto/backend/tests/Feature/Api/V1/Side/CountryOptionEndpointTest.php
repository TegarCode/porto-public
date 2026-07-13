<?php

namespace Tests\Feature\Api\V1\Side;

use Tests\TestCase;

class CountryOptionEndpointTest extends TestCase
{
    public function test_side_country_options_endpoint_returns_countries_origins_and_destinations(): void
    {
        $response = $this->getJson('/api/v1/side/countries');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('message', 'SIDE country options are ready.')
            ->assertJsonStructure([
                'data' => [
                    'countries' => [
                        '*' => ['code', 'alpha2', 'name'],
                    ],
                    'origins' => [
                        '*' => ['code', 'alpha2', 'name'],
                    ],
                    'destinations' => [
                        '*' => ['code', 'alpha2', 'name'],
                    ],
                    'source',
                ],
                'meta' => ['country_count', 'origin_count', 'destination_count'],
            ]);

        $this->assertNotEmpty($response->json('data.countries'));
        $this->assertContains('IDN', array_column($response->json('data.origins'), 'code'));
        $this->assertContains('CHN', array_column($response->json('data.destinations'), 'code'));
    }
}
