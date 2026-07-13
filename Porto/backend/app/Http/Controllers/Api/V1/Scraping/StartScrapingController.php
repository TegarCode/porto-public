<?php

namespace App\Http\Controllers\Api\V1\Scraping;

use App\Http\Controllers\Api\V1\Scraping\Concerns\HandlesScrapingGatewayErrors;
use App\Http\Controllers\Controller;
use App\Services\Scraping\ScrapingGatewayService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use RuntimeException;

class StartScrapingController extends Controller
{
    use HandlesScrapingGatewayErrors;

    public function __invoke(Request $request, ScrapingGatewayService $service): JsonResponse
    {
        $files = $request->file('folder_upload', []);
        $files = $files instanceof UploadedFile ? [$files] : (array) $files;

        try {
            return ApiResponse::success(
                data: $service->start(
                    payload: $request->except(['folder_upload']),
                    files: $files,
                ),
                message: 'Scraping job started.',
            );
        } catch (RuntimeException $exception) {
            return $this->scrapingGatewayError($exception);
        }
    }
}
