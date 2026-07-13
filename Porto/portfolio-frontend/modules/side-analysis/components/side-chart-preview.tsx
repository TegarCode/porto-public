"use client";

import { useState } from "react";
import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { quadrantPreview } from "@/modules/side-analysis/constants";
import type { SideFilterState } from "@/modules/side-analysis/types";
import { useRscaTbiAnalysis } from "@/services/analysis-queries";
import type { RscaTbiPoint } from "@/services/analysis-service";

type SideChartPreviewProps = {
  filters: SideFilterState;
};

const tableLimitOptions = [10, 25, 50, 100] as const;

function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 5,
  }).format(value);
}

function recordValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (value != null && value !== "") {
      return String(value);
    }
  }

  return "-";
}

function quadrantLabel(key: string) {
  const labels: Record<string, string> = {
    competitive_exporter: "Competitive Exporter",
    competitive_importer: "Competitive but Import-Oriented",
    fragile_exporter: "Fragile Exporter",
    weak_position: "Weak Position",
  };

  return labels[key] ?? key;
}

export function SideChartPreview({ filters }: SideChartPreviewProps) {
  const [tableLimit, setTableLimit] = useState<number>(10);
  const [tableSearch, setTableSearch] = useState("");
  const query = useRscaTbiAnalysis(filters);
  const points = query.data?.scatter.points ?? quadrantPreview;
  const livePoints = query.data?.scatter.points ?? [];
  const normalizedSearch = tableSearch.trim().toLowerCase();
  const filteredRows: RscaTbiPoint[] =
    normalizedSearch === ""
      ? livePoints
      : livePoints.filter((row) =>
          [
            row.label,
            recordValue(row.record, ["hscode", "kode_hs", "kode"]),
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch),
        );
  const visibleRows: RscaTbiPoint[] = filteredRows.slice(0, tableLimit);

  return (
    <div className="space-y-6">
      <div className="border border-ink/15 bg-paper p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Quadrant Insight
            </p>
            <p className="mt-4 max-w-3xl text-xl leading-8 text-ink">
              {query.data?.insight ??
                "Preview RSCA-TBI memperlihatkan bagaimana produk dibaca dari daya saing dan neraca perdagangan sebelum masuk ke scatter quadrant."}
            </p>
          </div>
          <span className="border border-ink/15 px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
            {query.isLoading
              ? "Loading API"
              : query.isError
                ? "Preview fallback"
                : query.data
                  ? "Live API"
                  : "Preview data"}
          </span>
        </div>
      </div>

      {query.data ? (
        <div className="grid grid-cols-1 gap-px bg-ink/15 sm:grid-cols-2">
          {query.data.quadrants.slice(0, 4).map((quadrant) => (
            <article key={quadrant.key} className="bg-paper p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                {quadrant.count} product{quadrant.count === 1 ? "" : "s"}
              </p>
              <h4 className="mt-3 text-xl font-semibold text-ink">
                {quadrant.label}
              </h4>
              <p className="mt-3 text-sm leading-6 text-muted">
                {quadrant.description}
              </p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="h-[360px] border border-ink/15 bg-paper p-4">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 18, right: 18, bottom: 18, left: 6 }}>
            <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="RSCA"
              domain={[-0.8, 0.8]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#67645f", fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="TBI"
              domain={[-0.8, 0.8]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#67645f", fontSize: 12 }}
            />
            <ReferenceLine x={0} stroke="#151515" />
            <ReferenceLine y={0} stroke="#151515" />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter data={points} fill="#0f766e" name="Product" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {query.data ? (
        <div className="overflow-hidden border border-ink/15 bg-paper">
          <div className="flex flex-col gap-3 border-b border-ink/15 p-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-ink">
                Data Produk RSCA TBI
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Tabel ini mengambil seluruh hasil dari database Porto SIDE untuk
                filter aktif, sementara chart tetap diringkas agar mudah dibaca.
              </p>
              <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
                Menampilkan {formatNumber(visibleRows.length)} dari{" "}
                {formatNumber(filteredRows.length)} produk
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(180px,260px)_auto] sm:items-center">
              <input
                value={tableSearch}
                onChange={(event) => setTableSearch(event.target.value)}
                placeholder="Cari HSCode / produk"
                className="h-9 border border-ink/15 bg-background px-3 text-xs text-ink outline-none placeholder:text-muted"
              />
              <label className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
                Tampil
                <select
                  value={tableLimit}
                  onChange={(event) =>
                    setTableLimit(Number(event.target.value))
                  }
                  className="h-9 border border-ink/15 bg-background px-2 text-xs text-ink outline-none"
                >
                  {tableLimitOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="max-h-[430px] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-ink/15 bg-paper text-xs uppercase tracking-[0.12em] text-muted">
                <tr>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">HS Code</th>
                  <th className="px-4 py-3">Produk</th>
                  <th className="px-4 py-3 text-right">RSCA</th>
                  <th className="px-4 py-3 text-right">TBI</th>
                  <th className="px-4 py-3">Kuadran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {visibleRows.length > 0 ? (
                  visibleRows.map((row, index) => (
                    <tr key={`${row.label}-${index}`}>
                      <td className="px-4 py-3 font-semibold text-ink">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {recordValue(row.record, ["hscode", "kode_hs", "kode"])}
                      </td>
                      <td className="px-4 py-3 text-ink">{row.label}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                        {formatNumber(row.rsca)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted">
                        {formatNumber(row.tbi)}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {quadrantLabel(row.quadrant)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-center text-muted" colSpan={6}>
                      Produk tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
