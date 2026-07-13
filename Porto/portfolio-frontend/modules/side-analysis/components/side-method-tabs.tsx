"use client";

import type {
  SideMethod,
  SideMethodKey,
} from "@/modules/side-analysis/types";

type SideMethodTabsProps = {
  methods: SideMethod[];
  activeKey: SideMethodKey;
  onChange: (key: SideMethodKey) => void;
};

export function SideMethodTabs({
  methods,
  activeKey,
  onChange,
}: SideMethodTabsProps) {
  return (
    <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {methods.map((method) => {
        const isActive = method.key === activeKey;

        return (
          <button
            key={method.key}
            type="button"
            onClick={() => onChange(method.key)}
            className={`rounded-md px-4 py-2 text-left text-sm font-semibold transition-colors ${
              isActive ? "bg-slate-900 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
            }`}
          >
            <span className="block">
              {method.title}
            </span>
          </button>
        );
      })}
    </div>
  );
}
