<?php

namespace Tests\Feature\Api\V1\Sentiment;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AnalyzeSentimentEndpointTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['portfolio.services.sentiment.python_adapter.enabled' => false]);
    }

    public function test_sentiment_endpoint_proxies_flask_and_normalizes_json_response(): void
    {
        Http::fake([
            '127.0.0.1:5000/process_csv' => Http::response([
                'summary' => 'Camera sentiment is mostly positive.',
                'distribution' => [
                    'positive' => 24,
                    'neutral' => 5,
                    'negative' => 3,
                ],
                'aspects' => [
                    ['aspect' => 'camera', 'positive' => 12],
                    ['aspect' => 'battery', 'positive' => 8],
                ],
            ]),
        ]);

        $file = UploadedFile::fake()->createWithContent(
            'tweets.csv',
            "full_text,image_url\nCamera bagus,http://example.test/image.jpg\n",
        );

        $response = $this->postJson('/api/v1/sentiment/analyze', [
            'file_csv1' => $file,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.summary', 'Camera sentiment is mostly positive.')
            ->assertJsonPath('data.distribution.positive', 24)
            ->assertJsonPath('data.distribution.neutral', 5)
            ->assertJsonPath('data.distribution.negative', 3)
            ->assertJsonPath('data.meta.source', 'BenchmarkSentimen')
            ->assertJsonPath('data.meta.mode', 'json')
            ->assertJsonPath('message', 'Sentiment analysis is ready.');
    }

    public function test_sentiment_endpoint_can_transform_legacy_html_dashboard_response(): void
    {
        Http::fake([
            '127.0.0.1:5000/process_csv' => Http::response(<<<'HTML'
                <table>
                  <tr><td>network</td><td>3</td><td>4</td></tr>
                  <tr><td>camera</td><td>8</td><td>2</td></tr>
                </table>
            HTML, 200, ['Content-Type' => 'text/html']),
        ]);

        $file = UploadedFile::fake()->createWithContent(
            'tweets.csv',
            "full_text,image_url\nNetwork stabil,http://example.test/image.jpg\n",
        );

        $response = $this->postJson('/api/v1/sentiment/analyze', [
            'dataset' => $file,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.distribution.positive', 17)
            ->assertJsonPath('data.distribution.neutral', 0)
            ->assertJsonPath('data.distribution.negative', 0)
            ->assertJsonPath('data.aspects.0.aspect', 'network')
            ->assertJsonPath('data.aspects.0.positive', 7)
            ->assertJsonPath('data.aspects.1.aspect', 'camera')
            ->assertJsonPath('data.aspects.1.positive', 10)
            ->assertJsonPath('data.meta.mode', 'html_fallback');

        $this->assertNotEmpty($response->json('data.summary'));
    }
}
