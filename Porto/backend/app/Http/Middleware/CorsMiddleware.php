<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->is('api/*')) {
            return $next($request);
        }

        if ($request->isMethod('OPTIONS')) {
            return $this->withCorsHeaders(response()->noContent(), $request);
        }

        return $this->withCorsHeaders($next($request), $request);
    }

    private function withCorsHeaders(Response $response, Request $request): Response
    {
        $origin = $this->allowedOrigin($request);

        if ($origin !== null) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Vary', 'Origin');
        }

        $response->headers->set('Access-Control-Allow-Methods', $this->allowedMethods());
        $response->headers->set('Access-Control-Allow-Headers', $this->allowedHeaders($request));
        $response->headers->set('Access-Control-Max-Age', '600');

        return $response;
    }

    private function allowedOrigin(Request $request): ?string
    {
        $origins = config('portfolio.security.allowed_origins', ['*']);

        if (in_array('*', $origins, true)) {
            return '*';
        }

        $origin = $request->headers->get('Origin');

        return $origin !== null && in_array($origin, $origins, true) ? $origin : null;
    }

    private function allowedMethods(): string
    {
        $methods = trim((string) config('portfolio.security.allowed_methods'));

        return $methods !== '' ? $methods : 'GET,POST,OPTIONS';
    }

    private function allowedHeaders(Request $request): string
    {
        $requestedHeaders = trim((string) $request->headers->get('Access-Control-Request-Headers', ''));

        if ($requestedHeaders !== '') {
            return $requestedHeaders;
        }

        $headers = trim((string) config('portfolio.security.allowed_headers'));

        return $headers !== '' ? $headers : 'Content-Type,Accept,Authorization,X-Requested-With,X-API-KEY';
    }
}
