"use client";

type Props = {
  label: string;
  value: string;
  sublabel?: string;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
};

export default function KPICard({ label, value, sublabel, trend }: Props) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 hover:border-[var(--border-strong)] transition-colors">
      <div className="text-[10px] uppercase tracking-widest text-[var(--ink-muted)] font-medium">
        {label}
      </div>
      <div className="text-3xl font-bold mt-2 tracking-tight">{value}</div>
      {sublabel && (
        <div className="text-xs text-[var(--ink-muted)] mt-1">{sublabel}</div>
      )}
      {trend && (
        <div
          className={`text-xs mt-2 ${
            trend.direction === "up"
              ? "text-[var(--ink)]"
              : trend.direction === "down"
              ? "text-[var(--ink-muted)]"
              : "text-[var(--ink-dim)]"
          }`}
        >
          {trend.direction === "up" && "↑ "}
          {trend.direction === "down" && "↓ "}
          {trend.value.toFixed(1)}%
        </div>
      )}
    </div>
  );
}