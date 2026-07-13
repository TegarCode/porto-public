<?php

namespace App\Http\Controllers\Api\V1\Scraping\Concerns;

use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use RuntimeException;

trait HandlesScrapingGatewayErrors
{
    private function scrapingGatewayError(RuntimeException $exception): JsonResponse
    {
        $message = $exception->getMessage() ?: 'Scraping service request failed.';
        $statusCode = Str::contains(Str::lower($message), ['unavailable', 'timed out'])
            ? 503
            : 502;

        return ApiResponse::error(
            message: $message,
            statusCode: $statusCode,
            meta: [
                'service_url' => config('portfolio.services.scraping.base_url'),
                'hint' => 'Deploy DashboardScraper as a separate worker/service, then set SCRAPING_SERVICE_URL.',
            ],
        );
    }
}
