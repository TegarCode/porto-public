"use client";

import { useEffect } from "react";
import type { SideFilterState } from "@/modules/side-analysis/types";
import { useSideCountryOptions } from "@/services/side-queries";
import type { SideCountryOption } from "@/services/side-service";

type SideFilterPanelProps = {
  value: SideFilterState;
  onChange: (value: SideFilterState) => void;
};

function countryLabel(option: SideCountryOption) {
  return `${option.code} - ${option.name ?? option.code}`;
}

function optionsWithCurrent(
  options: SideCountryOption[],
  code: string,
): SideCountryOption[] {
  const normalizedCode = code.toUpperCase();

  if (
    normalizedCode === "" ||
    options.some((option) => option.code === normalizedCode)
  ) {
    return options;
  }

  return [
    {
      code: normalizedCode,
      alpha2: null,
      name: normalizedCode,
    },
    ...options,
  ];
}

export function SideFilterPanel({ value, onChange }: SideFilterPanelProps) {
  const countriesQuery = useSideCountryOptions();
  const destinationOptions = optionsWithCurrent(
    countriesQuery.data?.countries ?? [],
    value.dest,
  );

  useEffect(() => {
    if (value.origin !== "IDN") {
      onChange({ ...value, origin: "IDN" });
    }
  }, [onChange, value]);

  return (
    <section className="mx-auto max-w-7xl px-4 lg:px-8">
      <div className="grid grid-cols-1 gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_1fr_160px]">
        <label className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            Origin
          </span>
          <div className="flex h-11 w-full items-center rounded-md border border-slate-200 bg-slate-100 px-4 font-mono text-sm uppercase text-slate-700">
            IDN - INDONESIA
          </div>
        </label>
        <label className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            Destination
          </span>
          <select
            value={value.dest}
            onChange={(event) =>
              onChange({ ...value, dest: event.target.value.toUpperCase() })
            }
            className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-4 font-mono text-sm uppercase outline-none transition focus:border-[#384AA0] focus:bg-white focus:ring-1 focus:ring-[#384AA0]"
          >
            {destinationOptions.length === 0 ? (
              <option value={value.dest}>{value.dest}</option>
            ) : (
              destinationOptions.map((option, index) => (
                <option key={`${option.code}-${index}`} value={option.code}>
                  {countryLabel(option)}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="space-y-2">
          <span className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
            HS Level
          </span>
          <select
            value={value.level}
            onChange={(event) =>
              onChange({ ...value, level: Number(event.target.value) })
            }
            className="h-11 w-full rounded-md border border-slate-200 bg-slate-50 px-4 font-mono text-sm outline-none transition focus:border-[#384AA0] focus:bg-white focus:ring-1 focus:ring-[#384AA0]"
          >
            <option value={2}>2</option>
            <option value={4}>4</option>
            <option value={6}>6</option>
          </select>
        </label>
      </div>
      <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">
        {countriesQuery.isLoading
          ? "Loading countries"
          : countriesQuery.isError
            ? "Country fallback"
            : `${destinationOptions.length} countries from tbnegara`}
      </div>
    </section>
  );
}
