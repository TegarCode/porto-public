<?php

namespace App\Http\Controllers\Api\V1\Side;

use App\Http\Controllers\Controller;
use App\Services\Side\CountryOptionService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class CountryOptionController extends Controller
{
    public function __invoke(CountryOptionService $service): JsonResponse
    {
        $data = $service->options();

        return ApiResponse::success(
            data: $data,
            meta: [
                'country_count' => count($data['countries'] ?? []),
                'origin_count' => count($data['origins'] ?? []),
                'destination_count' => count($data['destinations'] ?? []),
            ],
            message: 'SIDE country options are ready.',
        );
    }
}
