<?php

namespace App\Http\Controllers\Api\V1\Pentaho;

use App\Http\Controllers\Controller;
use App\Services\Pentaho\AdventureWorksDashboardService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class AdventureWorksDashboardController extends Controller
{
    public function __invoke(AdventureWorksDashboardService $service): JsonResponse
    {
        return ApiResponse::success(
            data: $service->dashboard(),
            message: 'AdventureWorks ETL dashboard is ready.',
        );
    }
}
