<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\HealthService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class HealthController extends Controller
{
    public function __invoke(HealthService $healthService): JsonResponse
    {
        return ApiResponse::success(
            data: $healthService->status(),
            message: 'Portfolio API Gateway is healthy.',
        );
    }
}
