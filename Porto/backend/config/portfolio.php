<?php

return [
    'api_version' => env('PORTFOLIO_API_VERSION', 'v1'),

    'cache' => [
        'side_ttl' => (int) env('PORTFOLIO_SIDE_CACHE_TTL', 300),
    ],

    'security' => [
        'allowed_origins' => array_values(array_filter(array_map(
            'trim',
            explode(',', (string) env('PORTFOLIO_ALLOWED_ORIGINS', '*')),
        ))),
        'allowed_methods' => env('PORTFOLIO_ALLOWED_METHODS', 'GET,POST,OPTIONS'),
        'allowed_headers' => env('PORTFOLIO_ALLOWED_HEADERS', 'Content-Type,Accept,Authorization,X-Requested-With,X-API-KEY'),
        'rate_limit_per_minute' => (int) env('PORTFOLIO_RATE_LIMIT_PER_MINUTE', 60),
    ],

    'services' => [
        'sentiment' => [
            'enabled' => filter_var(env('SENTIMENT_SERVICE_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
            'base_url' => env('SENTIMENT_SERVICE_URL', 'http://127.0.0.1:5000'),
            'timeout' => (int) env('SENTIMENT_SERVICE_TIMEOUT', 15),
            'retry_times' => (int) env('SENTIMENT_SERVICE_RETRY_TIMES', 0),
            'retry_sleep' => (int) env('SENTIMENT_SERVICE_RETRY_SLEEP', 250),
            'analyze_endpoint' => env('SENTIMENT_ANALYZE_ENDPOINT', '/process_csv'),
            'python_adapter' => [
                'enabled' => filter_var(env('SENTIMENT_PYTHON_ADAPTER_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
                'fallback_to_flask' => filter_var(env('SENTIMENT_FALLBACK_TO_FLASK', false), FILTER_VALIDATE_BOOLEAN),
                'benchmark_root' => env(
                    'BENCHMARK_SENTIMENT_PATH',
                    realpath(base_path('../../BenchmarkSentimen')) ?: 'C:\\laragon\\www\\BenchmarkSentimen',
                ),
                'python_bin' => env(
                    'SENTIMENT_PYTHON_BIN',
                    realpath(base_path('../../BenchmarkSentimen/.venv/Scripts/python.exe')) ?: 'python',
                ),
                'timeout' => (int) env('SENTIMENT_PYTHON_TIMEOUT', 120),
                'enable_ocr' => filter_var(env('SENTIMENT_ENABLE_OCR', false), FILTER_VALIDATE_BOOLEAN),
            ],
        ],
        'scraping' => [
            'enabled' => filter_var(env('SCRAPING_SERVICE_ENABLED', true), FILTER_VALIDATE_BOOLEAN),
            'base_url' => env('SCRAPING_SERVICE_URL', 'http://127.0.0.1:5000'),
            'timeout' => (int) env('SCRAPING_SERVICE_TIMEOUT', 30),
            'retry_times' => (int) env('SCRAPING_SERVICE_RETRY_TIMES', 0),
            'retry_sleep' => (int) env('SCRAPING_SERVICE_RETRY_SLEEP', 250),
            'dashboard_root' => env(
                'DASHBOARD_SCRAPER_PATH',
                realpath(base_path('../../DashboardScraper')) ?: 'C:\\laragon\\www\\DashboardScraper',
            ),
            'bps_hs_file' => env(
                'BPS_HS_FILE',
                realpath(base_path('../../DashboardScraper/resources/bps/hscode_clean_BPS.xlsx')) ?: 'C:\\laragon\\www\\DashboardScraper\\resources\\bps\\hscode_clean_BPS.xlsx',
            ),
        ],
    ],
];
