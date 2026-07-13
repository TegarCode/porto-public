<?php

namespace App\Http\Controllers\Api\V1\Analysis;

use App\Http\Controllers\Controller;
use App\Services\Side\RscaTbiAnalysisService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RscaTbiController extends Controller
{
    public function __invoke(Request $request, RscaTbiAnalysisService $service): JsonResponse
    {
        $data = $service->analyze($this->filters($request));

        return ApiResponse::success(
            data: $data,
            message: 'RSCA TBI analysis is ready.',
        );
    }

    public function data(Request $request, RscaTbiAnalysisService $service): JsonResponse
    {
        return ApiResponse::success(
            data: $service->data($this->filters($request)),
            message: 'RSCA TBI data is ready.',
        );
    }

    public function calculation(Request $request, RscaTbiAnalysisService $service): JsonResponse
    {
        return ApiResponse::success(
            data: $service->calculation($this->filters($request)),
            message: 'RSCA TBI calculation data is ready.',
        );
    }

    public function comparison(Request $request, RscaTbiAnalysisService $service): JsonResponse
    {
        return ApiResponse::success(
            data: $service->comparison($this->filters($request)),
            message: 'RSCA TBI comparison data is ready.',
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
            'limit',
        ]);
    }
}
