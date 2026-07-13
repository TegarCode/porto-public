<?php

namespace App\Http\Controllers\Api\V1\Scraping;

use App\Http\Controllers\Api\V1\Scraping\Concerns\HandlesScrapingGatewayErrors;
use App\Http\Controllers\Controller;
use App\Services\Scraping\ScrapingGatewayService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class SetupScrapingDatabaseController extends Controller
{
    use HandlesScrapingGatewayErrors;

    public function __invoke(Request $request, ScrapingGatewayService $service): JsonResponse
    {
        try {
            $result = $service->initializeDatabase($request->only([
                'host',
                'port',
                'user',
                'password',
                'database',
            ]));

            return ApiResponse::success(
                data: $result,
                message: $result['schema_ready']
                    ? 'Scraping database schema is ready.'
                    : 'Scraping database setup needs attention.',
            );
        } catch (RuntimeException $exception) {
            return $this->scrapingGatewayError($exception);
        }
    }
}
