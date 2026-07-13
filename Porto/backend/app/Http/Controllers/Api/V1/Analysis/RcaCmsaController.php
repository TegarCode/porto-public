<?php

namespace App\Http\Controllers\Api\V1\Analysis;

use App\Http\Controllers\Controller;
use App\Services\Side\RcaCmsaAnalysisService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RcaCmsaController extends Controller
{
    public function __invoke(Request $request, RcaCmsaAnalysisService $service): JsonResponse
    {
        $data = $service->analyze($request->only([
            'origin',
            'dest',
            'level',
        ]));

        return ApiResponse::success(
            data: $data,
            message: 'RCA CMSA analysis is ready.',
        );
    }
}
