<?php

namespace App\Services;

use Illuminate\Support\Carbon;

class HealthService
{
    /**
     * @return array<string, mixed>
     */
    public function status(): array
    {
        return [
            'service' => config('app.name'),
            'environment' => config('app.env'),
            'version' => config('portfolio.api_version'),
            'timestamp' => Carbon::now()->toIso8601String(),
            'dependencies' => [
                'side' => [
                    'mode' => 'local_database',
                    'database' => config('database.connections.side_portfolio.database'),
                    'configured' => filled(config('database.connections.side_portfolio.database')),
                ],
                'sentiment' => [
                    'base_url' => config('portfolio.services.sentiment.base_url'),
                    'configured' => filled(config('portfolio.services.sentiment.base_url')),
                ],
                'scraping' => [
                    'base_url' => config('portfolio.services.scraping.base_url'),
                    'configured' => filled(config('portfolio.services.scraping.base_url')),
                ],
            ],
        ];
    }
}
