<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class DatabaseHealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks = [
            'mysql' => [],
            'side_portfolio' => [
                'tbnegara',
                'tbhasilakhir',
                'tbhasil_rsca_tbi',
                'tbhasilakhir_rsca_tbi',
                'tbhasil_rca_epd',
                'tbhasilakhir_rca_epd',
                'fact_sales',
            ],
        ];

        $connections = [];

        foreach ($checks as $connection => $tables) {
            $connections[$connection] = $this->checkConnection($connection, $tables);
        }

        $connected = collect($connections)->every(fn (array $item): bool => (bool) $item['connected']);

        return response()->json([
            'status' => $connected ? 'success' : 'error',
            'data' => [
                'connected' => $connected,
                'connections' => $connections,
            ],
            'meta' => [],
            'message' => $connected
                ? 'Database connections are reachable.'
                : 'One or more database connections failed.',
        ], $connected ? 200 : 503);
    }

    /**
     * @param array<int, string> $tables
     * @return array<string, mixed>
     */
    private function checkConnection(string $connection, array $tables): array
    {
        $database = (string) config("database.connections.{$connection}.database");

        try {
            $db = DB::connection($connection);
            $db->select('SELECT 1 AS ok');

            $tableCounts = [];

            foreach ($tables as $table) {
                try {
                    $tableCounts[$table] = (int) $db->table($table)->count();
                } catch (Throwable $exception) {
                    $tableCounts[$table] = [
                        'error' => $this->safeMessage($exception),
                    ];
                }
            }

            return [
                'connected' => true,
                'database' => $database,
                'tables' => $tableCounts,
            ];
        } catch (Throwable $exception) {
            return [
                'connected' => false,
                'database' => $database,
                'error' => [
                    'exception' => class_basename($exception),
                    'code' => (string) $exception->getCode(),
                    'message' => $this->safeMessage($exception),
                ],
            ];
        }
    }

    private function safeMessage(Throwable $exception): string
    {
        $message = $exception->getMessage();
        $message = preg_replace('/password\\s*=\\s*[^\\s;]+/i', 'password=***', $message) ?? $message;
        $message = preg_replace('/(using password:\\s*)\\w+/i', '$1***', $message) ?? $message;

        return mb_substr($message, 0, 500);
    }
}
