<?php

namespace Tests\Feature\Api\V1\Scraping;

use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ScrapingIntegrationTest extends TestCase
{
    public function test_scraping_start_normalizes_legacy_dashboard_redirect(): void
    {
        Http::fake([
            '127.0.0.1:5000/run/bps-trade' => Http::response('', 302, [
                'Location' => '/jobs/job-123',
            ]),
        ]);

        $response = $this->postJson('/api/v1/scraping/start', [
            'source' => 'bps',
            'year' => '2025',
            'flow' => 'export',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.job_id', 'job-123')
            ->assertJsonPath('data.status', 'queued')
            ->assertJsonPath('data.source', 'bps-trade')
            ->assertJsonPath('message', 'Scraping job started.');
    }

    public function test_scraping_start_forwards_ssinas_manual_session_payload(): void
    {
        Http::fake([
            '127.0.0.1:5000/run/ssinas' => Http::response([
                'data' => [
                    'id' => 'job-ssinas',
                    'status' => 'queued',
                    'source' => 'ssinas',
                ],
            ], 201),
        ]);

        $response = $this->postJson('/api/v1/scraping/start', [
            'source' => 'ssinas',
            'auth_mode' => 'manual_token',
            'phpsessid' => 'session-value',
            'start_page' => 2,
            'end_page' => 4,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.job_id', 'job-ssinas')
            ->assertJsonPath('data.source', 'ssinas');

        Http::assertSent(fn ($request): bool => $request->url() === 'http://127.0.0.1:5000/run/ssinas'
            && $request['auth_mode'] === 'manual_token'
            && $request['phpsessid'] === 'session-value'
            && (int) $request['start_page'] === 2
            && (int) $request['end_page'] === 4);
    }

    public function test_scraping_start_returns_service_unavailable_when_dashboard_is_offline(): void
    {
        Http::fake([
            '127.0.0.1:5000/run/bps-trade' => Http::failedConnection(),
        ]);

        $response = $this->postJson('/api/v1/scraping/start', [
            'source' => 'bps',
            'year' => '2025',
            'flow' => 'export',
        ]);

        $response
            ->assertStatus(503)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('message', 'Scraping service is unavailable or timed out.')
            ->assertJsonPath('meta.service_url', 'http://127.0.0.1:5000');
    }

    public function test_scraping_database_status_reads_dashboard_schema_snapshot(): void
    {
        Http::fake([
            '127.0.0.1:5000/setup/database' => Http::response([
                'data' => [
                    'form_state' => [
                        'host' => 'localhost',
                        'port' => 3306,
                        'user' => 'root',
                        'password' => '',
                        'database' => 'flask',
                    ],
                    'status_snapshot' => [
                        'configured' => true,
                        'server_ok' => true,
                        'database_exists' => true,
                        'schema_ready' => true,
                        'message' => 'Schema utama sudah siap dipakai.',
                        'missing_tables' => [],
                        'table_counts' => [
                            'tbtrade' => 19850,
                        ],
                    ],
                ],
            ]),
        ]);

        $response = $this->getJson('/api/v1/scraping/database/status');

        $response
            ->assertOk()
            ->assertJsonPath('data.schema_ready', true)
            ->assertJsonPath('data.table_counts.tbtrade', 19850)
            ->assertJsonPath('data.config.database', 'flask')
            ->assertJsonPath('message', 'Scraping database status is ready.');
    }

    public function test_scraping_database_setup_keeps_empty_password_and_returns_schema_result(): void
    {
        Http::fake([
            '127.0.0.1:5000/setup/database' => Http::response([
                'data' => [
                    'form_state' => [
                        'host' => 'localhost',
                        'port' => 3306,
                        'user' => 'root',
                        'password' => '',
                        'database' => 'flask',
                    ],
                    'setup_result' => [
                        'executed' => 13,
                        'ignored' => 5,
                        'skipped' => 0,
                    ],
                    'status_snapshot' => [
                        'configured' => true,
                        'server_ok' => true,
                        'database_exists' => true,
                        'schema_ready' => true,
                        'message' => 'Schema utama sudah siap dipakai.',
                        'missing_tables' => [],
                        'table_counts' => [
                            'tbtrade' => 19850,
                        ],
                    ],
                ],
            ]),
        ]);

        $response = $this->postJson('/api/v1/scraping/database/setup', [
            'host' => 'localhost',
            'port' => 3306,
            'user' => 'root',
            'password' => '',
            'database' => 'flask',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.schema_ready', true)
            ->assertJsonPath('data.setup_result.executed', 13)
            ->assertJsonPath('message', 'Scraping database schema is ready.');

        Http::assertSent(fn ($request): bool => $request->url() === 'http://127.0.0.1:5000/setup/database'
            && $request['password'] === '');
    }

    public function test_scraping_status_normalizes_job_response(): void
    {
        Http::fake([
            '127.0.0.1:5000/jobs/job-123' => Http::response([
                'id' => 'job-123',
                'status' => 'running',
                'source' => 'BPS',
                'progress' => 45,
                'current_step' => 'Parsing BPS response',
                'updated_at' => '2026-07-03 21:00:00',
            ]),
        ]);

        $response = $this->getJson('/api/v1/scraping/status?job_id=job-123');

        $response
            ->assertOk()
            ->assertJsonPath('data.job_id', 'job-123')
            ->assertJsonPath('data.status', 'running')
            ->assertJsonPath('data.progress', 45)
            ->assertJsonPath('data.current_step', 'Parsing BPS response')
            ->assertJsonPath('data.source', 'BPS');

        $this->assertNotEmpty($response->json('data.insight'));
    }

    public function test_scraping_result_returns_preview_rows_and_summary(): void
    {
        Http::fake([
            '127.0.0.1:5000/jobs/job-123' => Http::response([
                'id' => 'job-123',
                'status' => 'completed',
                'source' => 'BPS',
                'mode' => 'json',
                'rows' => [
                    ['indicator' => 'Export Value', 'period' => 2025, 'value' => 24823],
                    ['indicator' => 'Import Value', 'period' => 2025, 'value' => 21618],
                ],
            ]),
            '127.0.0.1:5000/setup/database' => Http::response([
                'data' => [
                    'status_snapshot' => [
                        'schema_ready' => false,
                    ],
                ],
            ]),
        ]);

        $response = $this->getJson('/api/v1/scraping/result?job_id=job-123');

        $response
            ->assertOk()
            ->assertJsonPath('data.source', 'BPS')
            ->assertJsonPath('data.rows.0.indicator', 'Export Value')
            ->assertJsonPath('data.meta.total_rows', 2)
            ->assertJsonPath('data.meta.columns.0', 'indicator')
            ->assertJsonPath('message', 'Scraping result is ready.');

        $this->assertNotEmpty($response->json('data.summary'));
    }
}
