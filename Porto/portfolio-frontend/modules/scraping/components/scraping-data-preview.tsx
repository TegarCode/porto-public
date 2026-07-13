"use client";

import { useMemo, useState } from "react";
import type { ScrapingResult } from "@/services/scraping-service";

type ScrapingDataPreviewProps = {
  result: ScrapingResult;
};

export function ScrapingDataPreview({ result }: ScrapingDataPreviewProps) {
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);

  const rows = result.rows.slice(0, 6);
  const visibleColumns = useMemo(
    () => result.meta.columns.filter((column) => !hiddenColumns.includes(column)),
    [hiddenColumns, result.meta.columns],
  );
  const numericColumns = useMemo(
    () =>
      result.meta.columns.filter((column) =>
        result.rows.some((row) => typeof row[column] === "number"),
      ),
    [result.meta.columns, result.rows],
  );

  function toggleColumn(column: string) {
    setHiddenColumns((current) =>
      current.includes(column)
        ? current.filter((item) => item !== column)
        : [...current, column],
    );
  }

  return (
    <div className="border border-ink/15 bg-paper p-5">
      <div className="mb-5 border-b border-ink/15 pb-4">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h3 className="text-2xl font-semibold text-ink">Data Preview</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Preview menampilkan sampel baris dan kolom terpilih agar data
              bisa dipindai tanpa berubah menjadi raw table dump.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-ink/15 text-right">
            <div className="bg-paper px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Rows
              </p>
              <p className="mt-1 text-xl font-semibold">
                {result.meta.total_rows}
              </p>
            </div>
            <div className="bg-paper px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Columns
              </p>
              <p className="mt-1 text-xl font-semibold">
                {result.meta.columns.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {result.meta.columns.map((column) => {
          const isActive = visibleColumns.includes(column);

          return (
            <button
              key={column}
              type="button"
              onClick={() => toggleColumn(column)}
              className={`border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition ${
                isActive
                  ? "border-ink bg-ink text-white"
                  : "border-ink/15 text-muted hover:border-ink"
              }`}
            >
              {column}
            </button>
          );
        })}
      </div>

      {rows.length === 0 || visibleColumns.length === 0 ? (
        <div className="border border-ink/15 bg-background p-6">
          <p className="text-base leading-7 text-muted">
            Belum ada baris atau kolom yang dapat ditampilkan.
          </p>
        </div>
      ) : (
        <div className="grid gap-px bg-ink/15">
          {rows.map((row, index) => (
            <article
              key={`${Object.values(row).join("-")}-${index}`}
              className="grid gap-4 bg-paper p-4"
              style={{
                gridTemplateColumns: `repeat(${Math.min(
                  visibleColumns.length,
                  4,
                )}, minmax(0, 1fr))`,
              }}
            >
              {visibleColumns.map((column) => (
                <div key={column} className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {column}
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-ink">
                    {String(row[column] ?? "-")}
                  </p>
                </div>
              ))}
            </article>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 gap-px bg-ink/15 md:grid-cols-3">
        <article className="bg-paper p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Source
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">{result.source}</p>
          {result.meta.preview_source ? (
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
              Table: {result.meta.preview_source}
            </p>
          ) : null}
        </article>
        <article className="bg-paper p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Numeric fields
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {numericColumns.length}
          </p>
        </article>
        <article className="bg-paper p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Mode
          </p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {result.meta.mode}
          </p>
        </article>
      </div>
    </div>
  );
}
