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
import type { SideFilterState } from "@/modules/side-analysis/types";
import {
  useRscaTbiAnalysis,
  useRscaTbiCalculation,
} from "@/services/analysis-queries";
import type {
  RscaTbiCalculationRow,
  RscaTbiPoint,
  RscaTbiRow,
} from "@/services/analysis-service";
import type { AnalysisFilters } from "@/services/query-keys";

type RscaTbiPanelProps = {
  filters: SideFilterState;
};

type TableMode = "country" | "detail";
type TableValue = string | number | null | undefined;
type Quadrant = "A" | "B" | "C" | "D";

type MovementPoint = {
  movementKey: string;
  kodeHs: string;
  namaProduk: string;
  rsca2019: number;
  tbi2019: number;
  pm2019: Quadrant;
  rsca2023: number;
  tbi2023: number;
  pm2023: Quadrant;
  movement: `${Quadrant}->${Quadrant}`;
  distance: number;
  plotRsca2019: number;
  plotTbi2019: number;
  plotRsca2023: number;
  plotTbi2023: number;
  color: string;
};

type MovementDot = MovementPoint & {
  year: "2019" | "2023";
  x: number;
  y: number;
  z: number;
};

const tableLimitOptions = [10, 25, 50, 100] as const;
const quadrants: Quadrant[] = ["A", "B", "C", "D"];
const topMovementLimit = 50;
const fullMovementRenderLimit = 600;
const shortArrowRenderLimit = 180;

const quadrantTone: Record<
  Quadrant,
  { bg: string; text: string; bar: string }
> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-700", bar: "#059669" },
  B: { bg: "bg-sky-50", text: "text-sky-700", bar: "#0284C7" },
  C: { bg: "bg-amber-50", text: "text-amber-700", bar: "#D97706" },
  D: { bg: "bg-rose-50", text: "text-rose-700", bar: "#BE123C" },
};

const transitionColorMap: Partial<Record<`${Quadrant}->${Quadrant}`, string>> =
  {
    "A->A": "#059669",
    "B->B": "#0284C7",
    "C->C": "#D97706",
    "D->D": "#64748B",
    "B->A": "#22C55E",
    "C->A": "#06B6D4",
    "D->A": "#14B8A6",
    "A->B": "#2563EB",
    "C->B": "#4F46E5",
    "D->B": "#7C3AED",
    "A->C": "#F59E0B",
    "B->C": "#EA580C",
    "D->C": "#A16207",
    "A->D": "#DC2626",
    "B->D": "#E11D48",
    "C->D": "#BE123C",
  };

function asQuadrant(value: string | null | undefined): Quadrant | null {
  const normalized = String(value ?? "").trim().toUpperCase();

  return quadrants.includes(normalized as Quadrant)
    ? (normalized as Quadrant)
    : null;
}

function asFiniteNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatNumber(value: number | null | undefined, digits = 5) {
  if (value == null || !Number.isFinite(value)) return "-";

  return value.toLocaleString("id-ID", {
    maximumFractionDigits: digits,
  });
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

function countryLabel(
  country?: { code: string | null; name: string | null } | null,
) {
  if (!country) return "-";
  return [country.code, country.name].filter(Boolean).join(" - ") || "-";
}

function fallbackRowsFromPoints(points: RscaTbiPoint[]): RscaTbiRow[] {
  return points.map((point) => ({
    kode: point.kode ?? String(point.record.kode_hs ?? point.record.hscode ?? ""),
    hs4: point.hs4 ?? String(point.record.hs4 ?? point.record.kode_hs ?? ""),
    nama: point.label,
    pm2019: String(point.record.pm_2019 ?? "") || null,
    pm2023: String(point.record.pm_2023 ?? "") || null,
    share2019: null,
    share2023: null,
    rsca2019: Number(point.record.rsca_2019 ?? point.rsca),
    rsca2023: point.rsca,
    tbi2019: Number(point.record.tbi_2019 ?? point.tbi),
    tbi2023: point.tbi,
  }));
}

function calculateMovementDistance(
  rsca2023: number,
  rsca2019: number,
  tbi2023: number,
  tbi2019: number,
) {
  return Math.sqrt((rsca2023 - rsca2019) ** 2 + (tbi2023 - tbi2019) ** 2);
}

function clampAxis(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function deterministicJitter(seed: string, salt: number) {
  let hash = 0;
  const source = `${seed}:${salt}`;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) % 9973;
  }

  return ((hash % 1000) / 1000 - 0.5) * 0.036;
}

function transitionColor(movement: `${Quadrant}->${Quadrant}`) {
  return transitionColorMap[movement] ?? "#384AA0";
}

function getShortArrowSegment(item: MovementPoint) {
  const deltaX = item.plotTbi2023 - item.plotTbi2019;
  const deltaY = item.plotRsca2023 - item.plotRsca2019;
  const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);

  if (length < 0.01) return null;

  const segmentLength = Math.min(length, 0.12);

  return [
    {
      x: item.plotTbi2023 - (deltaX / length) * segmentLength,
      y: item.plotRsca2023 - (deltaY / length) * segmentLength,
    },
    {
      x: item.plotTbi2023,
      y: item.plotRsca2023,
    },
  ] as const;
}

function buildMovements(rows: RscaTbiRow[]): MovementPoint[] {
  return rows
    .map((row, index) => {
      const pm2019 = asQuadrant(row.pm2019);
      const pm2023 = asQuadrant(row.pm2023);
      const rsca2019 = asFiniteNumber(row.rsca2019);
      const tbi2019 = asFiniteNumber(row.tbi2019);
      const rsca2023 = asFiniteNumber(row.rsca2023);
      const tbi2023 = asFiniteNumber(row.tbi2023);

      if (
        !pm2019 ||
        !pm2023 ||
        rsca2019 == null ||
        tbi2019 == null ||
        rsca2023 == null ||
        tbi2023 == null
      ) {
        return null;
      }

      const kodeHs = row.kode || row.hs4;
      const movement: `${Quadrant}->${Quadrant}` = `${pm2019}->${pm2023}`;
      const jitterX = deterministicJitter(kodeHs, 1);
      const jitterY = deterministicJitter(kodeHs, 2);

      return {
        movementKey: `${kodeHs}-${index}`,
        kodeHs,
        namaProduk: row.nama,
        rsca2019,
        tbi2019,
        pm2019,
        rsca2023,
        tbi2023,
        pm2023,
        movement,
        distance: calculateMovementDistance(rsca2023, rsca2019, tbi2023, tbi2019),
        plotRsca2019: clampAxis(rsca2019 + jitterX),
        plotTbi2019: clampAxis(tbi2019 + jitterY),
        plotRsca2023: clampAxis(rsca2023 + jitterX),
        plotTbi2023: clampAxis(tbi2023 + jitterY),
        color: transitionColor(movement),
      };
    })
    .filter((item): item is MovementPoint => item != null)
    .sort((left, right) => right.distance - left.distance);
}

export function RscaTbiPanel({ filters }: RscaTbiPanelProps) {
  const [tableMode, setTableMode] = useState<TableMode>("country");
  const apiFilters = useMemo<AnalysisFilters>(
    () => ({
      origin: filters.origin,
      dest: filters.dest,
      level: filters.level,
      limit: "ALL",
    }),
    [filters.dest, filters.level, filters.origin],
  );
  const query = useRscaTbiAnalysis(apiFilters);
  const calculationQuery = useRscaTbiCalculation(apiFilters);
  const data = query.data;
  const rows = useMemo(
    () =>
      data?.rows && data.rows.length > 0
        ? data.rows
        : fallbackRowsFromPoints(data?.scatter.points ?? []),
    [data],
  );
  const originLabel = data?.origin ? countryLabel(data.origin) : filters.origin;
  const destinationLabel = data?.destination
    ? countryLabel(data.destination)
    : filters.dest;

  return (
    <section className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Country Trade Analysis (RSCA & TBI)
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Asal: {originLabel} -&gt; Tujuan: {destinationLabel}. Modul ini
              mengikuti SIDE untuk membaca posisi produk dari RSCA, TBI, dan
              perpindahan kuadran PM 2019 ke 2023.
            </p>
          </div>
          <span className="inline-flex rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {query.isLoading
              ? "Loading API"
              : query.isError
                ? "API error"
                : "Live porto_side"}
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Quadrant Insight
        </p>
        <p className="mt-3 max-w-5xl text-base leading-7 text-slate-700">
          {data?.insight ??
            "RSCA-TBI membaca daya saing dan neraca perdagangan produk untuk memetakan posisi kompetitif serta arah pergerakan kuadrannya."}
        </p>
      </div>

      {data ? (
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
          {data.quadrants.slice(0, 4).map((quadrant) => (
            <article key={quadrant.key} className="bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {quadrant.count} produk
              </p>
              <h4 className="mt-3 text-base font-semibold text-slate-950">
                {quadrant.label}
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {quadrant.description}
              </p>
            </article>
          ))}
        </div>
      ) : null}

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
            RSCA-TBI Negara
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
            RSCA-TBI Negara Detil
          </button>
        </div>
      </div>

      {tableMode === "country" ? (
        <>
          <RscaSummaryTable
            rows={rows}
            loading={query.isLoading}
            error={query.isError}
            sourceName={data?.sourceName ?? data?.source}
          />
          {!query.isLoading && !query.isError ? (
            <>
              <QuadrantMovementChart rows={rows} />
              <MovementTrajectoryChart rows={rows} />
            </>
          ) : null}
        </>
      ) : (
        <RscaCalculationTable
          rows={calculationQuery.data?.rows ?? []}
          loading={calculationQuery.isLoading}
          error={calculationQuery.isError}
          sourceName={calculationQuery.data?.source_name ?? "porto_side"}
        />
      )}
    </section>
  );
}

function RscaSummaryTable({
  rows,
  loading,
  error,
  sourceName,
}: {
  rows: RscaTbiRow[];
  loading: boolean;
  error: boolean;
  sourceName?: string;
}) {
  const [sortKey, setSortKey] = useState<keyof RscaTbiRow>("rsca2023");
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
      [item.kode, item.hs4, item.nama, item.pm2019, item.pm2023]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(keyword)),
    );
  }, [rows, search, sortDirection, sortKey]);
  const displayedRows = filteredRows.slice(0, limit);

  function handleSort(key: keyof RscaTbiRow) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <TableHeader
        title="RSCA-TBI Negara"
        description="Tabel mengikuti SIDE: HS Code, produk, RSCA 2019/2023, TBI 2019/2023, share, dan kuadran PM."
        count={displayedRows.length}
        total={filteredRows.length}
        sourceName={sourceName}
        search={search}
        onSearch={setSearch}
        limit={limit}
        onLimit={setLimit}
      />
      {loading ? (
        <TableState text="Memuat data RSCA-TBI..." />
      ) : error ? (
        <TableState text="Data RSCA-TBI gagal dimuat dari API." tone="error" />
      ) : (
        <div className="max-h-[430px] overflow-auto">
          <table className="min-w-[1400px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3">No</th>
                <SortableHeader
                  label="HS Code"
                  active={sortKey === "kode"}
                  direction={sortDirection}
                  onClick={() => handleSort("kode")}
                />
                <SortableHeader
                  label="Produk"
                  active={sortKey === "nama"}
                  direction={sortDirection}
                  onClick={() => handleSort("nama")}
                />
                <SortableHeader
                  align="right"
                  label="RSCA 2019"
                  active={sortKey === "rsca2019"}
                  direction={sortDirection}
                  onClick={() => handleSort("rsca2019")}
                />
                <SortableHeader
                  align="right"
                  label="RSCA 2023"
                  active={sortKey === "rsca2023"}
                  direction={sortDirection}
                  onClick={() => handleSort("rsca2023")}
                />
                <SortableHeader
                  align="right"
                  label="TBI 2019"
                  active={sortKey === "tbi2019"}
                  direction={sortDirection}
                  onClick={() => handleSort("tbi2019")}
                />
                <SortableHeader
                  align="right"
                  label="TBI 2023"
                  active={sortKey === "tbi2023"}
                  direction={sortDirection}
                  onClick={() => handleSort("tbi2023")}
                />
                <SortableHeader
                  align="right"
                  label="Share 2019"
                  active={sortKey === "share2019"}
                  direction={sortDirection}
                  onClick={() => handleSort("share2019")}
                />
                <SortableHeader
                  align="right"
                  label="Share 2023"
                  active={sortKey === "share2023"}
                  direction={sortDirection}
                  onClick={() => handleSort("share2023")}
                />
                <SortableHeader
                  label="PM 2019"
                  active={sortKey === "pm2019"}
                  direction={sortDirection}
                  onClick={() => handleSort("pm2019")}
                />
                <SortableHeader
                  label="PM 2023"
                  active={sortKey === "pm2023"}
                  direction={sortDirection}
                  onClick={() => handleSort("pm2023")}
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
                    <td className="p-3 font-semibold text-slate-900">
                      {item.kode || item.hs4}
                    </td>
                    <td className="max-w-[320px] p-3 text-slate-700">
                      {item.nama}
                    </td>
                    <MetricCell value={item.rsca2019} />
                    <MetricCell value={item.rsca2023} strong />
                    <MetricCell value={item.tbi2019} />
                    <MetricCell value={item.tbi2023} strong />
                    <MetricCell value={item.share2019} digits={2} />
                    <MetricCell value={item.share2023} digits={2} />
                    <td className="p-3 text-slate-600">{item.pm2019 ?? "-"}</td>
                    <td className="p-3 text-slate-600">{item.pm2023 ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={11}>
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

function QuadrantMovementChart({ rows }: { rows: RscaTbiRow[] }) {
  const movements = useMemo(() => buildMovements(rows), [rows]);
  const matrix = useMemo(
    () =>
      quadrants.flatMap((from) =>
        quadrants.map((to) => ({
          from,
          to,
          count: movements.filter(
            (movement) => movement.pm2019 === from && movement.pm2023 === to,
          ).length,
        })),
      ),
    [movements],
  );
  const maxCount = Math.max(...matrix.map((item) => item.count), 1);
  const changedCount = movements.filter((item) => item.pm2019 !== item.pm2023).length;
  const stableCount = movements.length - changedCount;
  const destinationSummary = quadrants.map((quadrant) => ({
    quadrant,
    count: movements.filter((item) => item.pm2023 === quadrant).length,
  }));
  const topMovements = movements
    .filter((item) => item.pm2019 !== item.pm2023)
    .slice(0, 8);

  if (!movements.length) {
    return <EmptyChart title="Pergerakan Kuadran PM 2019 - 2023" />;
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Pergerakan Kuadran PM 2019 - 2023
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Ringkasan perpindahan produk antar kuadran A, B, C, dan D
            berdasarkan PM 2019 dan PM 2023.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <MetricBox label="Produk" value={movements.length} />
          <MetricBox label="Bergerak" value={changedCount} />
          <MetricBox label="Tetap" value={stableCount} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-3 text-xs font-semibold uppercase text-slate-500">
            Matrix Pergerakan
          </div>
          <div className="grid grid-cols-[72px_repeat(4,minmax(72px,1fr))] gap-2 text-xs">
            <div />
            {quadrants.map((to) => (
              <div
                key={to}
                className="rounded-md bg-slate-100 px-2 py-1 text-center font-semibold text-slate-600"
              >
                Ke {to}
              </div>
            ))}
            {quadrants.map((from) => (
              <div key={from} className="contents">
                <div className="flex items-center justify-end pr-1 font-semibold text-slate-600">
                  Dari {from}
                </div>
                {quadrants.map((to) => {
                  const count =
                    matrix.find((item) => item.from === from && item.to === to)
                      ?.count ?? 0;
                  const intensity = Math.max(0.12, count / maxCount);

                  return (
                    <div
                      key={`${from}-${to}`}
                      className={`rounded-lg border px-2 py-3 text-center ${
                        from === to
                          ? "border-slate-300 bg-slate-50"
                          : "border-indigo-100 bg-indigo-50"
                      }`}
                      style={{
                        opacity: count ? 0.45 + intensity * 0.55 : 0.55,
                      }}
                    >
                      <div className="text-lg font-bold tabular-nums text-slate-900">
                        {count}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {from} -&gt; {to}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-3 text-xs font-semibold uppercase text-slate-500">
            Komposisi Kuadran 2023
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={destinationSummary}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="quadrant" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {destinationSummary.map((entry) => (
                    <Cell
                      key={entry.quadrant}
                      fill={quadrantTone[entry.quadrant].bar}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <div className="mb-3 text-xs font-semibold uppercase text-slate-500">
          Produk yang Berpindah Kuadran
        </div>
        {topMovements.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {topMovements.map((item) => (
              <div key={item.movementKey} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    {item.kodeHs}
                  </span>
                  <QuadrantBadge quadrant={item.pm2019} />
                  <span className="text-xs text-slate-400">-&gt;</span>
                  <QuadrantBadge quadrant={item.pm2023} />
                </div>
                <div className="mt-2 line-clamp-2 text-sm font-medium text-slate-800">
                  {item.namaProduk}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                  <div>
                    RSCA: {formatNumber(item.rsca2019)} -&gt;{" "}
                    {formatNumber(item.rsca2023)}
                  </div>
                  <div>
                    TBI: {formatNumber(item.tbi2019)} -&gt;{" "}
                    {formatNumber(item.tbi2023)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
            Tidak ada produk yang berpindah kuadran pada data yang ditampilkan.
          </div>
        )}
      </div>
    </section>
  );
}

function MovementTrajectoryChart({ rows }: { rows: RscaTbiRow[] }) {
  const [showMovedOnly, setShowMovedOnly] = useState(false);
  const [showTopOnly, setShowTopOnly] = useState(true);
  const [transitionFilter, setTransitionFilter] = useState("ALL");
  const [hoveredMovementKey, setHoveredMovementKey] = useState<string | null>(
    null,
  );
  const movements = useMemo(() => buildMovements(rows), [rows]);
  const transitionOptions = useMemo(
    () => Array.from(new Set(movements.map((item) => item.movement))).sort(),
    [movements],
  );
  const filteredMovements = useMemo(
    () =>
      movements.filter((item) => {
      if (showMovedOnly && item.pm2019 === item.pm2023) return false;
      if (transitionFilter !== "ALL" && item.movement !== transitionFilter) {
        return false;
      }
      return true;
      }),
    [movements, showMovedOnly, transitionFilter],
  );
  const visibleMovements = useMemo(
    () =>
      filteredMovements.slice(
        0,
        showTopOnly ? topMovementLimit : fullMovementRenderLimit,
      ),
    [filteredMovements, showTopOnly],
  );
  const isRenderLimited = visibleMovements.length < filteredMovements.length;
  const startPoints = visibleMovements.map<MovementDot>((item) => ({
    ...item,
    year: "2019",
    x: item.plotTbi2019,
    y: item.plotRsca2019,
    z: 26,
  }));
  const endPoints = visibleMovements.map<MovementDot>((item) => ({
    ...item,
    year: "2023",
    x: item.plotTbi2023,
    y: item.plotRsca2023,
    z: 78,
  }));
  const shortArrowMovements = visibleMovements
    .map((item) => ({ item, segment: getShortArrowSegment(item) }))
    .filter(
      (
        entry,
      ): entry is {
        item: MovementPoint;
        segment: NonNullable<ReturnType<typeof getShortArrowSegment>>;
      } => entry.segment != null,
    );
  const renderedShortArrowMovements = shortArrowMovements.slice(
    0,
    showTopOnly ? topMovementLimit : shortArrowRenderLimit,
  );
  const hoveredMovement =
    visibleMovements.find((item) => item.movementKey === hoveredMovementKey) ??
    null;

  function handleDotMouseEnter(point: DotEventPoint) {
    setHoveredMovementKey(point.payload?.movementKey ?? null);
  }

  function handleDotMouseLeave() {
    setHoveredMovementKey(null);
  }

  if (!movements.length) {
    return <EmptyChart title="Movement Trajectory RSCA - TBI" />;
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            Movement Trajectory RSCA - TBI
          </h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Peta before-after dari posisi produk pada 2019 ke 2023. Titik abu
            adalah posisi awal, titik berwarna posisi akhir. Sumbu X memakai
            TBI, sedangkan sumbu Y memakai RSCA.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
            <input
              type="checkbox"
              checked={showMovedOnly}
              onChange={(event) => setShowMovedOnly(event.target.checked)}
            />
            Hanya berpindah
          </label>
          <label className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
            <input
              type="checkbox"
              checked={showTopOnly}
              onChange={(event) => setShowTopOnly(event.target.checked)}
            />
            Top 50
          </label>
          <select
            value={transitionFilter}
            onChange={(event) => setTransitionFilter(event.target.value)}
            className="rounded-md border border-slate-200 bg-white px-3 py-2"
          >
            <option value="ALL">Semua transisi</option>
            {transitionOptions.map((transition) => (
              <option key={transition} value={transition}>
                {transition}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 text-xs sm:grid-cols-3">
        <MetricBox label="Ditampilkan" value={visibleMovements.length} />
        <MetricBox label="Tersaring" value={filteredMovements.length} />
        <MetricBox label="Jenis transisi" value={transitionOptions.length} />
      </div>
      {isRenderLimited ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          Chart menampilkan {visibleMovements.length} movement terjauh dari{" "}
          {filteredMovements.length} hasil filter agar interaksi tetap ringan.
          Data lengkap tetap tersedia di tabel.
        </div>
      ) : null}

      <ScatterLegend />

      <div className="relative h-[520px] rounded-lg border border-slate-200 p-3">
        <QuadrantOverlay />
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 18, right: 26, bottom: 28, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              domain={[-1, 1]}
              tickLine={false}
              axisLine={false}
              label={{ value: "TBI", position: "insideBottom", offset: -12 }}
            />
            <YAxis
              dataKey="y"
              type="number"
              domain={[-1, 1]}
              tickLine={false}
              axisLine={false}
              label={{ value: "RSCA", angle: -90, position: "insideLeft" }}
            />
            <ZAxis dataKey="z" range={[28, 90]} />
            <ReferenceLine x={0} stroke="#0F172A" strokeOpacity={0.45} />
            <ReferenceLine y={0} stroke="#0F172A" strokeOpacity={0.45} />
            {renderedShortArrowMovements.map(({ item, segment }, index) => (
              <ReferenceLine
                key={`${item.movementKey}-short-${index}`}
                segment={segment}
                stroke={item.color}
                strokeWidth={1.4}
                strokeOpacity={item.pm2019 === item.pm2023 ? 0.35 : 0.78}
                ifOverflow="visible"
                shape={<MovementArrowLine />}
              />
            ))}
            {hoveredMovement ? (
              <ReferenceLine
                segment={[
                  {
                    x: hoveredMovement.plotTbi2019,
                    y: hoveredMovement.plotRsca2019,
                  },
                  {
                    x: hoveredMovement.plotTbi2023,
                    y: hoveredMovement.plotRsca2023,
                  },
                ]}
                stroke={hoveredMovement.color}
                strokeWidth={2.2}
                strokeOpacity={0.96}
                ifOverflow="visible"
                shape={<MovementArrowLine />}
              />
            ) : null}
            <Tooltip content={<MovementTooltip />} />
            <Scatter
              name="2019"
              data={startPoints}
              fill="#94A3B8"
              fillOpacity={0.36}
              stroke="#64748B"
              strokeOpacity={0.4}
              onMouseEnter={handleDotMouseEnter}
              onMouseLeave={handleDotMouseLeave}
            />
            <Scatter
              name="2023"
              data={endPoints}
              fill="#384AA0"
              onMouseEnter={handleDotMouseEnter}
              onMouseLeave={handleDotMouseLeave}
            >
              {endPoints.map((entry) => (
                <Cell key={`${entry.kodeHs}-${entry.movement}`} fill={entry.color} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function RscaCalculationTable({
  rows,
  loading,
  error,
  sourceName,
}: {
  rows: RscaTbiCalculationRow[];
  loading: boolean;
  error: boolean;
  sourceName?: string;
}) {
  const [sortKey, setSortKey] =
    useState<keyof RscaTbiCalculationRow>("rsca2023");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState<number>(10);
  const [search, setSearch] = useState("");
  const metricHeaders: Array<
    [keyof RscaTbiCalculationRow, string, "integer" | "decimal"]
  > = [
    ["nilai2019", "Nilai 2019", "integer"],
    ["nilai2023", "Nilai 2023", "integer"],
    ["dunia2019", "Dunia 2019", "integer"],
    ["dunia2023", "Dunia 2023", "integer"],
    ["rca2019", "RCA 2019", "decimal"],
    ["rca2023", "RCA 2023", "decimal"],
    ["rsca2019", "RSCA 2019", "decimal"],
    ["rsca2023", "RSCA 2023", "decimal"],
    ["tbi2019", "TBI 2019", "decimal"],
    ["tbi2023", "TBI 2023", "decimal"],
    ["groupRsca2019", "Group RSCA 2019", "decimal"],
    ["groupRsca2023", "Group RSCA 2023", "decimal"],
    ["groupTbi2019", "Group TBI 2019", "decimal"],
    ["groupTbi2023", "Group TBI 2023", "decimal"],
  ];
  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const sortedRows = [...rows].sort((left, right) =>
      compareSortValue(left[sortKey], right[sortKey], sortDirection),
    );

    if (!keyword) return sortedRows;

    return sortedRows.filter((item) =>
      [item.kode, item.hs4, item.nama, item.pm2019, item.pm2023]
        .map((value) => String(value ?? "").toLowerCase())
        .some((value) => value.includes(keyword)),
    );
  }, [rows, search, sortDirection, sortKey]);
  const displayedRows = filteredRows.slice(0, limit);

  function handleSort(key: keyof RscaTbiCalculationRow) {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  }

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <TableHeader
        title="RSCA-TBI Negara Detil"
        description="Tabel detail mengikuti kalkulasi SIDE: nilai ekspor, nilai dunia, RCA, RSCA, TBI, Group RSCA, Group TBI, dan PM."
        count={displayedRows.length}
        total={filteredRows.length}
        sourceName={sourceName}
        search={search}
        onSearch={setSearch}
        limit={limit}
        onLimit={setLimit}
      />
      {loading ? (
        <TableState text="Memuat data kalkulasi RSCA-TBI..." />
      ) : error ? (
        <TableState text="Data kalkulasi gagal dimuat dari API." tone="error" />
      ) : (
        <div className="max-h-[430px] overflow-auto">
          <table className="min-w-[2200px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="p-3">No</th>
                <SortableHeader
                  label="HS"
                  active={sortKey === "kode"}
                  direction={sortDirection}
                  onClick={() => handleSort("kode")}
                />
                <SortableHeader
                  label="Produk"
                  active={sortKey === "nama"}
                  direction={sortDirection}
                  onClick={() => handleSort("nama")}
                />
                {metricHeaders.map(([key, label]) => (
                  <SortableHeader
                    key={key}
                    align="right"
                    label={label}
                    active={sortKey === key}
                    direction={sortDirection}
                    onClick={() => handleSort(key)}
                  />
                ))}
                <SortableHeader
                  label="PM 2019"
                  active={sortKey === "pm2019"}
                  direction={sortDirection}
                  onClick={() => handleSort("pm2019")}
                />
                <SortableHeader
                  label="PM 2023"
                  active={sortKey === "pm2023"}
                  direction={sortDirection}
                  onClick={() => handleSort("pm2023")}
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
                    <td className="p-3 font-semibold text-slate-900">
                      {item.kode || item.hs4}
                    </td>
                    <td className="max-w-[320px] p-3 text-slate-700">
                      {item.nama}
                    </td>
                    {metricHeaders.map(([key, , type]) => (
                      <MetricCell
                        key={key}
                        value={item[key] as number | null}
                        digits={type === "integer" ? 0 : 5}
                      />
                    ))}
                    <td className="p-3 text-slate-600">{item.pm2019 ?? "-"}</td>
                    <td className="p-3 text-slate-600">{item.pm2023 ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-6 text-center text-slate-500" colSpan={19}>
                    Data perhitungan RSCA-TBI belum tersedia.
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

function TableHeader({
  title,
  description,
  count,
  total,
  sourceName,
  search,
  onSearch,
  limit,
  onLimit,
}: {
  title: string;
  description: string;
  count: number;
  total: number;
  sourceName?: string;
  search: string;
  onSearch: (value: string) => void;
  limit: number;
  onLimit: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Menampilkan {count} dari {total} produk
          {sourceName ? ` / ${sourceName}` : ""}
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[minmax(180px,260px)_auto] sm:items-center">
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Cari HSCode / produk"
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

function MetricCell({
  value,
  strong = false,
  digits = 5,
}: {
  value: number | null | undefined;
  strong?: boolean;
  digits?: number;
}) {
  return (
    <td
      className={`p-3 text-right tabular-nums ${
        strong ? "font-semibold text-slate-900" : "text-slate-600"
      }`}
    >
      {formatNumber(value, digits)}
    </td>
  );
}

function MetricBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 px-3 py-2">
      <div className="font-semibold text-slate-900">{value}</div>
      <div className="text-slate-500">{label}</div>
    </div>
  );
}

function QuadrantBadge({ quadrant }: { quadrant: Quadrant }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${quadrantTone[quadrant].bg} ${quadrantTone[quadrant].text}`}
    >
      {quadrant}
    </span>
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

function EmptyChart({ title }: { title: string }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
      Data RSCA-TBI belum cukup untuk menampilkan {title}.
    </section>
  );
}

function QuadrantOverlay() {
  return (
    <div className="pointer-events-none absolute inset-x-8 inset-y-6 z-0 grid select-none grid-cols-2 grid-rows-2 text-[42px] font-semibold text-slate-300/35 md:text-[54px]">
      <div className="flex items-center justify-center">B</div>
      <div className="flex items-center justify-center">A</div>
      <div className="flex items-center justify-center">D</div>
      <div className="flex items-center justify-center">C</div>
    </div>
  );
}

function ScatterLegend() {
  const stableMovementColors = [
    { label: "A -> A", color: "#059669" },
    { label: "B -> B", color: "#0284C7" },
    { label: "C -> C", color: "#D97706" },
    { label: "D -> D", color: "#64748B" },
  ];
  const transitionSamples = [
    { label: "B -> A", color: "#22C55E" },
    { label: "A -> D", color: "#DC2626" },
    { label: "C -> A", color: "#06B6D4" },
  ];

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <div className="text-xs font-semibold uppercase text-slate-500">
        Panduan scatter
      </div>
      <div className="mt-3 grid gap-3 text-xs md:grid-cols-2 xl:grid-cols-5">
        <LegendCard color="#94A3B8" title="Titik 2019" text="Posisi awal produk." />
        <LegendCard
          color="#384AA0"
          title="Titik 2023"
          text="Posisi akhir produk, warna mengikuti movement PM."
        />
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <span className="relative inline-flex h-3 w-8 items-center">
              <span className="h-px w-7 bg-slate-500" />
              <span className="-ml-1 h-0 w-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-slate-500" />
            </span>
            Panah pendek
          </div>
          <p className="mt-1 text-slate-500">
            Arah ringkas; hover titik untuk garis penuh.
          </p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <div className="font-semibold text-slate-700">Kuadran</div>
          <p className="mt-1 text-slate-500">B | A di atas, D | C di bawah.</p>
        </div>
        <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
          <div className="font-semibold text-slate-700">Garis tengah</div>
          <p className="mt-1 text-slate-500">
            Pembatas TBI = 0 dan RSCA = 0.
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 text-xs xl:grid-cols-2">
        <LegendPills title="Warna saat tetap di kuadran" items={stableMovementColors} />
        <LegendPills title="Warna saat berpindah kuadran" items={transitionSamples} />
      </div>
    </div>
  );
}

function LegendCard({
  color,
  title,
  text,
}: {
  color: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2 font-semibold text-slate-700">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
        {title}
      </div>
      <p className="mt-1 text-slate-500">{text}</p>
    </div>
  );
}

function LegendPills({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; color: string }>;
}) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2">
      <div className="font-semibold text-slate-700">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

type MovementTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload?: MovementDot;
  }>;
};

type DotEventPoint = {
  payload?: MovementDot;
};

type MovementArrowLineProps = {
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  stroke?: string;
  strokeOpacity?: number | string;
  strokeWidth?: number | string;
  className?: string;
  clipPath?: string;
};

function toFinitePixel(value: number | string | undefined) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function MovementArrowLine({
  x1,
  y1,
  x2,
  y2,
  stroke = "#384AA0",
  strokeOpacity = 0.72,
  strokeWidth = 1.4,
  className,
  clipPath,
}: MovementArrowLineProps) {
  const startX = toFinitePixel(x1);
  const startY = toFinitePixel(y1);
  const endX = toFinitePixel(x2);
  const endY = toFinitePixel(y2);

  if (startX == null || startY == null || endX == null || endY == null) {
    return <g />;
  }

  const deltaX = endX - startX;
  const deltaY = endY - startY;
  const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);

  if (length < 2) {
    return (
      <g className={className} clipPath={clipPath}>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={stroke}
          strokeOpacity={strokeOpacity}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  }

  const angle = Math.atan2(deltaY, deltaX);
  const arrowSize = 7;
  const arrowSpread = Math.PI / 7;
  const arrowX1 = endX - arrowSize * Math.cos(angle - arrowSpread);
  const arrowY1 = endY - arrowSize * Math.sin(angle - arrowSpread);
  const arrowX2 = endX - arrowSize * Math.cos(angle + arrowSpread);
  const arrowY2 = endY - arrowSize * Math.sin(angle + arrowSpread);
  const lineEndX = endX - 3 * Math.cos(angle);
  const lineEndY = endY - 3 * Math.sin(angle);

  return (
    <g className={className} clipPath={clipPath}>
      <line
        x1={startX}
        y1={startY}
        x2={lineEndX}
        y2={lineEndY}
        stroke={stroke}
        strokeOpacity={strokeOpacity}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M${endX},${endY} L${arrowX1},${arrowY1} L${arrowX2},${arrowY2} Z`}
        fill={stroke}
        fillOpacity={strokeOpacity}
      />
    </g>
  );
}

function MovementTooltip({ active, payload }: MovementTooltipProps) {
  const point = payload?.[0]?.payload;

  if (!active || !point) return null;

  return (
    <div className="max-w-[320px] rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <div className="font-semibold text-slate-900">{point.kodeHs}</div>
      <div className="mt-1 line-clamp-2 text-slate-600">{point.namaProduk}</div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-md bg-slate-50 p-2">
          <div className="font-semibold text-slate-700">2019</div>
          <div>RSCA: {formatNumber(point.rsca2019)}</div>
          <div>TBI: {formatNumber(point.tbi2019)}</div>
          <div>PM: {point.pm2019}</div>
        </div>
        <div className="rounded-md bg-slate-50 p-2">
          <div className="font-semibold text-slate-700">2023</div>
          <div>RSCA: {formatNumber(point.rsca2023)}</div>
          <div>TBI: {formatNumber(point.tbi2023)}</div>
          <div>PM: {point.pm2023}</div>
        </div>
      </div>
      <div className="mt-3 rounded-md bg-indigo-50 p-2 font-semibold text-[#384AA0]">
        Movement: {point.movement} | Distance: {formatNumber(point.distance)}
      </div>
    </div>
  );
}
