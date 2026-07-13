"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  sideDefaultFilters,
  sideMethods,
} from "@/modules/side-analysis/constants";
import { RcaCmsaPanel } from "@/modules/side-analysis/components/rca-cmsa-panel";
import { RcaEpdPanel } from "@/modules/side-analysis/components/rca-epd-panel";
import { RscaTbiPanel } from "@/modules/side-analysis/components/rsca-tbi-panel";
import { SideFilterPanel } from "@/modules/side-analysis/components/side-filter-panel";
import { SideMethodTabs } from "@/modules/side-analysis/components/side-method-tabs";
import type {
  SideFilterState,
  SideMethodKey,
} from "@/modules/side-analysis/types";

export function SideAnalysisView() {
  const [filters, setFilters] =
    useState<SideFilterState>(sideDefaultFilters);
  const [activeKey, setActiveKey] = useState<SideMethodKey>("rca-cmsa");

  const activeMethod = useMemo(
    () => sideMethods.find((method) => method.key === activeKey) ?? sideMethods[0],
    [activeKey],
  );

  function handleMethodChange(key: SideMethodKey) {
    setActiveKey(key);

    if (key === "rca-epd" && filters.level !== 4) {
      setFilters((current) => ({ ...current, level: 4 }));
    }
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-900">
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-24 lg:px-8">
        <header className="pb-4">
          <Link
            href="/"
            className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-slate-900"
          >
            Back to portfolio
          </Link>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[0.86fr_1.14fr] md:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Analisis
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-semibold text-slate-950 md:text-4xl">
                Analisis Potensi dan Daya Saing
              </h1>
            </div>
            <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              Hasil analisis potensi dan daya saing dengan negara mitra/kawasan
              yang dipilih dalam bentuk tabel data dan visualisasi, mengikuti
              struktur SIDE.
            </p>
          </div>
        </header>
      </section>

      <section className="mx-auto max-w-7xl space-y-6 px-4 pb-12 lg:px-8">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
            Jenis analisis
          </div>
          <SideMethodTabs
            methods={sideMethods}
            activeKey={activeKey}
            onChange={handleMethodChange}
          />
        </div>

        <SideFilterPanel value={filters} onChange={setFilters} />

        <section>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">
            Modul analisis
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">
              {activeMethod.title}
            </h2>
            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              {activeMethod.problem} {activeMethod.data}
            </p>
          </div>
        </section>

        <div>
          {activeKey === "rca-cmsa" ? (
            <RcaCmsaPanel filters={filters} />
          ) : activeKey === "rca-epd" ? (
            <RcaEpdPanel filters={filters} />
          ) : (
            <RscaTbiPanel filters={filters} />
          )}
        </div>
      </section>
    </main>
  );
}
