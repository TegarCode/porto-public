<?php

namespace App\Services\Side;

use Illuminate\Support\Facades\DB;

class CountryOptionService
{
    /**
     * @return array<string, mixed>
     */
    public function options(): array
    {
        return [
            'countries' => $this->countries(),
            'origins' => $this->tradeCountries('KodeNegara_1'),
            'destinations' => $this->tradeCountries('KodeNegara_2'),
            'source' => 'porto_side',
        ];
    }

    /**
     * @return array<int, array{code: string, alpha2: string|null, name: string|null}>
     */
    private function countries(): array
    {
        return DB::connection('side_portfolio')
            ->table('tbnegara')
            ->select([
                'Kode_Alpha3 as code',
                'Kode_Alpha2 as alpha2',
                'Negara_IDN as name',
            ])
            ->whereNotNull('Kode_Alpha3')
            ->orderBy('Negara_IDN')
            ->get()
            ->map(fn (object $row): array => [
                'code' => (string) $row->code,
                'alpha2' => $row->alpha2 === null ? null : (string) $row->alpha2,
                'name' => $row->name === null ? null : (string) $row->name,
            ])
            ->unique('code')
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{code: string, alpha2: string|null, name: string|null}>
     */
    private function tradeCountries(string $column): array
    {
        $rows = DB::connection('side_portfolio')
            ->table('tbhasilakhir')
            ->selectRaw("DISTINCT {$column} as code")
            ->whereNotNull($column);

        return DB::connection('side_portfolio')
            ->query()
            ->fromSub($rows, 'available')
            ->leftJoin('tbnegara as n', 'n.Kode_Alpha3', '=', 'available.code')
            ->select([
                'available.code',
                'n.Kode_Alpha2 as alpha2',
                'n.Negara_IDN as name',
            ])
            ->orderByRaw('COALESCE(n.Negara_IDN, available.code)')
            ->get()
            ->map(fn (object $row): array => [
                'code' => (string) $row->code,
                'alpha2' => $row->alpha2 === null ? null : (string) $row->alpha2,
                'name' => $row->name === null ? null : (string) $row->name,
            ])
            ->unique('code')
            ->values()
            ->all();
    }
}
