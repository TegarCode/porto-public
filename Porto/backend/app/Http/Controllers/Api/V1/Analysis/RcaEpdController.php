<?php

namespace App\Http\Controllers\Api\V1\Analysis;

use App\Http\Controllers\Controller;
use App\Services\Side\RcaEpdAnalysisService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RcaEpdController extends Controller
{
    public function __invoke(Request $request, RcaEpdAnalysisService $service): JsonResponse
    {
        $data = $service->analyze($this->filters($request));

        return ApiResponse::success(
            data: $data,
            message: 'RCA EPD analysis is ready.',
        );
    }

    public function data(Request $request, RcaEpdAnalysisService $service): JsonResponse
    {
        return ApiResponse::success(
            data: $service->data($this->filters($request)),
            message: 'RCA EPD data is ready.',
        );
    }

    public function calculation(Request $request, RcaEpdAnalysisService $service): JsonResponse
    {
        return ApiResponse::success(
            data: $service->calculation($this->filters($request)),
            message: 'RCA EPD calculation data is ready.',
        );
    }

    public function comparison(Request $request, RcaEpdAnalysisService $service): JsonResponse
    {
        return ApiResponse::success(
            data: $service->comparison($this->filters($request)),
            message: 'RCA EPD comparison data is ready.',
        );
    }

    public function xModelOptions(Request $request, RcaEpdAnalysisService $service): JsonResponse
    {
        return ApiResponse::success(
            data: $service->xModelOptions($this->filters($request)),
            message: 'RCA EPD X-Model options are ready.',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function filters(Request $request): array
    {
        return $request->only([
            'origin',
            'dest',
            'level',
            'x_model',
            'limit',
        ]);
    }
}
