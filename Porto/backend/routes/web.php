<?php

use App\Services\HealthService;
use App\Support\ApiResponse;
use Illuminate\Support\Facades\Route;

Route::get('/', function (HealthService $healthService) {
    return ApiResponse::success(
        data: $healthService->status(),
        message: 'Portfolio backend is ready.',
    );
});
