<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

$cachePathDefaults = [
    'APP_CONFIG_CACHE' => '/tmp/config.php',
    'APP_EVENTS_CACHE' => '/tmp/events.php',
    'APP_PACKAGES_CACHE' => '/tmp/packages.php',
    'APP_ROUTES_CACHE' => '/tmp/routes.php',
    'APP_SERVICES_CACHE' => '/tmp/services.php',
    'VIEW_COMPILED_PATH' => '/tmp/views',
];

foreach ($cachePathDefaults as $key => $path) {
    if (empty($_ENV[$key]) && empty($_SERVER[$key])) {
        $_ENV[$key] = $path;
        $_SERVER[$key] = $path;
    }
}

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
    $_ENV['VIEW_COMPILED_PATH'] ?? '/tmp/views',
] as $path) {
    if (! is_dir($path)) {
        mkdir($path, 0775, true);
    }
}

$requestUri = strtok((string) ($_SERVER['REQUEST_URI'] ?? ''), '?') ?: '/';

if ($requestUri === '/api/_boot-check') {
    header('Content-Type: application/json');

    echo json_encode([
        'status' => 'success',
        'data' => [
            'build_marker' => 'vercel-api-path-view-provider-20260714',
            'php_version' => PHP_VERSION,
            'cwd' => getcwd(),
            'base_dir' => dirname(__DIR__),
            'vendor_autoload_exists' => is_file(__DIR__.'/../vendor/autoload.php'),
            'bootstrap_app_exists' => is_file(__DIR__.'/../bootstrap/app.php'),
            'storage_path' => $storagePath,
            'storage_writable' => is_writable($storagePath),
            'extensions' => [
                'pdo_mysql' => extension_loaded('pdo_mysql'),
                'openssl' => extension_loaded('openssl'),
                'mbstring' => extension_loaded('mbstring'),
                'intl' => extension_loaded('intl'),
            ],
        ],
        'meta' => [],
        'message' => 'Vercel PHP boot check.',
    ]);

    return;
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
    ) || (($_GET['debug'] ?? '') === '1');

    echo json_encode([
        'status' => 'error',
        'data' => [],
        'meta' => [
            'exception' => $debug ? get_class($exception) : 'BootstrapException',
            'message' => $debug ? $exception->getMessage() : 'Backend boot failed.',
            'file' => $debug ? $exception->getFile().':'.$exception->getLine() : null,
            'trace' => $debug ? array_slice($exception->getTrace(), 0, 8) : null,
        ],
        'message' => 'Portfolio backend failed to boot.',
    ]);
}
