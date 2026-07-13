<?php

namespace Tests\Unit\Services\Side;

use App\Exceptions\SideAdapterException;
use App\Services\Side\SideDataAdapter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SideDataAdapterTest extends TestCase
{
    public function test_it_fetches_rca_cmsa_from_local_porto_side_database(): void
    {
        Http::preventStrayRequests();
        Cache::flush();

        $result = app(SideDataAdapter::class)->rcaCmsa([
            'origin' => 'idn',
            'dest' => 'chn',
        ]);

        $this->assertSame('porto_side', $result['source']);
        $this->assertSame('rca_cmsa', $result['analysis']);
        $this->assertSame(['IDN'], $result['filters']['origin']);
        $this->assertSame(['CHN'], $result['filters']['dest']);
        $this->assertSame('strategy_bar', $result['chart']['type']);
        $this->assertSame('nama_produk', $result['chart']['label_key']);
        $this->assertNotEmpty($result['payload']['export']);
        $this->assertNotEmpty($result['payload']['import']);
        $this->assertGreaterThan(0, $result['meta']['record_count']);
        $this->assertSame('rca_cmsa', $result['insight_seed']['analysis']);
    }

    public function test_it_fetches_rsca_tbi_with_scalar_country_filters_from_local_database(): void
    {
        Http::preventStrayRequests();
        Cache::flush();

        $result = app(SideDataAdapter::class)->rscaTbi([
            'origin' => 'idn',
            'dest' => 'chn',
            'level' => '6',
        ]);

        $this->assertSame('IDN', $result['filters']['origin']);
        $this->assertSame('CHN', $result['filters']['dest']);
        $this->assertSame(6, $result['filters']['level']);
        $this->assertSame('scatter', $result['chart']['type']);
        $this->assertSame('namaproduk', $result['chart']['label_key']);
        $this->assertNotEmpty($result['records']);
        $this->assertArrayHasKey('rsca_2023', $result['records'][0]);
        $this->assertArrayHasKey('tbi_2023', $result['records'][0]);
    }

    public function test_it_rejects_unsupported_analysis_names(): void
    {
        $this->expectException(SideAdapterException::class);

        app(SideDataAdapter::class)->fetchAnalysis('market_share');
    }

    public function test_it_caches_local_side_analysis_responses(): void
    {
        Cache::flush();
        $connection = DB::connection('side_portfolio');
        $connection->flushQueryLog();
        $connection->enableQueryLog();

        app(SideDataAdapter::class)->rscaTbi(['origin' => 'IDN', 'dest' => 'CHN', 'level' => 6]);
        $queryCountAfterFirstCall = count($connection->getQueryLog());

        app(SideDataAdapter::class)->rscaTbi(['origin' => 'IDN', 'dest' => 'CHN', 'level' => 6]);
        $queryCountAfterSecondCall = count($connection->getQueryLog());

        $this->assertGreaterThan(0, $queryCountAfterFirstCall);
        $this->assertSame($queryCountAfterFirstCall, $queryCountAfterSecondCall);
    }
}
