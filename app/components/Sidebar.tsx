"use client";

import { CLIENTS } from "../config/clients";

type SidebarProps = {
  activeView: "agency" | string;
  onSelectView: (view: "agency" | string) => void;
};

export default function Sidebar({ activeView, onSelectView }: SidebarProps) {
  return (
    <aside className="w-64 bg-[var(--bg-elevated)] border-r border-[var(--border)] flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-[var(--border)]">
        <div className="text-xl font-bold tracking-tight">SetToClose</div>
        <div className="text-xs text-[var(--ink-muted)] mt-1">Dashboard</div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <button
          onClick={() => onSelectView("agency")}
          className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
            activeView === "agency"
              ? "bg-[var(--surface-hover)] text-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
          }`}
        >
          <div className="text-sm font-semibold">Agencia</div>
          <div className="text-xs opacity-70 mt-0.5">Vista consolidada</div>
        </button>

        <div className="text-[10px] uppercase tracking-widest text-[var(--ink-dim)] px-4 py-2 mt-4">
          Clientes
        </div>

        {CLIENTS.map((client) => (
          <button
            key={client.id}
            onClick={() => onSelectView(client.id)}
            className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
              activeView === client.id
                ? "bg-[var(--surface-hover)] text-[var(--ink)]"
                : "text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink)]"
            }`}
          >
            <div className="text-sm font-medium">{client.name}</div>
            <div className="text-xs opacity-70 mt-0.5">{client.stateCode}</div>
          </button>
        ))}
      </nav>
    </aside>
  );
}