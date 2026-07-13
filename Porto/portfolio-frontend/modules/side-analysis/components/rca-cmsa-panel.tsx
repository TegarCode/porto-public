"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rcaCmsaAnalysisPreview } from "@/modules/side-analysis/constants";
import type { SideFilterState } from "@/modules/side-analysis/types";
import { useRcaCmsaAnalysis } from "@/services/analysis-queries";
import type {
  RcaCmsaAnalysis,
  RcaCmsaRow,
  RcaCmsaSimpleRow,
} from "@/services/analysis-service";

type RcaCmsaPanelProps = {
  filters: SideFilterState;
};

const bucketConfig = [
  {
    key: "export",
    title: "Saran Strategi Produk Ekspor Teratas",
    accent: "bg-emerald-50 text-emerald-700",
  },
  {
    key: "import",
    title: "Saran Strategi Produk Impor Teratas",
    accent: "bg-sky-50 text-sky-700",
  },
  {
    key: "fdiInbound",
    title: "Saran Strategi Produk FDI Masuk Teratas",
    accent: "bg-amber-50 text-amber-700",
  },
  {
    key: "fdiOutbound",
    title: "Saran Strategi Produk FDI Keluar Teratas",
    accent: "bg-rose-50 text-rose-700",
  },
] as const;

const tableLimitOptions = [10, 25, 50, 100] as const;

function formatNumber(value: number | null | undefined) {
  if (value == null) return "-";
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 2,
  }).format(value);
}

function StrategyTable({
  title,
  rows,
}: {
  title: string;
  rows: RcaCmsaSimpleRow[];
}) {
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState("");
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRows =
    normalizedSearch === ""
      ? rows
      : rows.filter((row) =>
          [row.kode, row.hs4, row.nama]
            .join(" ")
            .toLowerCase()
            .includes(normalizedSearch),
        );
  const visibleRows = filteredRows.slice(0, limit);

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Format mengikuti tabel saran strategi di SIDE.
            </p>
            <p className="mt-2 text-xs font-medium text-slate-600">
              Menampilkan {formatNumber(visibleRows.length)} dari{" "}
              {formatNumber(filteredRows.length)} produk.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(180px,240px)_auto] sm:items-center">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari HSCode / produk"
              className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              Tampil
              <select
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="h-9 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800 outline-none transition focus:border-slate-500"
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
      </div>
      <div className="max-h-[430px] overflow-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-white text-xs uppercase text-slate-500 shadow-[0_1px_0_0_#e2e8f0]">
            <tr>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">HS4</th>
              <th className="px-4 py-3">Nama Produk</th>
              <th className="px-4 py-3">Strategi</th>
              <th className="px-4 py-3 text-right">Nilai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <tr key={`${row.strategi}-${row.kode}-${row.rank}`}>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {row.rank}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {row.hs4 || row.kode}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{row.nama}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.strategi}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatNumber(row.nilai)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  Data saran strategi belum tersedia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function RcaCmsaPanel({ filters }: RcaCmsaPanelProps) {
  const query = useRcaCmsaAnalysis(filters);
  const preview = rcaCmsaAnalysisPreview as RcaCmsaAnalysis;
  const data: RcaCmsaAnalysis = query.data ?? preview;
  const rows: RcaCmsaRow[] = data.data?.length ? data.data : preview.data;
  const buckets = data.buckets ?? preview.buckets;
  const totals = data.totals ?? preview.totals;
  const origin = data.origin ?? preview.origin;
  const destination = data.destination ?? preview.destination;
  const chartRows = rows.slice(0, 10).map((row) => ({
    label: row.label,
    value: Number(row.value ?? row.strength_score ?? 0),
  }));
  const originLabel = origin?.name ?? origin?.code ?? filters.origin;
  const destinationLabel =
    destination?.name ?? destination?.code ?? filters.dest;

  return (
    <section className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className="relative px-4 py-4 text-white sm:px-6"
          style={{
            backgroundImage:
              "linear-gradient(135deg, #384AA0, #5E7ADD), radial-gradient(900px 300px at 100% 0%, rgba(255,255,255,.14), transparent 60%)",
          }}
        >
          <div>
            <h3 className="text-lg font-semibold">RCA & CMSA</h3>
            <p className="mt-1 text-sm text-white/90">
              Ringkasan konsep, strategi, dan produk potensial dari databank-be.
            </p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/15 px-2 py-1">
              Asal: <strong>{originLabel}</strong>
            </span>
            <span className="opacity-70">-&gt;</span>
            <span className="rounded-full bg-white/15 px-2 py-1">
              Tujuan: <strong>{destinationLabel}</strong>
            </span>
          </div>
        </div>

        <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
              RCA
            </span>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Mengukur keunggulan komparatif ekspor suatu negara dibanding
              pola perdagangan dunia.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
              CMSA
            </span>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Membaca perubahan pangsa pasar dan memisahkan sinyal pertumbuhan,
              komposisi produk, serta daya saing.
            </p>
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase text-slate-500">
          Analyst Insight
        </p>
        <p className="mt-3 text-lg leading-8 text-slate-800">{data.insight}</p>
        <p className="mt-3 text-xs font-semibold uppercase text-slate-500">
          {query.isLoading
            ? "Loading API"
            : query.isError
              ? "Preview fallback"
              : query.data
                ? "Live databank-be"
                : "Preview data"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ["TOTAL SEMUA PRODUK", totals.allCount, null, "bg-indigo-50 text-indigo-700"],
          ["TOP PRODUK EKSPOR", totals.exportCount, totals.exportSum, "bg-emerald-50 text-emerald-700"],
          ["TOP PRODUK IMPOR", totals.importCount, totals.importSum, "bg-sky-50 text-sky-700"],
          ["TOP FDI MASUK", totals.fdiInboundCount, totals.fdiInboundSum, "bg-amber-50 text-amber-700"],
          ["TOP FDI KELUAR", totals.fdiOutboundCount, totals.fdiOutboundSum, "bg-rose-50 text-rose-700"],
        ].map(([title, count, sum, accent]) => (
          <article
            key={String(title)}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className={`inline-flex rounded-md px-2 py-1 text-[11px] font-semibold ${accent}`}>
              {title}
            </p>
            <p className="mt-4 text-3xl font-semibold text-slate-900">
              {formatNumber(Number(count))}
            </p>
            {typeof sum === "number" ? (
              <p className="mt-2 text-xs text-slate-500">
                Sum nilai {formatNumber(sum)}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900">
            Top Strategy Value
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Visual ringkas dari bucket strategi databank-be.
          </p>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartRows} margin={{ top: 12, right: 12, bottom: 12, left: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <Tooltip />
              <Bar dataKey="value" name="Nilai" fill="#384AA0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {bucketConfig.map((item) => (
          <StrategyTable
            key={item.key}
            title={item.title}
            rows={buckets[item.key] ?? []}
          />
        ))}
      </div>
    </section>
  );
}
