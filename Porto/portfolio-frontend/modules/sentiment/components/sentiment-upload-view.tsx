"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  sentimentAspects,
  sentimentPreview,
} from "@/modules/sentiment/constants";
import { SentimentVisualization } from "@/modules/sentiment/components/sentiment-visualization";
import {
  analyzeSentiment,
  type SentimentAnalysis,
} from "@/services/sentiment-service";

export function SentimentUploadView() {
  const [dataset, setDataset] = useState<File | undefined>();
  const [datasetCompare, setDatasetCompare] = useState<File | undefined>();
  const [aspect, setAspect] = useState("all");

  const mutation = useMutation({
    mutationFn: analyzeSentiment,
  });

  const result: SentimentAnalysis = mutation.data ?? sentimentPreview;
  const isPreview = !mutation.data;
  const isProcessing = mutation.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dataset && !datasetCompare) {
      return;
    }

    mutation.mutate({
      dataset: datasetCompare ? undefined : dataset,
      dataset_1: dataset,
      dataset_2: datasetCompare,
      aspect: aspect === "all" ? undefined : aspect,
    });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-6 pb-10 pt-24 md:px-10 lg:px-14">
        <header className="border-b border-ink/15 pb-8">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-[0.2em] text-muted transition hover:text-ink"
          >
            Back to portfolio
          </Link>
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-[0.86fr_1.14fr] md:items-end">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-muted">
                Benchmark Sentimen
              </p>
              <h1 className="mt-5 max-w-3xl text-5xl font-semibold leading-[1.02] text-ink md:text-7xl">
                Upload opinion data, read the benchmark story.
              </h1>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-muted md:text-xl md:leading-9">
              Dashboard ini membaca opini smartphone berbasis aspek. File CSV
              diproses melalui API gateway dan model BenchmarkSentimen, lalu
              hasilnya diringkas menjadi distribusi sentimen dan aspek yang
              paling menonjol.
            </p>
          </div>
        </header>
      </section>

      <section className="border-y border-ink/15 bg-paper">
        <form
          onSubmit={handleSubmit}
          className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-6 py-6 md:grid-cols-[1fr_1fr_220px_160px] md:px-10 lg:px-14"
        >
          <label className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              Dataset
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setDataset(event.target.files?.[0])}
              className="block h-12 w-full border border-ink/20 bg-background px-3 py-2 text-sm file:mr-4 file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-[0.14em] file:text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              Compare Dataset
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => setDatasetCompare(event.target.files?.[0])}
              className="block h-12 w-full border border-ink/20 bg-background px-3 py-2 text-sm file:mr-4 file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:uppercase file:tracking-[0.14em] file:text-white"
            />
          </label>
          <label className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
              Aspect
            </span>
            <select
              value={aspect}
              onChange={(event) => setAspect(event.target.value)}
              className="h-12 w-full border border-ink/20 bg-background px-4 font-mono text-sm outline-none transition focus:border-ink"
            >
              <option value="all">All aspects</option>
              {sentimentAspects.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={mutation.isPending || (!dataset && !datasetCompare)}
            className="mt-6 h-12 border border-ink bg-ink px-4 font-mono text-xs uppercase tracking-[0.18em] text-white transition hover:bg-background hover:text-ink disabled:cursor-not-allowed disabled:border-ink/30 disabled:bg-ink/30 disabled:text-white"
          >
            {mutation.isPending ? "Analyzing" : "Analyze"}
          </button>
        </form>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 md:px-10 lg:grid-cols-[0.82fr_1.18fr] lg:px-14">
        <article className="space-y-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
              Problem
            </p>
            <p className="mt-3 text-base leading-7 text-ink">
              Sentimen umum tidak cukup untuk benchmark produk. Analisis harus
              melihat aspek seperti camera, performance, network, atau battery.
            </p>
          </div>

          <div className="border-y border-ink/15 py-7">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-muted">
              Insight
            </p>
            <p className="mt-4 text-xl leading-8 text-ink">{result.insight}</p>
            {isProcessing ? (
              <p className="mt-4 border-l-2 border-ink bg-paper px-4 py-3 text-sm leading-6 text-muted">
                Dataset yang kamu upload sedang diproses. Angka dan chart yang
                terlihat sekarang masih preview atau hasil sebelumnya sampai
                analisis selesai.
              </p>
            ) : mutation.isError ? (
              <p className="mt-4 text-sm leading-6 text-rose">
                API belum mengembalikan hasil. Preview tetap ditampilkan agar
                alur dashboard bisa dibaca.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-3 border border-ink/15 bg-paper">
            {result.highlight.slice(0, 3).map((item) => (
              <div key={item.label} className="border-r border-ink/15 p-4 last:border-r-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-semibold">{item.count}</p>
              </div>
            ))}
          </div>
        </article>

        <SentimentVisualization
          result={result}
          isProcessing={isProcessing}
          statusLabel={
            isProcessing
              ? "Processing dataset"
              : isPreview
                ? "Preview data"
                : "Live API"
          }
        />
      </section>
    </main>
  );
}
