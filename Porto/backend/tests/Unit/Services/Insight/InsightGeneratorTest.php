<?php

namespace Tests\Unit\Services\Insight;

use App\Services\Insight\InsightGenerator;
use Tests\TestCase;

class InsightGeneratorTest extends TestCase
{
    public function test_it_generates_non_empty_rsca_tbi_insight(): void
    {
        $insight = app(InsightGenerator::class)->rscaTbi([
            'competitive_exporter' => [
                'label' => 'Competitive Exporter',
                'count' => 1,
            ],
        ], [
            [
                'label' => 'Coffee',
                'rsca' => 0.7,
                'tbi' => 0.4,
            ],
        ]);

        $this->assertNotSame('', trim($insight));
        $this->assertStringContainsString('Coffee', $insight);
    }

    public function test_it_generates_non_empty_sentiment_insight(): void
    {
        $insight = app(InsightGenerator::class)->sentiment(
            ['positive' => 10, 'neutral' => 2, 'negative' => 1],
            [['aspect' => 'camera', 'positive' => 7]],
        );

        $this->assertNotSame('', trim($insight));
        $this->assertStringContainsString('camera', $insight);
    }
}
