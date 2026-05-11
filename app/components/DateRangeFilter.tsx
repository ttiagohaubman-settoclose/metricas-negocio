"use client";

import type { DatePreset } from "../hooks/useDashboardData";

type Props = {
  preset: DatePreset;
  since?: string;
  until?: string;
  onChange: (preset: DatePreset, since?: string, until?: string) => void;
};

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "last_7d", label: "Últimos 7 días" },
  { value: "last_30d", label: "Últimos 30 días" },
  { value: "this_month", label: "Mes actual" },
  { value: "custom", label: "Personalizado" },
];

export default function DateRangeFilter({ preset, since, until, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {PRESETS.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value, since, until)}
          className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
            preset === p.value
              ? "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)]"
              : "bg-transparent text-[var(--ink-muted)] border-[var(--border-strong)] hover:border-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          {p.label}
        </button>
      ))}

      {preset === "custom" && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={since || ""}
            onChange={(e) => onChange("custom", e.target.value, until)}
            className="px-2 py-1 text-xs rounded-md border border-[var(--border-strong)] bg-transparent text-[var(--ink)]"
          />
          <span className="text-[var(--ink-muted)] text-xs">→</span>
          <input
            type="date"
            value={until || ""}
            onChange={(e) => onChange("custom", since, e.target.value)}
            className="px-2 py-1 text-xs rounded-md border border-[var(--border-strong)] bg-transparent text-[var(--ink)]"
          />
        </div>
      )}
    </div>
  );
}