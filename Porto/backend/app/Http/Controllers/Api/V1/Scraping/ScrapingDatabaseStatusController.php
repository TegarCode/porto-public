<?php

namespace App\Http\Controllers\Api\V1\Scraping;

use App\Http\Controllers\Api\V1\Scraping\Concerns\HandlesScrapingGatewayErrors;
use App\Http\Controllers\Controller;
use App\Services\Scraping\ScrapingGatewayService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use RuntimeException;

class ScrapingDatabaseStatusController extends Controller
{
    use HandlesScrapingGatewayErrors;

    public function __invoke(ScrapingGatewayService $service): JsonResponse
    {
        try {
            return ApiResponse::success(
                data: $service->databaseStatus(),
                message: 'Scraping database status is ready.',
            );
        } catch (RuntimeException $exception) {
            return $this->scrapingGatewayError($exception);
        }
    }
}
