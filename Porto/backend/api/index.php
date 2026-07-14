<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$storagePath = $_ENV['LARAVEL_STORAGE_PATH']
    ?? $_SERVER['LARAVEL_STORAGE_PATH']
    ?? '/tmp/laravel-storage';

$_ENV['LARAVEL_STORAGE_PATH'] = $storagePath;
$_SERVER['LARAVEL_STORAGE_PATH'] = $storagePath;

foreach ([
    $storagePath,
    $storagePath.'/app',
    $storagePath.'/framework/cache/data',
    $storagePath.'/framework/sessions',
    $storagePath.'/framework/views',
    $storagePath.'/logs',
] as $path) {
    if (! is_dir($path)) {
        mkdir($path, 0775, true);
    }
}

try {
    require __DIR__.'/../vendor/autoload.php';

    /** @var Application $app */
    $app = require_once __DIR__.'/../bootstrap/app.php';

    $app->handleRequest(Request::capture());
} catch (Throwable $exception) {
    error_log((string) $exception);

    http_response_code(500);
    header('Content-Type: application/json');

    $debug = filter_var(
        $_ENV['VERCEL_DEBUG_ERRORS'] ?? $_SERVER['VERCEL_DEBUG_ERRORS'] ?? false,
        FILTER_VALIDATE_BOOLEAN,
    );

    echo json_encode([
        'status' => 'error',
        'data' => [],
        'meta' => [
            'exception' => $debug ? get_class($exception) : 'BootstrapException',
            'message' => $debug ? $exception->getMessage() : 'Backend boot failed.',
        ],
        'message' => 'Portfolio backend failed to boot.',
    ]);
}
