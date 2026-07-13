<?php

namespace Tests\Feature\Api\V1;

use Illuminate\Support\Facades\RateLimiter;
use Tests\TestCase;

class SecuritySetupTest extends TestCase
{
    public function test_api_responses_include_cors_and_security_headers(): void
    {
        $response = $this->withHeader('Origin', 'http://localhost:3000')
            ->getJson('/api/v1/health');

        $response
            ->assertOk()
            ->assertHeader('Access-Control-Allow-Origin', '*')
            ->assertHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY')
            ->assertHeader('Referrer-Policy', 'no-referrer');
    }

    public function test_api_options_preflight_returns_cors_headers(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'http://localhost:3000',
            'Access-Control-Request-Method' => 'POST',
        ])->options('/api/v1/sentiment/analyze');

        $response
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', '*');

        $this->assertSame(
            'content-type, accept, authorization, x-requested-with, x-api-key',
            $response->headers->get('Access-Control-Allow-Headers'),
        );
    }

    public function test_api_rate_limit_uses_standard_error_shape(): void
    {
        RateLimiter::clear('127.0.0.1');
        config(['portfolio.security.rate_limit_per_minute' => 1]);

        $this->getJson('/api/v1/health')->assertOk();

        $response = $this->getJson('/api/v1/health');

        $response
            ->assertStatus(429)
            ->assertJsonPath('status', 'error')
            ->assertJsonStructure(['status', 'data', 'meta', 'message']);
    }
}
