<?php

namespace App\Http\Controllers\Api\V1\Scraping;

use App\Http\Controllers\Api\V1\Scraping\Concerns\HandlesScrapingGatewayErrors;
use App\Http\Controllers\Controller;
use App\Services\Scraping\ScrapingGatewayService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class ScrapingDecisionController extends Controller
{
    use HandlesScrapingGatewayErrors;

    public function __invoke(Request $request, ScrapingGatewayService $service): JsonResponse
    {
        $jobId = (string) $request->input('job_id');
        $choice = (string) $request->input('choice', 'stop');

        try {
            return ApiResponse::success(
                data: $service->decision($jobId, $choice),
                message: 'Scraping decision request is ready.',
            );
        } catch (RuntimeException $exception) {
            return $this->scrapingGatewayError($exception);
        }
    }
}
