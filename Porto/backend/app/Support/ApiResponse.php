<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Throwable;

class ApiResponse
{
    /**
     * @param array<string, mixed> $data
     * @param array<string, mixed> $meta
     */
    public static function success(
        array $data = [],
        array $meta = [],
        string $message = '',
        int $statusCode = 200,
    ): JsonResponse {
        return response()->json([
            'status' => 'success',
            'data' => $data,
            'meta' => $meta,
            'message' => $message,
        ], $statusCode);
    }

    /**
     * @param array<string, mixed> $meta
     */
    public static function error(
        string $message,
        int $statusCode = 500,
        array $meta = [],
    ): JsonResponse {
        return response()->json([
            'status' => 'error',
            'data' => [],
            'meta' => $meta,
            'message' => $message,
        ], $statusCode);
    }

    public static function exception(Throwable $exception, int $statusCode = 500): JsonResponse
    {
        $message = $statusCode >= 500
            ? 'Unexpected API error.'
            : ($exception->getMessage() ?: 'API request failed.');

        return self::error(
            message: $message,
            statusCode: $statusCode,
            meta: [
                'exception' => class_basename($exception),
            ],
        );
    }
}
