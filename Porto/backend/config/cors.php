<?php

return [
    'paths' => ['api/*'],

    'allowed_methods' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('PORTFOLIO_ALLOWED_METHODS', 'GET,POST,OPTIONS')),
    ))),

    'allowed_origins' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('PORTFOLIO_ALLOWED_ORIGINS', '*')),
    ))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('PORTFOLIO_ALLOWED_HEADERS', 'Content-Type,Accept,Authorization,X-Requested-With,X-API-KEY')),
    ))),

    'exposed_headers' => [],

    'max_age' => 600,

    'supports_credentials' => false,
];
