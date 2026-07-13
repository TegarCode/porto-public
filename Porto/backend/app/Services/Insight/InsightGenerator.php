<?php

namespace App\Services\Insight;

class InsightGenerator
{
    public function rcaCmsa(array $data, array $totals = []): string
    {
        if ($data === []) {
            return 'Data RCA-CMSA belum tersedia untuk filter ini, sehingga kombinasi daya saing dan perubahan pangsa pasar belum dapat dibaca.';
        }

        $strongest = collect($data)->sortByDesc('strength_score')->first();
        $allCount = (int) ($totals['allCount'] ?? count($data));

        return $this->sentence(sprintf(
            'Analisis RCA-CMSA mengikuti struktur databank-be dan membaca %d entri strategi. Sinyal paling menonjol adalah %s dengan skor/nilai %.2f, sehingga dapat dipakai sebagai kandidat utama untuk membaca potensi ekspor, impor, dan FDI dalam satu kerangka daya saing.',
            $allCount,
            $strongest['label'],
            $strongest['strength_score'],
        ));
    }

    public function rscaTbi(array $quadrants, array $points): string
    {
        if ($points === []) {
            return 'Data RSCA-TBI belum tersedia untuk filter ini, sehingga posisi daya saing produk belum dapat dipetakan.';
        }

        $dominant = collect($quadrants)->sortByDesc('count')->first();
        $best = collect($points)->sortByDesc(fn (array $point): float => $point['rsca'] + $point['tbi'])->first();

        return $this->sentence(sprintf(
            'Pemetaan RSCA-TBI menunjukkan %d produk dianalisis, dengan konsentrasi terbesar pada kuadran %s (%d produk). Produk paling menonjol adalah %s dengan RSCA %.2f dan TBI %.2f, sehingga layak menjadi perhatian utama dalam narasi daya saing.',
            count($points),
            $dominant['label'],
            $dominant['count'],
            $best['label'],
            $best['rsca'],
            $best['tbi'],
        ));
    }

    public function rcaEpd(array $matrix, array $points): string
    {
        if ($points === []) {
            return 'Data RCA-EPD belum tersedia untuk filter ini, sehingga posisi strategis produk belum dapat dipetakan.';
        }

        $dominant = collect($matrix)->sortByDesc('count')->first();
        $strongest = collect($points)
            ->filter(fn (array $point): bool => is_numeric($point['avg_rca']))
            ->sortByDesc('avg_rca')
            ->first();

        if ($strongest === null) {
            return $this->sentence(sprintf(
                'Pemetaan RCA-EPD menunjukkan %d produk dianalisis, dengan konsentrasi terbesar pada posisi %s (%d produk). Area ini menjadi titik awal untuk membaca arah pertumbuhan pasar dan prioritas promosi ekspor.',
                count($points),
                $dominant['label'],
                $dominant['count'],
            ));
        }

        return $this->sentence(sprintf(
            'Pemetaan RCA-EPD menunjukkan %d produk dianalisis, dengan konsentrasi terbesar pada posisi %s (%d produk). Produk paling kuat secara RCA adalah %s dengan AVG RCA %.2f, sehingga dapat diprioritaskan dalam strategi penguatan pasar dan promosi ekspor.',
            count($points),
            $dominant['label'],
            $dominant['count'],
            $strongest['label'],
            $strongest['avg_rca'],
        ));
    }

    public function sentiment(array $distribution, array $aspects): string
    {
        $total = array_sum($distribution);

        if ($total === 0) {
            return 'Analisis sentimen belum menghasilkan distribusi yang dapat dihitung dari respons sumber.';
        }

        $dominant = collect($distribution)->sortDesc()->keys()->first();
        $topAspect = collect($aspects)->sortByDesc('positive')->first();

        if (is_array($topAspect) && isset($topAspect['aspect'])) {
            return $this->sentence(sprintf(
                'Analisis sentimen menemukan %d sinyal sentimen, didominasi kelas %s. Aspek dengan sentimen positif paling kuat adalah %s (%d sinyal positif), sehingga area ini dapat menjadi angle utama untuk benchmark produk.',
                $total,
                $dominant,
                $topAspect['aspect'],
                $topAspect['positive'] ?? 0,
            ));
        }

        return $this->sentence(sprintf(
            'Analisis sentimen menemukan %d sinyal sentimen, didominasi kelas %s, sehingga distribusi ini dapat dipakai sebagai ringkasan awal persepsi pengguna.',
            $total,
            $dominant,
        ));
    }

    public function fallback(string $context): string
    {
        $context = trim($context) !== '' ? trim($context) : 'analisis';

        return "Insight {$context} belum memiliki cukup data, tetapi respons tetap disiapkan untuk eksplorasi dashboard.";
    }

    private function sentence(string $text): string
    {
        $text = trim($text);

        return $text !== '' ? $text : $this->fallback('portfolio');
    }
}
