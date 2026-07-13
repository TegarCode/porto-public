"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdventureWorksDashboard } from "@/services/pentaho-queries";
import type {
  PentahoCountryYearMetric,
  PentahoProductCategoryMonthlyMetric,
  PentahoSalesReasonMetric,
  PentahoYearRegionMetric,
} from "@/services/pentaho-service";

type ChartPoint = Record<string, number | string>;

const seriesColors = ["#0f766e", "#b45309", "#be123c", "#2563eb", "#0891b2", "#4b5563"];

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});

const fullCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

function formatCompactCurrency(value: number) {
  return compactCurrency.format(value);
}

function formatFullCurrency(value: number) {
  return fullCurrency.format(value);
}

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function pivotYearRegion(
  rows: PentahoYearRegionMetric[],
  valueKey: "subtotal" | "freight",
) {
  const keys = Array.from(new Set(rows.map((row) => row.region)));
  const byYear = new Map<number, ChartPoint>();

  rows.forEach((row) => {
    const entry = byYear.get(row.year) ?? { year: row.year };
    entry[row.region] = Number(row[valueKey] ?? 0);
    byYear.set(row.year, entry);
  });

  return {
    keys,
    data: Array.from(byYear.values()).sort(
      (left, right) => Number(left.year) - Number(right.year),
    ),
  };
}

function pivotCountryTransactions(rows: PentahoCountryYearMetric[]) {
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    totals.set(row.country, (totals.get(row.country) ?? 0) + row.transactions);
  });

  const keys = Array.from(totals.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 6)
    .map(([country]) => country);
  const byYear = new Map<number, ChartPoint>();

  rows
    .filter((row) => keys.includes(row.country))
    .forEach((row) => {
      const entry = byYear.get(row.year) ?? { year: row.year };
      entry[row.country] = row.transactions;
      byYear.set(row.year, entry);
    });

  return {
    keys,
    data: Array.from(byYear.values()).sort(
      (left, right) => Number(left.year) - Number(right.year),
    ),
  };
}

function pivotSalesReasons(rows: PentahoSalesReasonMetric[]) {
  const totals = new Map<string, number>();

  rows.forEach((row) => {
    totals.set(row.reason, (totals.get(row.reason) ?? 0) + row.total_sales);
  });

  const keys = Array.from(totals.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([reason]) => reason);
  const byYear = new Map<number, ChartPoint>();

  rows
    .filter((row) => keys.includes(row.reason))
    .forEach((row) => {
      const entry = byYear.get(row.year) ?? { year: row.year };
      entry[row.reason] = row.total_sales;
      byYear.set(row.year, entry);
    });

  return {
    keys,
    data: Array.from(byYear.values()).sort(
      (left, right) => Number(left.year) - Number(right.year),
    ),
  };
}

function pivotMonthlyCategory(rows: PentahoProductCategoryMonthlyMetric[]) {
  const keys = Array.from(new Set(rows.map((row) => row.category)));
  const byMonth = new Map<number, ChartPoint>();

  rows.forEach((row) => {
    const entry = byMonth.get(row.month) ?? { month: row.month };
    entry[row.category] = row.share;
    byMonth.set(row.month, entry);
  });

  return {
    keys,
    data: Array.from(byMonth.values()).sort(
      (left, right) => Number(left.month) - Number(right.month),
    ),
  };
}

export function PentahoDashboardView() {
  const dashboardQuery = useAdventureWorksDashboard();
  const dashboard = dashboardQuery.data;

  const yearlySales = useMemo(
    () =>
      pivotYearRegion(
        dashboard?.charts.yearly_sales_by_region ?? [],
        "subtotal",
      ),
    [dashboard],
  );

  const yearlyFreight = useMemo(
    () =>
      pivotYearRegion(
        dashboard?.charts.yearly_freight_by_region ?? [],
        "freight",
      ),
    [dashboard],
  );

  const countryTransactions = useMemo(
    () =>
      pivotCountryTransactions(
        dashboard?.charts.transactions_by_country_year ?? [],
      ),
    [dashboard],
  );

  const salesReasons = useMemo(
    () => pivotSalesReasons(dashboard?.charts.sales_reason_by_year ?? []),
    [dashboard],
  );

  const monthlyCategoryShare = useMemo(
    () =>
      pivotMonthlyCategory(
        dashboard?.charts.product_category_monthly_share ?? [],
      ),
    [dashboard],
  );

  if (dashboardQuery.isLoading) {
    return (
      <main className="min-h-screen bg-background px-6 pb-16 pt-28 text-ink md:px-10 lg:px-14">
        <section className="mx-auto max-w-7xl border-y border-ink/15 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
            AdventureWorks ETL
          </p>
          <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
            Loading warehouse story.
          </h1>
          <div className="mt-8 h-1.5 max-w-xl overflow-hidden bg-ink/10">
            <div className="h-full w-2/3 animate-pulse bg-ink" />
          </div>
        </section>
      </main>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <main className="min-h-screen bg-background px-6 pb-16 pt-28 text-ink md:px-10 lg:px-14">
        <section className="mx-auto max-w-7xl border-y border-rose/35 bg-paper p-8">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.18em] text-muted transition hover:text-ink"
          >
            Back to portfolio
          </Link>
          <h1 className="mt-6 text-4xl font-semibold">Data belum terbaca.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            Endpoint Pentaho belum mengembalikan payload. Pastikan backend
            Laravel berjalan dan database `porto_side` berisi tabel
            AdventureWorks.
          </p>
        </section>
      </main>
    );
  }

  const summary = dashboard.summary;
  const topRegion = dashboard.charts.sales_by_region[0];
  const topCategory = dashboard.charts.product_category_share[0];

  return (
    <main className="min-h-screen bg-background text-ink">
      <section className="border-b border-ink/15 pt-24">
        <div className="mx-auto max-w-7xl px-6 pb-12 md:px-10 lg:px-14">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.18em] text-muted transition hover:text-ink"
          >
            Back to portfolio
          </Link>

          <div className="mt-8 grid grid-cols-1 gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                Pentaho Dashboard
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight md:text-6xl">
                AdventureWorks sales warehouse, rewritten as a portfolio story.
              </h1>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-muted">
              Dashboard ini mengambil struktur Pentaho lama, memindahkan tabel
              yang dibutuhkan ke `porto_side`, lalu menampilkan hasilnya sebagai
              alur Problem, Data, dan Insight agar pembacaan BI tidak berhenti
              di angka mentah.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-px bg-ink/15 lg:grid-cols-4">
            <MetricBlock label="Total sales" value={formatCompactCurrency(summary.total_sales)} />
            <MetricBlock label="Total freight" value={formatCompactCurrency(summary.total_freight)} />
            <MetricBlock label="Period" value={`${summary.min_year}-${summary.max_year}`} />
            <MetricBlock label="Fact rows" value={formatNumber(summary.fact_rows)} />
          </div>
        </div>
      </section>

      <section className="border-b border-ink/15 bg-paper">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-px bg-ink/15 px-6 py-16 md:grid-cols-3 md:px-10 lg:px-14">
          <StoryBlock
            label="Problem"
            title="Penjualan tersebar di banyak dimensi."
            copy="AdventureWorks menyimpan transaksi, produk, wilayah, waktu, dan alasan pembelian secara terpisah. Tanpa dashboard, pola wilayah dan kategori produk sulit dibaca cepat."
          />
          <StoryBlock
            label="Data"
            title="Lima tabel dibaca sebagai warehouse ringkas."
            copy={`${dashboard.source_tables.join(", ")} dipakai sebagai sumber utama. Semua tabel kini berada di database ${dashboard.source}, bukan dipanggil dari aplikasi Pentaho.`}
          />
          <StoryBlock
            label="Insight"
            title="Region dan kategori dominan menjadi pintu narasi."
            copy={dashboard.insight}
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-8 px-6 py-16 md:px-10 lg:px-14">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[0.94fr_1.06fr]">
          <ChartPanel
            eyebrow="Data"
            title="Sales by region"
            copy={`Region terbesar adalah ${topRegion?.region ?? "unknown"}, sehingga performa wilayah menjadi pembuka cerita sebelum membaca detail kategori produk.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.charts.sales_by_region}
                margin={{ top: 18, right: 18, bottom: 18, left: 0 }}
              >
                <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
                <XAxis dataKey="region" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => compactCurrency.format(Number(value))}
                />
                <Tooltip formatter={(value) => formatFullCurrency(Number(value))} />
                <Bar dataKey="subtotal" name="Sales" fill="#0f766e" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel
            eyebrow="Trend"
            title="Yearly sales movement"
            copy="Garis tahunan memperlihatkan apakah pertumbuhan datang dari satu wilayah saja atau bergerak bersama lintas region."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlySales.data} margin={{ top: 18, right: 18, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => compactCurrency.format(Number(value))}
                />
                <Tooltip formatter={(value) => formatFullCurrency(Number(value))} />
                <Legend />
                {yearlySales.keys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={seriesColors[index % seriesColors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[0.8fr_1.2fr]">
          <ChartPanel
            eyebrow="Insight"
            title="Product category share"
            copy={`Kategori terbesar adalah ${topCategory?.category ?? "unknown"}. Pie chart dipakai sebagai ringkasan kontribusi, bukan sebagai daftar produk mentah.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.charts.product_category_share}
                  dataKey="subtotal"
                  nameKey="category"
                  innerRadius={70}
                  outerRadius={112}
                  paddingAngle={3}
                >
                  {dashboard.charts.product_category_share.map((entry, index) => (
                    <Cell
                      key={entry.category}
                      fill={seriesColors[index % seriesColors.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatFullCurrency(Number(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel
            eyebrow="Monthly read"
            title="Category share during 2004"
            copy="Area chart membaca kontribusi bulanan kategori produk. Ini mengikuti logika Pentaho lama yang menyorot tahun 2004 dengan pengecualian bulan tujuh."
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyCategoryShare.data} margin={{ top: 18, right: 18, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                <Legend />
                {monthlyCategoryShare.keys.map((key, index) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={seriesColors[index % seriesColors.length]}
                    fill={seriesColors[index % seriesColors.length]}
                    fillOpacity={0.18}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          <ChartPanel
            eyebrow="Freight"
            title="Freight by region"
            copy="Freight dipasangkan dengan sales agar pembacaan wilayah tidak hanya melihat revenue, tetapi juga beban pengiriman."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dashboard.charts.freight_by_region}
                margin={{ top: 18, right: 18, bottom: 18, left: 0 }}
              >
                <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
                <XAxis dataKey="region" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => compactCurrency.format(Number(value))}
                />
                <Tooltip formatter={(value) => formatFullCurrency(Number(value))} />
                <Bar dataKey="freight" name="Freight" fill="#b45309" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel
            eyebrow="Trend"
            title="Yearly freight movement"
            copy="Jika freight naik mengikuti sales, wilayah tersebut bisa dibaca sebagai pasar besar; jika tidak seimbang, perlu perhatian operasional."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yearlyFreight.data} margin={{ top: 18, right: 18, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => compactCurrency.format(Number(value))}
                />
                <Tooltip formatter={(value) => formatFullCurrency(Number(value))} />
                <Legend />
                {yearlyFreight.keys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={seriesColors[index % seriesColors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.08fr_0.92fr]">
          <ChartPanel
            eyebrow="Behavior"
            title="Sales reason by year"
            copy="Alasan pembelian memperlihatkan konteks bisnis di balik angka penjualan: apakah pelanggan datang karena promosi, harga, kualitas, atau faktor lain."
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesReasons.data} margin={{ top: 18, right: 18, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => formatNumber(Number(value))} />
                <Legend />
                {salesReasons.keys.map((key, index) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    stackId="reason"
                    fill={seriesColors[index % seriesColors.length]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>

          <ChartPanel
            eyebrow="Volume"
            title="Transactions by country"
            copy="Country code dibaca sebagai volume transaksi agar sales yang tinggi bisa dibandingkan dengan frekuensi order."
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={countryTransactions.data} margin={{ top: 18, right: 18, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
                <XAxis dataKey="year" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => formatNumber(Number(value))} />
                <Tooltip formatter={(value) => formatNumber(Number(value))} />
                <Legend />
                {countryTransactions.keys.map((key, index) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={seriesColors[index % seriesColors.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </ChartPanel>
        </div>

        <section className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="border border-ink/15 bg-paper">
            <div className="border-b border-ink/15 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                Table
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-ink">
                Top products by sales
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                Tabel hanya menampilkan produk teratas agar mendukung narasi
                chart. Detail mentah tetap berada di warehouse.
              </p>
            </div>
            <div className="max-h-[460px] overflow-auto">
              <table className="min-w-[780px] w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-ink text-white">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em]">Product</th>
                    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em]">Category</th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.14em]">Sales</th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.14em]">Freight</th>
                    <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-[0.14em]">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.tables.top_products.map((product) => (
                    <tr key={product.product_id} className="border-b border-ink/10">
                      <td className="px-4 py-3 font-medium text-ink">{product.product_name}</td>
                      <td className="px-4 py-3 text-muted">{product.category}</td>
                      <td className="px-4 py-3 text-right">{formatFullCurrency(product.subtotal)}</td>
                      <td className="px-4 py-3 text-right">{formatFullCurrency(product.freight)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(product.transactions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="border border-ink/15 bg-ink p-5 text-white">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/60">
              Source control
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Tables copied into `porto_side`
            </h2>
            <p className="mt-4 text-sm leading-6 text-white/68">
              Project Porto membaca tabel hasil duplikasi, sehingga demo tidak
              bergantung pada aplikasi Pentaho lama saat dijalankan.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-px bg-white/20">
              {Object.entries(dashboard.tables.table_counts).map(([table, count]) => (
                <div key={table} className="flex items-center justify-between bg-ink py-3">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-white/62">
                    {table}
                  </span>
                  <span className="text-lg font-semibold">{formatNumber(count)}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function StoryBlock({
  label,
  title,
  copy,
}: {
  label: string;
  title: string;
  copy: string;
}) {
  return (
    <article className="bg-paper p-6">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {label}
      </p>
      <h2 className="mt-8 text-2xl font-semibold text-ink">{title}</h2>
      <p className="mt-5 text-base leading-7 text-muted">{copy}</p>
    </article>
  );
}

function ChartPanel({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string;
  title: string;
  copy: string;
  children: React.ReactNode;
}) {
  return (
    <article className="border border-ink/15 bg-paper p-5">
      <div className="mb-5 border-b border-ink/15 pb-4">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-ink">{title}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{copy}</p>
      </div>
      <div className="h-[360px]">{children}</div>
    </article>
  );
}
