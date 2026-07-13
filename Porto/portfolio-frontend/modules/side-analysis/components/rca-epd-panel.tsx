"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { rcaEpdPreview } from "@/modules/side-analysis/constants";
import type { SideFilterState } from "@/modules/side-analysis/types";
import {
  useRcaEpdAnalysis,
  useRcaEpdCalculation,
  useRcaEpdXModelOptions,
} from "@/services/analysis-queries";
import type {
  RcaEpdAnalysis,
  RcaEpdCalculationRow,
  RcaEpdPoint,
  RcaEpdRow,
} from "@/services/analysis-service";
import type { AnalysisFilters } from "@/services/query-keys";

type RcaEpdPanelProps = {
  filters: SideFilterState;
};

type TableMode = "country" | "detail";
type TableValue = string | number | null | undefined;

type RcaEpdChartPoint = {
  key: string;
  kode: string;
  hs4: string;
  komoditas: string;
  kategoriEpd: string;
  xModel: string;
  avgGrowthShare: number;
  avgGrowthDemand: number;
  avgRca: number;
  bubbleSize: number;
  categoryColor: string;
  xModelColor: string;
  derivedQuadrant: EpdQuadrantKey;
};

type EpdQuadrantKey =
  | "Rising Star"
  | "Lost Opportunity"
  | "Falling Star"
  | "Retreat";

type StrategicRecommendation = {
  label:
    | "Ekspansi agresif"
    | "Penetrasi pasar"
    | "Maintain niche market"
    | "Opportunity alert"
    | "Reposition selektif"
    | "Diversifikasi produk";
  priority: "tinggi" | "menengah" | "rendah";
  reason: string;
  color: string;
};

const tableLimitOptions = [10, 25, 50, 100] as const;
const fallbackCategory = "Tidak Terklasifikasi";
const fallbackXModel = "Tidak Ada X Model";

const categoryColors: Record<string, string> = {
  "rising star": "#059669",
  "lost opportunity": "#D97706",
  "falling star": "#0284C7",
  retreat: "#64748B",
};

const palette = [
  "#384AA0",
  "#059669",
  "#D97706",
  "#0284C7",
  "#7C3AED",
  "#BE123C",
  "#0F766E",
  "#A16207",
];

const recommendationColors: Record<StrategicRecommendation["label"], string> =
  {
    "Ekspansi agresif": "#059669",
    "Penetrasi pasar": "#0284C7",
    "Maintain niche market": "#7C3AED",
    "Opportunity alert": "#D97706",
    "Reposition selektif": "#0F766E",
    "Diversifikasi produk": "#64748B",
  };

function normalizedLabel(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function colorFromLabel(label: string) {
  let hash = 0;

  for (let index = 0; index < label.length; index += 1) {
    hash = (hash * 31 + label.charCodeAt(index)) % 9973;
  }

  return palette[hash % palette.length];
}

function categoryColor(label: string | null | undefined) {
  const normalized = normalizedLabel(label);
  const exactColor = categoryColors[normalized];

  if (exactColor) return exactColor;
  if (normalized.includes("rising")) return categoryColors["rising star"];
  if (normalized.includes("lost")) return categoryColors["lost opportunity"];
  if (normalized.includes("falling")) return categoryColors["falling star"];
  if (normalized.includes("retreat")) return categoryColors.retreat;

  return colorFromLabel(normalized || fallbackCategory);
}

function xModelColor(label: string | null | undefined) {
  return colorFromLabel(String(label ?? fallbackXModel));
}

function asNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function classifyEpdQuadrant(
  avgGrowthDemand: number,
  avgGrowthShare: number,
): EpdQuadrantKey {
  if (avgGrowthDemand >= 0 && avgGrowthShare >= 0) return "Rising Star";
  if (avgGrowthDemand >= 0 && avgGrowthShare < 0) return "Lost Opportunity";
  if (avgGrowthDemand < 0 && avgGrowthShare >= 0) return "Falling Star";
  return "Retreat";
}

function xModelScore(label: string | null | undefined) {
  const normalized = normalizedLabel(label);

  if (normalized.includes("optim")) return 100;
  if (normalized.includes("tidak") && normalized.includes("potens")) return 10;
  if (normalized.includes("kurang")) return 40;
  if (normalized.includes("potens")) return 75;

  return 50;
}

function isCompetitiveRca(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1;
}

function deriveStrategicRecommendation(
  point: Pick<RcaEpdChartPoint, "avgRca" | "derivedQuadrant" | "xModel">,
): StrategicRecommendation {
  const competitive = isCompetitiveRca(point.avgRca);
  const xScore = xModelScore(point.xModel);

  if (point.derivedQuadrant === "Rising Star") {
    if (competitive) {
      return {
        label: "Ekspansi agresif",
        priority: "tinggi",
        reason:
          "RCA sudah kuat dan pasar tumbuh. Produk ini layak diprioritaskan untuk ekspansi agresif.",
        color: recommendationColors["Ekspansi agresif"],
      };
    }

    return {
      label: "Penetrasi pasar",
      priority: "tinggi",
      reason:
        "Pasar tumbuh tetapi daya saing belum cukup kuat. Fokus pada penetrasi pasar dan penguatan ekspor.",
      color: recommendationColors["Penetrasi pasar"],
    };
  }

  if (point.derivedQuadrant === "Lost Opportunity") {
    return {
      label: "Opportunity alert",
      priority: xScore >= 75 ? "tinggi" : "menengah",
      reason:
        "Permintaan pasar tumbuh, tetapi pertumbuhan share tertinggal. Perlu respons strategi dan penetrasi yang lebih cepat.",
      color: recommendationColors["Opportunity alert"],
    };
  }

  if (point.derivedQuadrant === "Falling Star") {
    if (competitive) {
      return {
        label: "Maintain niche market",
        priority: "menengah",
        reason:
          "Produk masih kompetitif, tetapi dinamika pasar melemah. Jaga pasar niche yang masih memberi hasil baik.",
        color: recommendationColors["Maintain niche market"],
      };
    }

    return {
      label: "Reposition selektif",
      priority: "menengah",
      reason:
        "Share relatif bertahan, tetapi demand melemah dan daya saing belum kuat. Seleksi pasar atau reposisi diperlukan.",
      color: recommendationColors["Reposition selektif"],
    };
  }

  return {
    label: "Diversifikasi produk",
    priority: "rendah",
    reason:
      "Daya saing dan dinamika pasar sama-sama lemah. Pertimbangkan diversifikasi produk atau realokasi fokus pasar.",
    color: recommendationColors["Diversifikasi produk"],
  };
}

function strategicPotentialScore(
  point: Pick<
    RcaEpdChartPoint,
    "avgRca" | "kategoriEpd" | "xModel" | "derivedQuadrant"
  >,
) {
  const clampedRca = Math.min(Math.max(point.avgRca, 0), 4);
  const rcaScore = (clampedRca / 4) * 100;
  const epdScore =
    point.derivedQuadrant === "Rising Star"
      ? 100
      : point.derivedQuadrant === "Falling Star"
        ? 70
        : point.derivedQuadrant === "Lost Opportunity"
          ? 50
          : 20;

  return rcaScore * 0.25 + epdScore * 0.4 + xModelScore(point.xModel) * 0.35;
}

function dynamicDomain(
  values: number[],
  options: {
    includeZero?: boolean;
    minimumPadding?: number;
    paddingRatio?: number;
    fallbackSpan?: number;
  } = {},
) {
  const {
    includeZero = false,
    minimumPadding = 0.1,
    paddingRatio = 0.2,
    fallbackSpan = 0.5,
  } = options;
  const finiteValues = values.filter(Number.isFinite);

  if (!finiteValues.length) {
    return [-fallbackSpan, fallbackSpan] as [number, number];
  }

  let min = Math.min(...finiteValues);
  let max = Math.max(...finiteValues);

  if (includeZero) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }

  const span = max - min;
  const padding =
    span > 0
      ? Math.max(span * paddingRatio, minimumPadding)
      : Math.max(Math.abs(max || min) * paddingRatio, minimumPadding);

  return [min - padding, max + padding] as [number, number];
}

function deterministicJitter(seed: string, salt: number, spread = 0.025) {
  let hash = 0;
  const source = `${seed}:${salt}`;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 9973;
  }

  return ((hash % 1000) / 1000 - 0.5) * spread;
}

function logRcaValue(value: number, floor = 0.01) {
  return Math.log10(Math.max(value, floor));
}

function formatLogRcaTick(value: number) {
  const rawValue = 10 ** value;

  if (!Number.isFinite(rawValue)) return "";
  if (rawValue >= 100) return String(Math.round(rawValue));
  if (rawValue >= 10) return rawValue.toFixed(1);
  if (rawValue >= 1) return rawValue.toFixed(1);
  if (rawValue >= 0.1) return rawValue.toFixed(2);
  return rawValue.toFixed(3);
}

function formatNumber(value: number | null | undefined, digits = 4) {
  if (value == null || !Number.isFinite(value)) return "-";

  return value.toLocaleString("id-ID", {
    maximumFractionDigits: digits,
  });
}

function formatCompactNumber(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "-";

  return value.toLocaleString("id-ID", {
    maximumFractionDigits: Math.abs(value) >= 100 ? 0 : 3,
  });
}

function shortProductLabel(value: string, maxLength = 30) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function compareSortValue(
  left: TableValue,
  right: TableValue,
  direction: "asc" | "desc",
) {
  const leftEmpty = left == null || left === "";
  const rightEmpty = right == null || right === "";

  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;

  const multiplier = direction === "asc" ? 1 : -1;
  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return (leftNumber - rightNumber) * multiplier;
  }

  return String(left).localeCompare(String(right)) * multiplier;
}

function toFallbackRow(point: RcaEpdPoint): RcaEpdRow {
  return {
    kode: point.kode ?? String(point.record.kode_hs ?? point.record.hscode ?? ""),
    hs4: point.hs4 ?? String(point.record.hs4 ?? point.record.kode_hs ?? ""),
    komoditas: point.label,
    kategoriEpd: point.position_label,
    avgGrowthShare: point.growth_share,
    avgGrowthDemand: point.growth_demand,
    avgRca: point.avg_rca,
    xModel: point.x_model,
  };
}

function toChartPoints(rows: RcaEpdRow[]): RcaEpdChartPoint[] {
  return rows
    .map((row, index) => {
      const avgGrowthShare = asNumber(row.avgGrowthShare);
      const avgGrowthDemand = asNumber(row.avgGrowthDemand);

      if (avgGrowthShare == null || avgGrowthDemand == null) return null;

      const avgRca = Math.max(0, asNumber(row.avgRca) ?? 0);
      const kode = row.kode || row.hs4;
      const kategoriEpd = row.kategoriEpd || fallbackCategory;
      const xModel = row.xModel || fallbackXModel;

      return {
        key: `${kode}-${index}`,
        kode,
        hs4: row.hs4 || kode,
        komoditas: row.komoditas,
        kategoriEpd,
        xModel,
        avgGrowthShare,
        avgGrowthDemand,
        avgRca,
        bubbleSize: Math.max(avgRca, 0.08),
        categoryColor: categoryColor(kategoriEpd),
        xModelColor: xModelColor(xModel),
        derivedQuadrant: classifyEpdQuadrant(avgGrowthDemand, avgGrowthShare),
      };
    })
    .filter((item): item is RcaEpdChartPoint => item != null);
}

function uniqueLegendItems(
  points: RcaEpdChartPoint[],
  key: "kategoriEpd" | "xModel",
  colorKey: "categoryColor" | "xModelColor",
) {
  return Array.from(
    new Map(
      points.map((point) => [
        point[key],
        { label: point[key], color: point[colorKey] },
      ]),
    ).values(),
  );
}

function countryLabel(
  country?: { code: string | null; name: string | null } | null,
) {
  if (!country) return "-";
  return [country.code, country.name].filter(Boolean).join(" - ") || "-";
}

export function RcaEpdPanel({ filters }: RcaEpdPanelProps) {
  const [selectedXModel, setSelectedXModel] = useState("");
  const [tableMode, setTableMode] = useState<TableMode>("country");
  const optionFilters = useMemo<AnalysisFilters>(
    () => ({
      origin: filters.origin,
      dest: filters.dest,
      level: filters.level,
    }),
    [filters.dest, filters.level, filters.origin],
  );
  const xModelQuery = useRcaEpdXModelOptions(optionFilters);
  const xModelOptions = useMemo(
    () => xModelQuery.data?.options ?? [],
    [xModelQuery.data?.options],
  );
  const effectiveXModel =
    selectedXModel && xModelOptions.includes(selectedXModel)
      ? selectedXModel
      : "";
  const activeFilters = useMemo<AnalysisFilters>(
    () => ({
      ...optionFilters,
      x_model: effectiveXModel || undefined,
      limit: "ALL",
    }),
    [effectiveXModel, optionFilters],
  );
  const query = useRcaEpdAnalysis(activeFilters);
  const calculationQuery = useRcaEpdCalculation(activeFilters);
  const data: RcaEpdAnalysis = query.data ?? rcaEpdPreview;
  const isFallback = !query.data;
  const rows = useMemo<RcaEpdRow[]>(
    () =>
      data.rows && data.rows.length > 0
        ? data.rows
        : (data.chart?.points ?? []).map(toFallbackRow),
    [data],
  );
  const points = useMemo(() => toChartPoints(rows), [rows]);
  const originLabel = data.origin ? countryLabel(data.origin) : filters.origin;
  const destinationLabel = data.destination
    ? countryLabel(data.destination)
    : filters.dest;

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Country Trade Analysis (RCA & EPD)
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Asal: {originLabel} -&gt; Tujuan: {destinationLabel}. Modul ini
              mengikuti alur SIDE: tabel RCA-EPD terlebih dahulu, lalu
              visualisasi untuk membaca kuadran, peluang, dan prioritas
              strategi.
            </p>
          </div>
          <span className="inline-flex rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {query.isLoading
              ? "Loading API"
              : query.isError
                ? "Preview fallback"
                : isFallback
                  ? "Preview data"
                  : "Live porto_side"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_260px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Strategic Insight
          </p>
          <p className="mt-3 max-w-5xl text-base leading-7 text-slate-700">
            {data.insight}
          </p>
        </div>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            X Model
          </span>
          <select
            value={effectiveXModel}
            onChange={(event) => setSelectedXModel(event.target.value)}
            className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus:border-[#384AA0] focus:bg-white focus:ring-1 focus:ring-[#384AA0]"
          >
            <option value="">Semua X Model</option>
            {xModelOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-2 text-xs font-semibold text-slate-500">
          Tampilan data
        </div>
        <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1 text-xs font-semibold text-slate-700">
          <button
            type="button"
            onClick={() => setTableMode("country")}
            className={`rounded px-3 py-1.5 transition-colors ${
              tableMode === "country"
                ? "bg-white text-[#384AA0] shadow-sm"
                : "hover:bg-white/80 hover:text-slate-950"
            }`}
          >
            RCA-EPD Negara
          </button>
          <button
            type="button"
            onClick={() => setTableMode("detail")}
            className={`rounded px-3 py-1.5 transition-colors ${
              tableMode === "detail"
                ? "bg-white text-[#384AA0] shadow-sm"
                : "hover:bg-white/80 hover:text-slate-950"
            }`}
          >
            RCA-EPD Negara Detil
          </button>
        </div>
      </div>

      {tableMode === "country" ? (
        <>
          <RcaEpdSummaryTable
            loading={query.isLoading}
            error={query.isError}
            rows={rows}
            sourceName={data.sourceName ?? data.source}
          />
          {!query.isLoading && !query.isError ? (
            <>
              <BubbleQuadrantChart points={points} />
              <OpportunityAlert points={points} />
              <StrategyMatrixChart points={points} />
              <StrategicHeatmap points={points} />
              <XModelFunnel points={points} />
              <TopProductsChart points={points} />
            </>
          ) : null}
        </>
      ) : (
        <DynamicCalculationTable
          loading={calculationQuery.isLoading}
          error={calculationQuery.isError}
          rows={calculationQuery.data?.rows ?? []}
          sourceName={calculationQuery.data?.source_name ?? "porto_side"}
        />
      )}
    </section>
  );
}

function RcaEpdSummaryTable({
  rows,
  loading,
  error,
  sourceName,
}: {
  rows: RcaEpdRow[];
  loading: boolean;
  error: boolean;
  sourceName?: string;
}) {
  const [sortKey, setSortKey] = useState<keyof RcaEpdRow>("avgRca");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState("");
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const sortedRows = [...rows].sort((left, right) =>
      compareSortValue(left[sortKey], right[sortKey], sortDirection),
    );

    if (!keyword) return sortedRows;

    return sortedRows.filter((item) =>
      [
        item.kode,
        item.hs4,
        item.komoditas,
        item.kategoriEpd,
        item.xModel,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(keyword)),
    );
  }, [rows, search, sortDirection, sortKey]);
  const displayedRows = filteredRows.slice(0, limit);

  function handleSort(key: keyof RcaEpdRow) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            RCA-EPD Negara
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Tabel mengikuti struktur SIDE: kategori EPD, kode HS, komoditas,
            rata-rata growth share, growth demand, AVG RCA, dan X Model.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Menampilkan {displayedRows.length} dari {filteredRows.length} produk
            {sourceName ? ` / ${sourceName}` : ""}
          </p>
        </div>
        <TableControls
          search={search}
          onSearch={setSearch}
          limit={limit}
          onLimit={setLimit}
          searchPlaceholder="Cari HSCode / produk"
        />
      </div>

      {loading ? (
        <TableState text="Memuat data RCA-EPD..." />
      ) : error ? (
        <TableState text="Data RCA-EPD gagal dimuat dari API." tone="error" />
      ) : (
        <div className="max-h-[430px] overflow-auto">
          <table className="min-w-[1260px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3">No</th>
                <SortableHeader
                  label="Kategori EPD"
                  active={sortKey === "kategoriEpd"}
                  direction={sortDirection}
                  onClick={() => handleSort("kategoriEpd")}
                />
                <SortableHeader
                  label="Kode HS"
                  active={sortKey === "kode"}
                  direction={sortDirection}
                  onClick={() => handleSort("kode")}
                />
                <SortableHeader
                  label="Komoditas"
                  active={sortKey === "komoditas"}
                  direction={sortDirection}
                  onClick={() => handleSort("komoditas")}
                />
                <SortableHeader
                  align="right"
                  label="AVG Growth Share"
                  active={sortKey === "avgGrowthShare"}
                  direction={sortDirection}
                  onClick={() => handleSort("avgGrowthShare")}
                />
                <SortableHeader
                  align="right"
                  label="AVG Growth Demand"
                  active={sortKey === "avgGrowthDemand"}
                  direction={sortDirection}
                  onClick={() => handleSort("avgGrowthDemand")}
                />
                <SortableHeader
                  align="right"
                  label="AVG RCA"
                  active={sortKey === "avgRca"}
                  direction={sortDirection}
                  onClick={() => handleSort("avgRca")}
                />
                <SortableHeader
                  label="X Model"
                  active={sortKey === "xModel"}
                  direction={sortDirection}
                  onClick={() => handleSort("xModel")}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRows.length ? (
                displayedRows.map((item, index) => (
                  <tr
                    key={`${item.kode}-${index}`}
                    className="transition hover:bg-slate-50"
                  >
                    <td className="p-3">{index + 1}</td>
                    <td className="max-w-[220px] p-3">
                      {item.kategoriEpd ?? "-"}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">
                      {item.kode || item.hs4}
                    </td>
                    <td className="max-w-[360px] p-3 text-slate-700">
                      {item.komoditas}
                    </td>
                    <td className="p-3 text-right tabular-nums text-slate-600">
                      {formatNumber(item.avgGrowthShare)}
                    </td>
                    <td className="p-3 text-right tabular-nums text-slate-600">
                      {formatNumber(item.avgGrowthDemand)}
                    </td>
                    <td className="p-3 text-right font-semibold tabular-nums text-slate-900">
                      {formatNumber(item.avgRca)}
                    </td>
                    <td className="max-w-[280px] p-3 text-slate-600">
                      {item.xModel ?? "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={8}>
                    Produk tidak ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BubbleQuadrantChart({ points }: { points: RcaEpdChartPoint[] }) {
  const [limit, setLimit] = useState<50 | 100 | -1>(100);
  const visiblePoints = useMemo(() => {
    const sorted = [...points].sort((left, right) => right.avgRca - left.avgRca);
    return limit === -1 ? sorted : sorted.slice(0, limit);
  }, [limit, points]);
  const chartData = useMemo(
    () =>
      visiblePoints.map((point) => ({
        ...point,
        x: point.avgGrowthDemand + deterministicJitter(point.key, 1, 0.018),
        y: point.avgGrowthShare + deterministicJitter(point.key, 2, 0.018),
        z: point.bubbleSize,
      })),
    [visiblePoints],
  );
  const xDomain = dynamicDomain(
    visiblePoints.map((point) => point.avgGrowthDemand),
    { includeZero: true, minimumPadding: 0.05 },
  );
  const yDomain = dynamicDomain(
    visiblePoints.map((point) => point.avgGrowthShare),
    { includeZero: true, minimumPadding: 0.05 },
  );
  const categoryLegend = uniqueLegendItems(
    visiblePoints,
    "kategoriEpd",
    "categoryColor",
  );

  if (!points.length) {
    return <EmptyChart title="Bubble Quadrant EPD" />;
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Bubble Quadrant EPD
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            X menunjukkan pertumbuhan demand, Y menunjukkan pertumbuhan share,
            ukuran bubble menunjukkan AVG RCA, dan warna mengikuti kategori EPD.
          </p>
        </div>
        <select
          value={limit}
          onChange={(event) => setLimit(Number(event.target.value) as 50 | 100 | -1)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none"
        >
          <option value={50}>Top 50 AVG RCA</option>
          <option value={100}>Top 100 AVG RCA</option>
          <option value={-1}>Semua produk</option>
        </select>
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-3">
        <MetricBox label="Produk ditampilkan" value={visiblePoints.length} />
        <MetricBox
          label="Rising Star"
          value={points.filter((item) => item.derivedQuadrant === "Rising Star").length}
        />
        <MetricBox
          label="Lost Opportunity"
          value={
            points.filter((item) => item.derivedQuadrant === "Lost Opportunity")
              .length
          }
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
        <div className="text-xs font-semibold uppercase text-slate-500">
          Panduan visual
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {categoryLegend.map((item) => (
            <LegendPill key={item.label} color={item.color} label={item.label} />
          ))}
        </div>
      </div>

      <div className="relative h-[540px] rounded-lg border border-slate-200 p-3">
        <div className="pointer-events-none absolute inset-6 z-10 grid grid-cols-2 grid-rows-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <div>Falling Star</div>
          <div className="text-right">Rising Star</div>
          <div className="flex items-end">Retreat</div>
          <div className="flex items-end justify-end">Lost Opportunity</div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 28, bottom: 32, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              domain={xDomain}
              allowDataOverflow
              tickLine={false}
              axisLine={false}
              label={{
                value: "AVG Growth Demand",
                position: "insideBottom",
                offset: -16,
              }}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={yDomain}
              allowDataOverflow
              tickLine={false}
              axisLine={false}
              label={{
                value: "AVG Growth Share",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <ZAxis dataKey="z" range={[42, 720]} />
            <ReferenceLine x={0} stroke="#0F172A" strokeOpacity={0.45} />
            <ReferenceLine y={0} stroke="#0F172A" strokeOpacity={0.45} />
            <Tooltip content={<BubbleTooltip />} />
            <Scatter data={chartData} name="Produk RCA EPD">
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.categoryColor} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function OpportunityAlert({ points }: { points: RcaEpdChartPoint[] }) {
  const opportunities = useMemo(
    () =>
      points
        .filter(
          (point) =>
            point.derivedQuadrant === "Lost Opportunity" ||
            point.kategoriEpd.toLowerCase().includes("lost"),
        )
        .map((point) => ({
          ...point,
          opportunityScore:
            Math.max(point.avgGrowthDemand, 0) * 100 +
            Math.abs(Math.min(point.avgGrowthShare, 0)) * 100 +
            Math.min(point.avgRca, 4) * 10,
          xScore: xModelScore(point.xModel),
        }))
        .sort((left, right) => right.opportunityScore - left.opportunityScore),
    [points],
  );
  const topOpportunities = opportunities.slice(0, 8);

  if (!points.length) {
    return <EmptyChart title="Top Lost Opportunity Products" />;
  }

  return (
    <section className="space-y-4 rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-950">
          Top Lost Opportunity Products
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Produk di area ini berada pada pasar yang tumbuh, tetapi pertumbuhan
          share Indonesia tertinggal. Ini sinyal peluang yang belum
          termanfaatkan.
        </p>
      </div>

      <div className="grid gap-3 text-xs md:grid-cols-3">
        <MetricBox
          label="Total Lost Opportunity"
          value={opportunities.length}
          tone="amber"
        />
        <MetricBox
          label="RCA di atas 1"
          value={opportunities.filter((point) => isCompetitiveRca(point.avgRca)).length}
        />
        <MetricBox
          label="X Model potensial / optimis"
          value={opportunities.filter((point) => point.xScore >= 75).length}
        />
      </div>

      {topOpportunities.length ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {topOpportunities.map((point) => (
            <article key={point.key} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {point.kode}
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {point.komoditas}
                  </div>
                </div>
                <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                  Skor {point.opportunityScore.toFixed(1)}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                <MiniMetric label="Demand" value={formatNumber(point.avgGrowthDemand)} />
                <MiniMetric label="Share" value={formatNumber(point.avgGrowthShare)} />
                <MiniMetric label="AVG RCA" value={formatNumber(point.avgRca)} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-slate-200 px-2 py-1 font-semibold text-slate-700">
                  {point.kategoriEpd}
                </span>
                <span className="rounded-full border border-slate-200 px-2 py-1 text-slate-600">
                  {point.xModel}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Belum ada produk Lost Opportunity untuk filter aktif.
        </div>
      )}
    </section>
  );
}

function StrategyMatrixChart({ points }: { points: RcaEpdChartPoint[] }) {
  const [showPriorityOnly, setShowPriorityOnly] = useState(false);
  const chartData = useMemo(
    () =>
      points
        .map((point) => {
          const recommendation = deriveStrategicRecommendation(point);

          return {
            ...point,
            logRca: logRcaValue(point.avgRca),
            x: logRcaValue(point.avgRca) + deterministicJitter(point.key, 3, 0.01),
            y: point.avgGrowthDemand + deterministicJitter(point.key, 4, 0.01),
            z: 58,
            recommendation: recommendation.label,
            recommendationReason: recommendation.reason,
            recommendationColor: recommendation.color,
            recommendationPriority: recommendation.priority,
          };
        })
        .filter((point) =>
          showPriorityOnly ? point.recommendationPriority === "tinggi" : true,
        ),
    [points, showPriorityOnly],
  );
  const xDomain = dynamicDomain(
    chartData.map((point) => point.logRca),
    { includeZero: true, minimumPadding: 0.18, fallbackSpan: 1 },
  );
  const yDomain = dynamicDomain(
    chartData.map((point) => point.avgGrowthDemand),
    { includeZero: true, minimumPadding: 0.05 },
  );
  const recommendationCounts = useMemo(() => {
    const counts = new Map(
      Object.entries(recommendationColors).map(([label, color]) => [
        label,
        { label, color, count: 0 },
      ]),
    );

    points.forEach((point) => {
      const result = deriveStrategicRecommendation(point);
      const current = counts.get(result.label);

      if (current) current.count += 1;
    });

    return Array.from(counts.values());
  }, [points]);

  if (!points.length) {
    return <EmptyChart title="Strategy Matrix RCA - Demand" />;
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Strategy Matrix RCA - Demand
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Matriks prioritas berdasarkan AVG RCA, posisi EPD, dan X Model.
            Sumbu X memakai skala log RCA agar produk dengan RCA ekstrem tetap
            terbaca.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={showPriorityOnly}
            onChange={(event) => setShowPriorityOnly(event.target.checked)}
          />
          Hanya prioritas tinggi
        </label>
      </div>

      <div className="grid gap-2 text-xs md:grid-cols-3 xl:grid-cols-6">
        {recommendationCounts.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 px-3 py-2"
            style={{ borderColor: `${item.color}40` }}
          >
            <div className="font-semibold" style={{ color: item.color }}>
              {item.count}
            </div>
            <div className="text-slate-500">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="relative h-[500px] rounded-lg border border-slate-200 p-3">
        <div className="pointer-events-none absolute inset-6 z-10 grid grid-cols-2 grid-rows-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          <div>Maintain / Reposition</div>
          <div className="text-right">Ekspansi / Alert</div>
          <div className="flex items-end">Diversifikasi</div>
          <div className="flex items-end justify-end">Penetrasi</div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 28, bottom: 32, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              domain={xDomain}
              allowDataOverflow
              tickFormatter={formatLogRcaTick}
              tickLine={false}
              axisLine={false}
              label={{
                value: "AVG RCA (log scale)",
                position: "insideBottom",
                offset: -16,
              }}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={yDomain}
              allowDataOverflow
              tickLine={false}
              axisLine={false}
              label={{
                value: "AVG Growth Demand",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <ZAxis dataKey="z" range={[64, 64]} />
            <ReferenceLine x={0} stroke="#0F172A" strokeOpacity={0.45} />
            <ReferenceLine y={0} stroke="#0F172A" strokeOpacity={0.45} />
            <Tooltip content={<StrategyTooltip />} />
            <Scatter data={chartData} name="Strategy Matrix">
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.recommendationColor} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function StrategicHeatmap({ points }: { points: RcaEpdChartPoint[] }) {
  const columns = [
    {
      id: "competitive",
      label: "RCA > 1",
      description: "Produk sudah relatif kompetitif.",
    },
    {
      id: "emerging",
      label: "RCA <= 1",
      description: "Produk masih butuh penguatan daya saing.",
    },
  ] as const;
  const quadrants: EpdQuadrantKey[] = [
    "Rising Star",
    "Lost Opportunity",
    "Falling Star",
    "Retreat",
  ];
  const matrix = quadrants.map((quadrant) => ({
    quadrant,
    color: categoryColor(quadrant),
    values: columns.map((column) => {
      const count = points.filter((point) => {
        if (point.derivedQuadrant !== quadrant) return false;

        return column.id === "competitive"
          ? isCompetitiveRca(point.avgRca)
          : !isCompetitiveRca(point.avgRca);
      }).length;

      return {
        columnId: column.id,
        count,
        share: points.length ? (count / points.length) * 100 : 0,
      };
    }),
  }));
  const maxCount = Math.max(
    1,
    ...matrix.flatMap((rowItem) => rowItem.values.map((value) => value.count)),
  );

  if (!points.length) {
    return <EmptyChart title="Strategic Matrix Heatmap" />;
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-950">
          Strategic Matrix Heatmap
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Distribusi produk berdasarkan kategori EPD dan ambang daya saing RCA.
          Intensitas warna memperlihatkan konsentrasi produk.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="max-h-[430px] overflow-auto rounded-lg border border-slate-200">
          <table className="min-w-[720px] border-collapse text-sm">
            <thead className="sticky top-0 bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">
                  Kategori EPD
                </th>
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((rowItem) => (
                <tr key={rowItem.quadrant}>
                  <td className="border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: rowItem.color }}
                      />
                      <span className="font-semibold text-slate-900">
                        {rowItem.quadrant}
                      </span>
                    </div>
                  </td>
                  {rowItem.values.map((value) => {
                    const opacity = 0.12 + (value.count / maxCount) * 0.32;

                    return (
                      <td
                        key={`${rowItem.quadrant}-${value.columnId}`}
                        className="border-b border-slate-200 px-4 py-3"
                      >
                        <div
                          className="rounded-md px-3 py-2"
                          style={{
                            backgroundColor: hexToRgba(rowItem.color, opacity),
                          }}
                        >
                          <div className="font-semibold text-slate-900">
                            {value.count}
                          </div>
                          <div className="text-xs text-slate-600">
                            {value.share.toFixed(1)}% dari produk
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3">
          {columns.map((column) => (
            <div key={column.id} className="rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">
                {column.label}
              </div>
              <p className="mt-2 text-sm text-slate-700">
                {column.description}
              </p>
            </div>
          ))}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-600">
            <div className="font-semibold text-slate-900">Cara baca cepat</div>
            <p className="mt-2">
              Fokus awal biasanya ada pada Rising Star + RCA &gt; 1 dan Lost
              Opportunity + RCA &gt; 1.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function XModelFunnel({ points }: { points: RcaEpdChartPoint[] }) {
  const total = points.length;
  const competitive = points.filter((point) => isCompetitiveRca(point.avgRca));
  const risingStar = competitive.filter(
    (point) => point.derivedQuadrant === "Rising Star",
  );
  const optimistic = risingStar.filter((point) => xModelScore(point.xModel) >= 90);
  const steps = [
    {
      key: "total",
      label: "Total Produk",
      description: "Semua produk yang sedang masuk dalam filter.",
      count: total,
      color: "#384AA0",
    },
    {
      key: "competitive",
      label: "RCA > 1",
      description: "Produk yang sudah relatif kompetitif.",
      count: competitive.length,
      color: "#0284C7",
    },
    {
      key: "rising",
      label: "Rising Star",
      description: "Produk kompetitif di pasar yang masih tumbuh.",
      count: risingStar.length,
      color: "#059669",
    },
    {
      key: "optimistic",
      label: "Pengembangan Optimis",
      description: "Produk Rising Star dengan sinyal X Model paling positif.",
      count: optimistic.length,
      color: "#D97706",
    },
  ];

  if (!points.length) {
    return <EmptyChart title="X-Model Funnel" />;
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-950">
          X-Model Funnel
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Funnel ini menyaring produk dari total data, daya saing, posisi
          Rising Star, sampai rekomendasi pengembangan pasar optimis.
        </p>
      </div>
      <div className="space-y-3">
        {steps.map((step, index) => {
          const percentage = total ? (step.count / total) * 100 : 0;

          return (
            <div key={step.key} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {index + 1}. {step.label}
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {step.description}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-slate-900">
                    {step.count}
                  </div>
                  <div className="text-xs text-slate-500">
                    {percentage.toFixed(1)}% dari total
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-full bg-slate-100 p-1">
                <div
                  className="h-8 rounded-full px-3 text-xs font-semibold leading-8 text-white transition-all"
                  style={{
                    width: `${Math.max(percentage, 18)}%`,
                    backgroundColor: step.color,
                  }}
                >
                  {step.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TopProductsChart({ points }: { points: RcaEpdChartPoint[] }) {
  const metrics = [
    {
      key: "avgRca",
      title: "Top AVG RCA",
      description: "Produk dengan daya saing rata-rata tertinggi.",
      color: "#384AA0",
      value: (point: RcaEpdChartPoint) => point.avgRca,
    },
    {
      key: "lostOpportunity",
      title: "Top Lost Opportunity",
      description: "Produk dengan sinyal lost opportunity paling kuat.",
      color: "#D97706",
      filter: (point: RcaEpdChartPoint) =>
        point.derivedQuadrant === "Lost Opportunity" ||
        point.kategoriEpd.toLowerCase().includes("lost"),
      value: (point: RcaEpdChartPoint) =>
        Math.max(point.avgGrowthDemand, 0) * 100 +
        Math.abs(Math.min(point.avgGrowthShare, 0)) * 100 +
        Math.min(point.avgRca, 4) * 10,
    },
    {
      key: "growthShare",
      title: "Top Growth Share",
      description: "Produk dengan kenaikan share ekspor tertinggi.",
      color: "#0284C7",
      value: (point: RcaEpdChartPoint) => point.avgGrowthShare,
    },
    {
      key: "strategicPotential",
      title: "Top Strategic Potential",
      description: "Kombinasi daya saing, posisi EPD, dan X Model.",
      color: "#059669",
      value: (point: RcaEpdChartPoint) => strategicPotentialScore(point),
    },
  ];
  const rankings = metrics.map((metric) => ({
    metric,
    rows: points
      .filter((point) => (metric.filter ? metric.filter(point) : true))
      .sort((left, right) => metric.value(right) - metric.value(left))
      .slice(0, 10)
      .map((point) => ({
        kode: point.kode,
        label: `${point.kode} ${shortProductLabel(point.komoditas, 24)}`,
        fullLabel: point.komoditas,
        value: metric.value(point),
        kategoriEpd: point.kategoriEpd,
        xModel: point.xModel,
      })),
  }));

  if (!points.length) {
    return <EmptyChart title="Top-N Ranking Dashboard" />;
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-950">
          Top-N Ranking Dashboard
        </h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          Ranking cepat untuk membaca produk paling kuat, paling tumbuh, dan
          paling layak diprioritaskan.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {rankings.map(({ metric, rows }) => (
          <RankingChartCard
            key={metric.key}
            color={metric.color}
            title={metric.title}
            description={metric.description}
            rows={rows}
          />
        ))}
      </div>
    </section>
  );
}

function DynamicCalculationTable({
  rows,
  loading,
  error,
  sourceName,
}: {
  rows: RcaEpdCalculationRow[];
  loading: boolean;
  error: boolean;
  sourceName?: string;
}) {
  const columns = useMemo(() => Object.keys(rows[0] ?? {}), [rows]);
  const [sortKey, setSortKey] = useState("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState("");
  const activeSortKey =
    sortKey && columns.includes(sortKey) ? sortKey : columns[0] ?? "";

  const numericColumns = useMemo(
    () =>
      new Set(
        columns.filter((column) =>
          rows.some((row) => Number.isFinite(Number(row[column]))),
        ),
      ),
    [columns, rows],
  );
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const sortedRows = activeSortKey
      ? [...rows].sort((left, right) =>
          compareSortValue(
            left[activeSortKey],
            right[activeSortKey],
            sortDirection,
          ),
        )
      : [...rows];

    if (!keyword) return sortedRows;

    return sortedRows.filter((row) =>
      columns.some((column) =>
        String(row[column] ?? "")
          .toLowerCase()
          .includes(keyword),
      ),
    );
  }, [activeSortKey, columns, rows, search, sortDirection]);
  const displayedRows = filteredRows.slice(0, limit);

  function handleSort(key: string) {
    if (activeSortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            RCA-EPD Negara Detil
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Tabel detail mengikuti transformasi kalkulasi SIDE dari
            `tbhasil_rca_epd`, termasuk nilai ekspor, RCA tahunan, growth
            share, dan growth demand.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Menampilkan {displayedRows.length} dari {filteredRows.length} produk
            {sourceName ? ` / ${sourceName}` : ""}
          </p>
        </div>
        <TableControls
          search={search}
          onSearch={setSearch}
          limit={limit}
          onLimit={setLimit}
          searchPlaceholder="Cari semua kolom"
        />
      </div>

      {loading ? (
        <TableState text="Memuat data kalkulasi RCA-EPD..." />
      ) : error ? (
        <TableState text="Data kalkulasi gagal dimuat dari API." tone="error" />
      ) : (
        <div className="max-h-[430px] overflow-auto">
          <table className="min-w-[2400px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3">No</th>
                {columns.map((column) => (
                  <SortableHeader
                    key={column}
                    label={column}
                    align={numericColumns.has(column) ? "right" : "left"}
                    active={activeSortKey === column}
                    direction={sortDirection}
                    onClick={() => handleSort(column)}
                  />
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedRows.length ? (
                displayedRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="transition hover:bg-slate-50">
                    <td className="p-3">{rowIndex + 1}</td>
                    {columns.map((column) => (
                      <td
                        key={column}
                        className={`max-w-[320px] p-3 ${
                          numericColumns.has(column)
                            ? "text-right tabular-nums"
                            : ""
                        }`}
                      >
                        {formatCellValue(row[column])}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="p-6 text-center text-sm text-slate-500"
                    colSpan={columns.length + 1}
                  >
                    Data RCA-EPD Negara Detil belum tersedia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function TableControls({
  search,
  onSearch,
  limit,
  onLimit,
  searchPlaceholder,
}: {
  search: string;
  onSearch: (value: string) => void;
  limit: number;
  onLimit: (value: number) => void;
  searchPlaceholder: string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[minmax(180px,260px)_auto] sm:items-center">
      <input
        value={search}
        onChange={(event) => onSearch(event.target.value)}
        placeholder={searchPlaceholder}
        className="h-10 rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#384AA0] focus:bg-white focus:ring-1 focus:ring-[#384AA0]"
      />
      <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        Tampil
        <select
          value={limit}
          onChange={(event) => onLimit(Number(event.target.value))}
          className="h-10 rounded-md border border-slate-200 bg-slate-50 px-2 text-sm text-slate-900 outline-none focus:border-[#384AA0] focus:bg-white focus:ring-1 focus:ring-[#384AA0]"
        >
          {tableLimitOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  direction,
  onClick,
  align = "left",
}: {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th className={`p-3 font-semibold ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 ${
          align === "right" ? "justify-end" : "justify-start"
        }`}
      >
        {label}
        <span className="text-[10px] text-slate-400">
          {active ? (direction === "asc" ? "UP" : "DOWN") : ""}
        </span>
      </button>
    </th>
  );
}

function TableState({
  text,
  tone = "default",
}: {
  text: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={`px-4 py-8 text-center text-sm ${
        tone === "error" ? "text-rose-700" : "text-slate-500"
      }`}
    >
      {text}
    </div>
  );
}

function MetricBox({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "amber";
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 ${
        tone === "amber"
          ? "border-amber-200 bg-amber-50/60"
          : "border-slate-200"
      }`}
    >
      <div
        className={`font-semibold ${
          tone === "amber" ? "text-amber-700" : "text-slate-900"
        }`}
      >
        {value}
      </div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-2">
      <div className="font-semibold text-slate-700">{label}</div>
      <div>{value}</div>
    </div>
  );
}

function LegendPill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function EmptyChart({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
      Data RCA-EPD belum cukup untuk menampilkan {title}.
    </section>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3
      ? clean
          .split("")
          .map((char) => char + char)
          .join("")
      : clean;
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function formatCellValue(value: TableValue) {
  if (value == null || value === "") return "-";
  if (typeof value === "number") return value.toLocaleString("id-ID");
  return value;
}

type BubbleTooltipPoint = RcaEpdChartPoint & {
  x: number;
  y: number;
  z: number;
};

type BubbleTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: BubbleTooltipPoint;
  }>;
};

function BubbleTooltip({ active, payload }: BubbleTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) return null;

  return (
    <div className="max-w-[320px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <div className="font-semibold text-slate-900">{point.kode}</div>
      <div className="mt-1 line-clamp-2 text-slate-600">{point.komoditas}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniMetric label="Demand" value={formatNumber(point.avgGrowthDemand)} />
        <MiniMetric label="Share" value={formatNumber(point.avgGrowthShare)} />
        <MiniMetric label="AVG RCA" value={formatNumber(point.avgRca)} />
        <MiniMetric label="Kuadran" value={point.derivedQuadrant} />
      </div>
      <div className="mt-3 rounded-md bg-indigo-50 p-2 text-[#384AA0]">
        <div className="font-semibold">{point.kategoriEpd}</div>
        <div className="mt-0.5 text-slate-600">{point.xModel}</div>
      </div>
    </div>
  );
}

type StrategyTooltipPoint = RcaEpdChartPoint & {
  recommendation: string;
  recommendationReason: string;
  recommendationColor: string;
};

type StrategyTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: StrategyTooltipPoint;
  }>;
};

function StrategyTooltip({ active, payload }: StrategyTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) return null;

  return (
    <div className="max-w-[320px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <div className="font-semibold text-slate-900">{point.kode}</div>
      <div className="mt-1 line-clamp-2 text-slate-600">{point.komoditas}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <MiniMetric label="AVG RCA" value={formatNumber(point.avgRca)} />
        <MiniMetric label="Demand" value={formatNumber(point.avgGrowthDemand)} />
        <MiniMetric label="Kuadran EPD" value={point.derivedQuadrant} />
        <MiniMetric label="Kategori EPD" value={point.kategoriEpd} />
      </div>
      <div
        className="mt-3 rounded-md p-2"
        style={{
          backgroundColor: `${point.recommendationColor}14`,
          color: point.recommendationColor,
        }}
      >
        <div className="font-semibold">{point.recommendation}</div>
        <div className="mt-0.5 text-slate-600">{point.xModel}</div>
        <div className="mt-2 text-slate-600">{point.recommendationReason}</div>
      </div>
    </div>
  );
}

type RankingRow = {
  kode: string;
  label: string;
  fullLabel: string;
  value: number;
  kategoriEpd: string;
  xModel: string;
};

function RankingChartCard({
  color,
  title,
  description,
  rows,
}: {
  color: string;
  title: string;
  description: string;
  rows: RankingRow[];
}) {
  const xDomain = dynamicDomain(
    rows.map((row) => row.value),
    { includeZero: true, minimumPadding: 0.1, fallbackSpan: 1 },
  );

  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="mb-3">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <div className="mt-1 text-xs text-slate-500">{description}</div>
      </div>
      {rows.length ? (
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 8, right: 22, bottom: 8, left: 138 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                domain={xDomain}
                allowDataOverflow
                tickFormatter={formatCompactNumber}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="label"
                type="category"
                width={138}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11 }}
              />
              <ReferenceLine x={0} stroke="#0F172A" strokeOpacity={0.32} />
              <Tooltip content={<RankingTooltip />} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} minPointSize={4}>
                {rows.map((row) => (
                  <Cell key={row.kode} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
          Data untuk ranking ini belum tersedia.
        </div>
      )}
    </div>
  );
}

type RankingTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: RankingRow;
  }>;
};

function RankingTooltip({ active, payload }: RankingTooltipProps) {
  const row = payload?.[0]?.payload;

  if (!active || !row) return null;

  return (
    <div className="max-w-[300px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <div className="font-semibold text-slate-900">{row.kode}</div>
      <div className="mt-1 line-clamp-2 text-slate-600">{row.fullLabel}</div>
      <div className="mt-3 rounded-md bg-slate-50 p-2">
        <div className="font-semibold text-slate-700">
          {formatNumber(row.value)}
        </div>
        <div className="mt-1 text-slate-500">{row.kategoriEpd}</div>
        <div className="text-slate-500">{row.xModel}</div>
      </div>
    </div>
  );
}
