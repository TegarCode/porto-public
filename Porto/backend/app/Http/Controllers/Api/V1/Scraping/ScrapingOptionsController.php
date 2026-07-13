<?php

namespace App\Http\Controllers\Api\V1\Scraping;

use App\Http\Controllers\Controller;
use App\Services\Scraping\ScrapingGatewayService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class ScrapingOptionsController extends Controller
{
    public function __invoke(ScrapingGatewayService $service): JsonResponse
    {
        return ApiResponse::success(
            data: $service->options(),
            message: 'Scraping options are ready.',
        );
    }
}
