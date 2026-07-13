"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SentimentAnalysis } from "@/services/sentiment-service";

type SentimentVisualizationProps = {
  result: SentimentAnalysis;
  statusLabel: string;
  isProcessing?: boolean;
};

const distributionColors: Record<string, string> = {
  positive: "#0f766e",
  neutral: "#b45309",
  negative: "#be123c",
};

const defaultSpiderGroups = [
  {
    label: "Network - Memory",
    aspects: ["network", "body", "display", "platform", "performance", "memory"],
  },
  {
    label: "Camera - Accessories",
    aspects: [
      "camera",
      "sound",
      "communications",
      "features",
      "battery",
      "accessories",
    ],
  },
];

export function SentimentVisualization({
  result,
  statusLabel,
  isProcessing = false,
}: SentimentVisualizationProps) {
  const [spiderView, setSpiderView] = useState("all");

  const distributionData = useMemo(
    () =>
      Object.entries(result.distribution).map(([label, value]) => ({
        label,
        value,
      })),
    [result.distribution],
  );

  const aspectData = useMemo(
    () =>
      result.aspects.slice(0, 8).map((aspect) => ({
        aspect: aspect.aspect,
        positive: aspect.positive,
        dataset1: aspect.datasets?.[0] ?? 0,
        dataset2: aspect.datasets?.[1] ?? 0,
      })),
    [result.aspects],
  );

  const hasComparison = aspectData.some((item) => item.dataset2 > 0);

  const spiderGroups = useMemo(() => {
    const groups =
      result.spider?.groups && result.spider.groups.length > 0
        ? result.spider.groups
        : defaultSpiderGroups;
    const byAspect = new Map(result.aspects.map((item) => [item.aspect, item]));

    return groups
      .map((group) => ({
        ...group,
        data: group.aspects
          .map((aspect) => {
            const row = byAspect.get(aspect);

            return {
              aspect,
              dataset1: row?.percentages?.[0] ?? 0,
              dataset2: row?.percentages?.[1] ?? 0,
            };
          })
          .filter((item) => byAspect.has(item.aspect)),
      }))
      .filter((group) => group.data.length > 0);
  }, [result.aspects, result.spider]);

  const visibleSpiderGroups = useMemo(
    () =>
      spiderView === "all"
        ? spiderGroups
        : spiderGroups.filter((group) => group.label === spiderView),
    [spiderGroups, spiderView],
  );

  const hasSpiderComparison = spiderGroups.some((group) =>
    group.data.some((item) => item.dataset2 > 0),
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Sentiment Visualization
          </p>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            Distribusi dibaca lebih dulu untuk memahami arah umum, lalu aspek
            positif dan perbandingan dataset digunakan untuk menemukan angle
            benchmark yang paling kuat.
          </p>
        </div>
        <span className="border border-ink/15 px-3 py-2 font-mono text-xs uppercase tracking-[0.16em] text-muted">
          {statusLabel}
        </span>
      </div>

      {isProcessing ? (
        <div className="border border-ink/25 bg-background p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <span className="relative mt-1 flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-3 w-3 animate-ping bg-ink/35" />
                <span className="relative inline-flex h-3 w-3 bg-ink" />
              </span>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink">
                  Dataset sedang diproses
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Visual di bawah masih memakai preview atau hasil terakhir.
                  Setelah proses selesai, chart akan otomatis berubah menjadi
                  hasil dataset yang baru di-upload.
                </p>
              </div>
            </div>
            <span className="border border-ink/15 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Waiting for model output
            </span>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden bg-ink/10">
            <div className="h-full w-2/3 animate-pulse bg-ink" />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[320px_1fr]">
        <article className="border border-ink/15 bg-paper p-4">
          <div className="mb-4 border-b border-ink/15 pb-3">
            <h3 className="text-xl font-semibold text-ink">
              Good / Neutral / Bad
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Pie chart merangkum sinyal utama sebelum aspek dibaca lebih
              detail.
            </p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={64}
                  outerRadius={108}
                  paddingAngle={3}
                >
                  {distributionData.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={distributionColors[entry.label] ?? "#67645f"}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-px bg-ink/15">
            {distributionData.map((item) => (
              <div key={item.label} className="bg-paper p-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {item.label}
                </p>
                <p className="mt-1 text-xl font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="border border-ink/15 bg-paper p-4">
          <div className="mb-4 border-b border-ink/15 pb-3">
            <h3 className="text-xl font-semibold text-ink">
              Positive Aspect Ranking
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Bar chart menampilkan aspek dengan sinyal positif tertinggi,
              bukan raw prediction row.
            </p>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aspectData} margin={{ top: 18, right: 18, bottom: 18, left: 0 }}>
                <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
                <XAxis
                  dataKey="aspect"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#67645f", fontSize: 12 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#67645f", fontSize: 12 }}
                />
                <Tooltip />
                <Bar
                  dataKey="positive"
                  name="Positive signal"
                  fill="#0f766e"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="border border-ink/15 bg-paper p-4">
        <div className="mb-4 flex flex-col justify-between gap-4 border-b border-ink/15 pb-3 md:flex-row md:items-end">
          <div>
            <h3 className="text-xl font-semibold text-ink">
              Spider Chart Benchmark
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
              Radar chart mengikuti pembagian aspek di BenchmarkSentimen:
              kelompok awal membaca fondasi perangkat, kelompok kedua membaca
              pengalaman fitur dan aksesori.
            </p>
          </div>
          <label className="space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Tampilkan
            </span>
            <select
              value={spiderView}
              onChange={(event) => setSpiderView(event.target.value)}
              className="h-10 min-w-[210px] border border-ink/20 bg-background px-3 font-mono text-xs uppercase tracking-[0.12em] outline-none transition focus:border-ink"
            >
              <option value="all">Semua</option>
              {spiderGroups.map((group) => (
                <option key={group.label} value={group.label}>
                  {group.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {visibleSpiderGroups.map((group) => (
            <div key={group.label} className="min-h-[360px]">
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.16em] text-muted">
                {group.label}
              </p>
              <div className="h-[330px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={group.data} outerRadius="72%">
                    <PolarGrid stroke="#d8d1c4" />
                    <PolarAngleAxis
                      dataKey="aspect"
                      tick={{ fill: "#67645f", fontSize: 11 }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{ fill: "#67645f", fontSize: 10 }}
                    />
                    <Radar
                      name="Dataset 1"
                      dataKey="dataset1"
                      stroke="#dc2626"
                      fill="#dc2626"
                      fillOpacity={0.2}
                    />
                    {hasSpiderComparison ? (
                      <Radar
                        name="Dataset 2"
                        dataKey="dataset2"
                        stroke="#2563eb"
                        fill="#2563eb"
                        fillOpacity={0.18}
                      />
                    ) : null}
                    <Tooltip
                      formatter={(value) => [`${Number(value).toFixed(2)}%`, "Positive"]}
                    />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="border border-ink/15 bg-paper p-4">
        <div className="mb-4 border-b border-ink/15 pb-3">
          <h3 className="text-xl font-semibold text-ink">
            Dataset Comparison
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            Saat dua file dianalisis, chart ini memperlihatkan aspek mana yang
            lebih kuat di dataset pertama atau kedua.
          </p>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={aspectData} margin={{ top: 18, right: 18, bottom: 18, left: 0 }}>
              <CartesianGrid stroke="#d8d1c4" strokeDasharray="3 3" />
              <XAxis
                dataKey="aspect"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#67645f", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#67645f", fontSize: 12 }}
              />
              <Tooltip />
              <Bar
                dataKey="dataset1"
                name="Dataset 1"
                fill="#0f766e"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="dataset2"
                name="Dataset 2"
                fill="#b45309"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!hasComparison ? (
          <p className="mt-3 text-sm leading-6 text-muted">
            Upload dataset pembanding untuk melihat komparasi antar file.
          </p>
        ) : null}
      </article>

      <p className="text-sm leading-6 text-muted">
        Source: {result.meta.source} / Mode: {result.meta.mode}
        {result.meta.note ? ` / ${result.meta.note}` : ""}
      </p>
    </section>
  );
}
