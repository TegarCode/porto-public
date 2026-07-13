<?php

namespace App\Http\Controllers\Api\V1\Scraping;

use App\Http\Controllers\Api\V1\Scraping\Concerns\HandlesScrapingGatewayErrors;
use App\Http\Controllers\Controller;
use App\Services\Scraping\ScrapingGatewayService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ScrapingResultController extends Controller
{
    use HandlesScrapingGatewayErrors;

    public function __invoke(Request $request, ScrapingGatewayService $service): JsonResponse
    {
        try {
            return ApiResponse::success(
                data: $service->result($request->query('job_id')),
                message: 'Scraping result is ready.',
            );
        } catch (RuntimeException $exception) {
            return $this->scrapingGatewayError($exception);
        }
    }
}
