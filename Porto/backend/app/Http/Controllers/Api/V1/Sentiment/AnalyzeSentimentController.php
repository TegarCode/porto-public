<?php

namespace App\Http\Controllers\Api\V1\Sentiment;

use App\Http\Controllers\Controller;
use App\Services\Sentiment\SentimentAnalysisService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class AnalyzeSentimentController extends Controller
{
    public function __invoke(Request $request, SentimentAnalysisService $service): JsonResponse
    {
        try {
            $data = $service->analyze(
                payload: $request->except(['file_csv1', 'file_csv2', 'dataset', 'dataset_1', 'dataset_2']),
                files: [
                    'file_csv1' => $request->file('file_csv1') ?? $request->file('dataset') ?? $request->file('dataset_1'),
                    'file_csv2' => $request->file('file_csv2') ?? $request->file('dataset_2'),
                ],
            );
        } catch (RuntimeException $exception) {
            return ApiResponse::error(
                message: $exception->getMessage() ?: 'Sentiment service is unavailable in this deployment.',
                statusCode: 503,
                meta: [
                    'source' => 'BenchmarkSentimen',
                    'mode' => 'external_service_required',
                    'hint' => 'Deploy BenchmarkSentimen as a separate Python service, then set SENTIMENT_SERVICE_URL.',
                ],
            );
        }

        return ApiResponse::success(
            data: $data,
            message: 'Sentiment analysis is ready.',
        );
    }
}
