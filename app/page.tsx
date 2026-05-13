"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useDashboardData, type DatePreset } from "./hooks/useDashboardData";
import { exportFullReport, type ExportContext } from "./lib/pdf-export";

const fmt = {
  currency: (v: number) => "$" + Math.round(v).toLocaleString("en-US"),
  currency2: (v: number) => "$" + v.toFixed(2),
  number: (v: number) => Math.round(v).toLocaleString("en-US"),
  percent: (v: number) => v.toFixed(2) + "%",
};

type MetricDef = {
  id: string;
  label: string;
  format: string;
  lowerBetter: boolean;
  isCustom?: boolean;
};

const formatValue = (value: number, format: string): string => {
  if (format === "currency") return fmt.currency(value);
  if (format === "currency2") return fmt.currency2(value);
  if (format === "number") return fmt.number(value);
  if (format === "percent") return fmt.percent(value);
  return String(value);
};
// Catálogo de métricas conocidas con sus formatos
const KNOWN_METRIC_DEFS: Record<string, { label: string; format: string; lowerBetter: boolean }> = {
  spend: { label: "Importe gastado", format: "currency", lowerBetter: false },
  cpc: { label: "CPC (todos)", format: "currency2", lowerBetter: true },
  cpm: { label: "CPM", format: "currency2", lowerBetter: true },
  cpp: { label: "CPP", format: "currency2", lowerBetter: true },
  costPerLinkClick: { label: "Costo por click", format: "currency2", lowerBetter: true },
  costPerLead: { label: "Cost per Lead", format: "currency2", lowerBetter: true },
  costPerLandingPageView: { label: "Cost per LPV", format: "currency2", lowerBetter: true },
  costPerThruplay: { label: "Costo por ThruPlay", format: "currency2", lowerBetter: true },
  costPerMessagingStart: { label: "Costo por conversación", format: "currency2", lowerBetter: true },
  impressions: { label: "Impresiones", format: "number", lowerBetter: false },
  reach: { label: "Alcance", format: "number", lowerBetter: false },
  frequency: { label: "Frecuencia", format: "decimal", lowerBetter: false },
  clicks: { label: "Clicks (todos)", format: "number", lowerBetter: false },
  linkClicks: { label: "Clicks en enlace", format: "number", lowerBetter: false },
  ctr: { label: "CTR (todos)", format: "percent", lowerBetter: false },
  linkCTR: { label: "CTR (enlace)", format: "percent", lowerBetter: false },
  uniqueClicks: { label: "Clicks únicos", format: "number", lowerBetter: false },
  uniqueLinkClicks: { label: "Clicks únicos en enlace", format: "number", lowerBetter: false },
  uniqueCTR: { label: "CTR único", format: "percent", lowerBetter: false },
  outboundClicks: { label: "Clicks salientes", format: "number", lowerBetter: false },
  outboundClicksCTR: { label: "CTR saliente", format: "percent", lowerBetter: false },
  postEngagement: { label: "Interacciones con publicación", format: "number", lowerBetter: false },
  pageEngagement: { label: "Interacciones con página", format: "number", lowerBetter: false },
  postReactions: { label: "Reacciones", format: "number", lowerBetter: false },
  postComments: { label: "Comentarios", format: "number", lowerBetter: false },
  postShares: { label: "Compartidos", format: "number", lowerBetter: false },
  postSaves: { label: "Guardados", format: "number", lowerBetter: false },
  leads: { label: "Leads", format: "number", lowerBetter: false },
  landingPageViews: { label: "Landing page views", format: "number", lowerBetter: false },
  purchases: { label: "Compras", format: "number", lowerBetter: false },
  addsToCart: { label: "Agregados al carrito", format: "number", lowerBetter: false },
  initiatedCheckouts: { label: "Checkouts iniciados", format: "number", lowerBetter: false },
  registrations: { label: "Registros completados", format: "number", lowerBetter: false },
  messagingStarted: { label: "Conversaciones iniciadas", format: "number", lowerBetter: false },
  submitApplications: { label: "Solicitudes enviadas", format: "number", lowerBetter: false },
  viewContent: { label: "Vistas de contenido", format: "number", lowerBetter: false },
  videoPlays: { label: "Reproducciones de video", format: "number", lowerBetter: false },
  video25Watched: { label: "Vistos al 25%", format: "number", lowerBetter: false },
  video50Watched: { label: "Vistos al 50%", format: "number", lowerBetter: false },
  video75Watched: { label: "Vistos al 75%", format: "number", lowerBetter: false },
  video95Watched: { label: "Vistos al 95%", format: "number", lowerBetter: false },
  video100Watched: { label: "Vistos al 100%", format: "number", lowerBetter: false },
  thruplays: { label: "ThruPlays", format: "number", lowerBetter: false },
  videoAvgTimeWatched: { label: "Tiempo prom. visto", format: "decimal", lowerBetter: false },
  qualityRanking: { label: "Calidad", format: "number", lowerBetter: false },
  engagementRateRanking: { label: "Engagement", format: "number", lowerBetter: false },
  conversionRateRanking: { label: "Conversión", format: "number", lowerBetter: false },
  purchaseRoas: { label: "ROAS compras", format: "decimal", lowerBetter: false },
  websitePurchaseRoas: { label: "ROAS web purchase", format: "decimal", lowerBetter: false },
};

// Construye la lista de métricas a mostrar combinando activas + custom + fallback
function buildMetricsToShow(
  activeMetrics: string[] = [],
  customMetrics: Array<{ id: string; label: string; format: string; lower_better: boolean }> = [],
): MetricDef[] {
  const result: MetricDef[] = [];

  activeMetrics.forEach((id) => {
    const def = KNOWN_METRIC_DEFS[id];
    if (def) {
      result.push({ id, label: def.label, format: def.format, lowerBetter: def.lowerBetter });
    } else {
      // Métrica de Meta no listada (custom field)
      result.push({ id, label: id, format: "number", lowerBetter: false });
    }
  });

  customMetrics.forEach((cm) => {
    result.push({ id: cm.id, label: cm.label, format: cm.format, lowerBetter: cm.lower_better, isCustom: true });
  });

  return result;
}
function calcChange(current: number, previous: number, lowerBetter: boolean) {
  if (previous === 0) return { change: 0, isPositive: current > 0 ? !lowerBetter : false };
  const change = ((current - previous) / previous) * 100;
  return { change, isPositive: lowerBetter ? change < 0 : change > 0 };
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  return `hace ${Math.floor(diff / 3600)} h`;
}

function formatDateForDisplay(s: string): string {
  if (!s) return "";
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" });
}

type Theme = "dark" | "light";

function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);
  return [theme, setTheme];
}

export default function DashboardPage() {
  const [activeView, setActiveView] = useState<string>("agency");
  const [preset, setPreset] = useState<DatePreset>("last_7d");
  const [since, setSince] = useState<string>();
  const [until, setUntil] = useState<string>();
  const [theme, setTheme] = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
const [drilldownMetric, setDrilldownMetric] = useState<string | null>(null);
  const [selectedAdAccountId, setSelectedAdAccountId] = useState<string | undefined>(undefined);
const [showPdfModal, setShowPdfModal] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const { clients, isAdmin, meta, ghl, market, loading, lastUpdated, agency } = useDashboardData(preset, since, until, selectedAdAccountId);
  const getClientById = (id: string) => clients.find((c) => c.id === id);

  useEffect(() => {
    if (!isAdmin && clients.length > 0 && activeView === "agency") {
      setActiveView(clients[0].id);
    }
  }, [isAdmin, clients, activeView]);

  useEffect(() => {
    setSelectedAdAccountId(undefined);
  }, [activeView]);

  const cfg = activeView === "agency" ? null : getClientById(activeView);

  return (
    <div className="app-layout">
      <Sidebar
        activeView={activeView}
        onSelectView={setActiveView}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        theme={theme}
        clients={clients}
        isAdmin={isAdmin}
      />

      {!sidebarOpen && (
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(true)} title="Abrir sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      <main className={`main-content ${!sidebarOpen ? "sidebar-collapsed" : ""}`}>
        <header className={`page-header ${!sidebarOpen ? "with-toggle" : ""}`}>
          <div>
            <div className="platform-tag">{activeView === "agency" ? "Vista Agencia" : "Cliente"}</div>
            {activeView === "agency" ? (
              <div style={{ height: 48, marginBottom: 8 }}>
                <img src={theme === "dark" ? "/settoclose-logo-white.png" : "/settoclose-logo-black.png"} alt="SetToClose" style={{ height: "100%", objectFit: "contain" }} />
              </div>
            ) : (
              <h1 className="page-title">{cfg?.name}</h1>
            )}
            <div className="page-subtitle">
              {activeView === "agency" ? "Métricas consolidadas de todos los clientes" : cfg?.state}
            </div>
            {lastUpdated && (
              <div className="last-updated">Actualizado {timeAgo(lastUpdated)}</div>
            )}
          </div>
          <div className="header-controls">
            <button
              onClick={() => setShowPdfModal(true)}
              className="no-pdf-export"
              style={{
                background: "transparent",
                border: "1px solid var(--border-strong)",
                color: "var(--ink)",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export PDF
            </button>
            <div className="no-pdf-export">
              <ThemeToggle theme={theme} onChange={setTheme} />
            </div>
          </div>
        </header>

        {activeView === "agency" ? <AgencyBanner theme={theme} clients={clients} /> : cfg && <ClientBanner cfg={cfg} />}

        <DateFilters
          preset={preset} since={since} until={until}
          onChange={(p: any, s: any, u: any) => { setPreset(p); setSince(s); setUntil(u); }}
        />

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>Cargando datos...</div>
        ) : activeView === "agency" ? (
          <AgencyView clients={clients} meta={meta} ghl={ghl} market={market} theme={theme} onDrilldown={setDrilldownMetric} agency={agency} />
        ) : (
          <ClientView
            clientId={activeView}
            clients={clients}
            meta={meta}
            ghl={ghl}
            market={market}
            theme={theme}
            onDrilldown={setDrilldownMetric}
            selectedAdAccountId={selectedAdAccountId}
            onAdAccountChange={setSelectedAdAccountId}
          />
        )}

        {drilldownMetric && activeView === "agency" && (
          <DrilldownModal
            metric={drilldownMetric}
            clients={clients}
            meta={meta}
            ghl={ghl}
            onClose={() => setDrilldownMetric(null)}
          />
        )}
        {showPdfModal && (
          <PdfExportModal
            onClose={() => setShowPdfModal(false)}
            isAgency={activeView === "agency"}
            cfg={cfg}
            meta={meta}
            ghl={ghl}
            clients={clients}
            agency={agency}
            range={{ since, until, preset }}
            selectedAdAccountId={selectedAdAccountId}
            exporting={exportingPdf}
            setExporting={setExportingPdf}
          />
        )}
      </main>
    </div>
  );
}

function Sidebar({ activeView, onSelectView, open, onToggle, theme, clients, isAdmin }: any) {
  const logoSrc = theme === "dark" ? "/settoclose-logo-white.png" : "/settoclose-logo-black.png";

  return (
    <aside className={`sidebar ${open ? "" : "collapsed"}`}>
      <div className="sidebar-top">
        <div className="sidebar-logo">
          <img src={logoSrc} alt="SetToClose" />
        </div>
        <button className="sidebar-toggle in-sidebar" onClick={onToggle} title="Cerrar sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {isAdmin && (
        <>
          <div className="sidebar-section-label">Vista General</div>
          <div style={{ padding: "0 8px" }}>
            <button className={`agency-item ${activeView === "agency" ? "active" : ""}`} onClick={() => onSelectView("agency")}>
              <div className="agency-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l8-4v18" />
                  <path d="M19 21V11l-6-4" />
                  <path d="M9 9v.01" />
                  <path d="M9 12v.01" />
                  <path d="M9 15v.01" />
                  <path d="M9 18v.01" />
                </svg>
              </div>
              <div className="agency-info">
                <div className="agency-name">Agencia</div>
                <div className="agency-sub">Vista consolidada</div>
              </div>
            </button>
          </div>
        </>
      )}

      <div className="sidebar-section-label">Clientes</div>
      <div className="client-list">
        {clients.map((c: any) => (
          <button key={c.id} className={`client-item ${activeView === c.id ? "active" : ""}`} onClick={() => onSelectView(c.id)}>
            <div className="client-avatar">
              {c.avatarUrl ? (
                <img src={c.avatarUrl} alt={c.name} style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }} />
              ) : c.name.charAt(0)}
            </div>
            <div className="client-info">
              <div className="client-name">{c.name}</div>
              <div className="client-meta">{c.stateCode} · Meta Ads</div>
            </div>
            <div className="client-status-dot" />
          </button>
        ))}
      </div>

      <div className="sidebar-nav">
        {isAdmin && (
          <button className="nav-item" onClick={() => window.location.href = "/settings"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </button>
        )}
        {!isAdmin && (
          <button className="nav-item" onClick={() => window.location.href = "/profile"}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            My profile
          </button>
        )}
        <button
          className="nav-item"
          onClick={async () => {
            const { supabase } = await import("./lib/supabase");
            await supabase.auth.signOut();
            window.location.href = "/login";
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign out
        </button>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{isAdmin ? "T" : "C"}</div>
        <div className="user-info">
          <div className="user-name">{isAdmin ? "Tiago Haubman" : "Client"}</div>
          <div className="user-role">{isAdmin ? "Admin" : "Viewer"}</div>
        </div>
      </div>
    </aside>
  );
}

function ThemeToggle({ theme, onChange }: any) {
  return (
    <div className="theme-toggle">
      <button className={`theme-toggle-btn ${theme === "dark" ? "active" : ""}`} onClick={() => onChange("dark")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        Dark
      </button>
      <button className={`theme-toggle-btn ${theme === "light" ? "active" : ""}`} onClick={() => onChange("light")}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
        Light
      </button>
    </div>
  );
}

function AgencyBanner({ theme, clients }: { theme: Theme; clients: any[] }) {
  const logoSrc = theme === "dark" ? "/settoclose-logo-black.png" : "/settoclose-logo-white.png";
  return (
    <div className="agency-banner">
      <div className="agency-banner-icon">
        <img src={logoSrc} alt="" />
      </div>
      <div className="agency-banner-info">
        <div className="agency-banner-title">Agencia · SetToClose</div>
        <div className="agency-banner-sub">{clients.length} clientes activos · Multi-cuenta Meta + GHL</div>
      </div>
      <div className="agency-banner-badge">CONSOLIDADO</div>
    </div>
  );
}

function ClientBanner({ cfg }: { cfg: any }) {
  return (
    <div className="client-banner">
      <div className="client-banner-avatar">
        {cfg.avatarUrl ? (
          <img src={cfg.avatarUrl} alt={cfg.name} style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }} />
        ) : cfg.name.charAt(0)}
      </div>
      <div className="client-banner-info">
        <div className="client-banner-name">{cfg.name}</div>
        <div className="client-banner-meta">AD ACCOUNT: {cfg.adAccountId} · {cfg.state}</div>
      </div>
      <div className="agency-banner-badge">{cfg.stateCode}</div>
    </div>
  );
}

function DateFilters({ preset, since, until, onChange }: any) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    }
    if (calendarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [calendarOpen]);

  const presets: { v: DatePreset; l: string }[] = [
    { v: "today", l: "Hoy" },
    { v: "last_7d", l: "Últimos 7 días" },
    { v: "last_30d", l: "Últimos 30 días" },
    { v: "this_month", l: "Mes actual" },
    { v: "custom", l: "Personalizado" },
  ];

  return (
    <div ref={containerRef} style={{ position: "relative", marginBottom: 24 }}>
      <div className="filters" style={{ marginBottom: 0 }}>
        {presets.map((p) => (
          <button
            key={p.v}
            className={`filter-btn ${preset === p.v ? "active" : ""}`}
            onClick={() => {
              if (p.v === "custom") {
                setCalendarOpen(true);
                onChange(p.v, since, until);
              } else {
                setCalendarOpen(false);
                onChange(p.v, undefined, undefined);
              }
            }}
          >
            {p.l}
            {p.v === "custom" && preset === "custom" && since && until && (
              <span style={{ marginLeft: 8, color: "var(--ink-muted)", fontSize: 11 }}>
                · {formatDateForDisplay(since)} → {formatDateForDisplay(until)}
              </span>
            )}
          </button>
        ))}
      </div>

      {preset === "custom" && calendarOpen && (
        <DateRangePicker
          since={since}
          until={until}
          onChange={(s, u) => onChange("custom", s, u)}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </div>
  );
}

function DateRangePicker({ since, until, onChange, onClose }: {
  since?: string; until?: string;
  onChange: (s?: string, u?: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [tempSince, setTempSince] = useState<string | undefined>(since);
  const [tempUntil, setTempUntil] = useState<string | undefined>(until);
  const [hoverDate, setHoverDate] = useState<string | undefined>();

  const pad = (n: number) => String(n).padStart(2, "0");
  const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  function handleDayClick(dateStr: string) {
    if (!tempSince || (tempSince && tempUntil)) {
      setTempSince(dateStr);
      setTempUntil(undefined);
    } else {
      const startDate = new Date(tempSince);
      const clickDate = new Date(dateStr);
      if (clickDate < startDate) {
        setTempSince(dateStr);
        setTempUntil(tempSince);
      } else {
        setTempUntil(dateStr);
      }
    }
  }

  function handleApply() {
    if (tempSince && tempUntil) {
      onChange(tempSince, tempUntil);
      onClose();
    }
  }

  function handleClear() {
    setTempSince(undefined);
    setTempUntil(undefined);
  }

  function isInRange(dateStr: string) {
    if (!tempSince) return false;
    const end = tempUntil || hoverDate;
    if (!end) return false;
    const d = new Date(dateStr);
    const s = new Date(tempSince);
    const e = new Date(end);
    if (s > e) return d >= e && d <= s;
    return d >= s && d <= e;
  }

  function isStart(dateStr: string) { return tempSince === dateStr; }
  function isEnd(dateStr: string) { return tempUntil === dateStr; }

  function renderMonth(monthDate: Date) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const monthName = monthDate.toLocaleDateString("es-US", { month: "long", year: "numeric" });

    return (
      <div style={{ flex: 1 }}>
        <div style={{
          textAlign: "center", fontSize: 13, fontWeight: 600,
          marginBottom: 12, textTransform: "capitalize", color: "var(--ink)",
        }}>
          {monthName}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {["L", "M", "X", "J", "V", "S", "D"].map((d) => (
            <div key={d} style={{
              textAlign: "center", fontSize: 10, fontWeight: 600,
              color: "var(--ink-dim)", padding: "6px 0", textTransform: "uppercase",
            }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateStr = toStr(new Date(year, month, d));
            const isToday = dateStr === toStr(today);
            const inRange = isInRange(dateStr);
            const start = isStart(dateStr);
            const end = isEnd(dateStr);
            const isMarker = start || end;

            return (
              <button
                key={i}
                onClick={() => handleDayClick(dateStr)}
                onMouseEnter={() => setHoverDate(dateStr)}
                onMouseLeave={() => setHoverDate(undefined)}
                style={{
                  background: isMarker ? "var(--ink)" : (inRange ? "var(--accent-dim)" : "transparent"),
                  color: isMarker ? "var(--bg)" : "var(--ink)",
                  border: "none",
                  padding: 0,
                  height: 32,
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: isMarker ? 700 : (isToday ? 700 : 500),
                  cursor: "pointer",
                  borderRadius: 6,
                  outline: isToday && !isMarker ? "1px solid var(--border-strong)" : "none",
                  transition: "all 0.1s ease",
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 8px)",
      left: 0,
      zIndex: 200,
      background: "var(--surface)",
      border: "1px solid var(--border-strong)",
      borderRadius: 14,
      padding: 16,
      boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
      minWidth: 600,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          style={{
            background: "transparent", border: "1px solid var(--border-strong)",
            width: 28, height: 28, borderRadius: 6, cursor: "pointer",
            color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ flex: 1, textAlign: "center", fontSize: 12, color: "var(--ink-muted)" }}>
          {tempSince && !tempUntil && "Click otra fecha para finalizar el rango"}
          {tempSince && tempUntil && `${formatDateForDisplay(tempSince)} → ${formatDateForDisplay(tempUntil)}`}
          {!tempSince && "Click una fecha para empezar"}
        </div>
        <button
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          style={{
            background: "transparent", border: "1px solid var(--border-strong)",
            width: 28, height: 28, borderRadius: 6, cursor: "pointer",
            color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 12, height: 12 }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {renderMonth(viewMonth)}
        {renderMonth(nextMonth)}
      </div>

      <div style={{
        display: "flex", justifyContent: "flex-end", gap: 8,
        marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)",
      }}>
        <button
          onClick={handleClear}
          style={{
            fontFamily: "inherit", fontSize: 12, fontWeight: 500,
            padding: "8px 14px", borderRadius: 7, cursor: "pointer",
            background: "transparent", border: "1px solid var(--border-strong)",
            color: "var(--ink-muted)",
          }}
        >
          Limpiar
        </button>
        <button
          onClick={handleApply}
          disabled={!tempSince || !tempUntil}
          style={{
            fontFamily: "inherit", fontSize: 12, fontWeight: 500,
            padding: "8px 14px", borderRadius: 7,
            cursor: (!tempSince || !tempUntil) ? "not-allowed" : "pointer",
            background: "var(--ink)", border: "1px solid var(--ink)",
            color: "var(--bg)",
            opacity: (!tempSince || !tempUntil) ? 0.4 : 1,
          }}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="section-header">
      <div className="section-title">{title}</div>
      <div className="section-line" />
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (!data || data.length === 0) return <div className="kpi-spark-wrap" />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100; const h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1 || 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const areaPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <div className="kpi-spark-wrap">
      <svg className="kpi-spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <polygon points={areaPoints} fill="var(--ink)" opacity="0.1" />
        <polyline points={points} fill="none" stroke="var(--ink)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function KPI({ label, value, change, isPositive, sparkData, selected, onClick }: any) {
  return (
    <div className={`kpi ${selected ? "selected" : ""} ${onClick ? "drillable" : ""}`} onClick={onClick}>
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        {change !== undefined && (
          <div className={`kpi-trend ${isPositive ? "up" : "down"}`}>
            {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {sparkData && <Sparkline data={sparkData} />}
    </div>
  );
}

function AdAccountSwitcher({ cfg, selectedAdAccountId, onChange }: any) {
  const [open, setOpen] = useState(false);

  if (!cfg?.adAccounts || cfg.adAccounts.length <= 1) return null;

  const current = cfg.adAccounts.find((a: any) => a.ad_account_id === selectedAdAccountId)
    || cfg.adAccounts.find((a: any) => a.is_default)
    || cfg.adAccounts[0];

  return (
    <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        fontSize: 11, fontWeight: 600,
        textTransform: "uppercase", letterSpacing: "0.08em",
        color: "var(--ink-muted)",
      }}>
        Cuenta publicitaria:
      </div>
      <div className="metric-selector">
        <button
          className={`metric-select-btn ${open ? "open" : ""}`}
          onClick={() => setOpen(!open)}
          style={{ minWidth: 220, fontSize: 13 }}
        >
          <span>{current?.label} · {current?.ad_account_id}</span>
          <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <div className={`metric-dropdown ${open ? "open" : ""}`} style={{ minWidth: 280 }}>
          {cfg.adAccounts.map((acc: any) => (
            <div
              key={acc.id}
              className={`metric-option ${current?.ad_account_id === acc.ad_account_id ? "active" : ""}`}
              onClick={() => { onChange(acc.ad_account_id); setOpen(false); }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 600 }}>{acc.label}</span>
                <span style={{ fontSize: 10, opacity: 0.7, fontFamily: "monospace" }}>
                  {acc.ad_account_id}
                </span>
              </div>
              {current?.ad_account_id === acc.ad_account_id && <span>✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgencyView({ clients, meta, ghl, market, theme, onDrilldown, agency }: any) {

  // Construir métricas dinámicas para la Vista Agencia
  const metricsToShow = buildMetricsToShow(agency?.activeMetrics || [], agency?.customMetrics || []);

  // Si no hay métricas activas para la agencia, mostrar mensaje
  if (metricsToShow.length === 0) {
    return (
      <div className="view">
        <div style={{
          padding: 60, textAlign: "center",
          background: "var(--surface)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 12,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
            No hay métricas activas para la Vista Agencia
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 20 }}>
            Configurá qué métricas mostrar en la vista consolidada desde Settings.
          </div>
          <button
            onClick={() => window.location.href = "/settings"}
            style={{
              background: "var(--ink)", color: "var(--bg)", border: "none",
              padding: "10px 20px", borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Ir a Settings → Métricas
          </button>
        </div>
      </div>
    );
  }

  const [selectedMetric, setSelectedMetric] = useState<string>(metricsToShow[0].id);

  useEffect(() => {
    if (!metricsToShow.find((mm: any) => mm.id === selectedMetric)) {
      setSelectedMetric(metricsToShow[0].id);
    }
  }, [metricsToShow]);

  const totals = useMemo(() => {
    const cur: any = {}, prev: any = {};
    metricsToShow.forEach((m: any) => { cur[m.id] = 0; prev[m.id] = 0; });
    meta.forEach((c: any) => {
      if (!c.current) return;
      cur.spend += c.current.spend || 0;
      cur.linkClicks += c.current.linkClicks || 0;
      cur.leads += c.current.leads || 0;
      cur.landingPageViews += c.current.landingPageViews || 0;
      prev.spend += c.previous?.spend || 0;
      prev.linkClicks += c.previous?.linkClicks || 0;
      prev.leads += c.previous?.leads || 0;
      prev.landingPageViews += c.previous?.landingPageViews || 0;
    });
    cur.costPerLinkClick = cur.linkClicks > 0 ? cur.spend / cur.linkClicks : 0;
    cur.linkCTR = meta.reduce((s: number, c: any) => s + (c.current?.linkCTR || 0), 0) / (meta.length || 1);
    cur.costPerLead = cur.leads > 0 ? cur.spend / cur.leads : 0;
    cur.costPerLandingPageView = cur.landingPageViews > 0 ? cur.spend / cur.landingPageViews : 0;
    prev.costPerLinkClick = prev.linkClicks > 0 ? prev.spend / prev.linkClicks : 0;
    prev.linkCTR = meta.reduce((s: number, c: any) => s + (c.previous?.linkCTR || 0), 0) / (meta.length || 1);
    prev.costPerLead = prev.leads > 0 ? prev.spend / prev.leads : 0;
    prev.costPerLandingPageView = prev.landingPageViews > 0 ? prev.spend / prev.landingPageViews : 0;
    return { current: cur, previous: prev };
  }, [meta]);

  const aggSeries = useMemo(() => {
    const result: Record<string, number[]> = {};
    metricsToShow.forEach((m: any) => {
      const dates: Record<string, number> = {};
      meta.forEach((c: any) => {
        (c.series || []).forEach((p: any) => {
          dates[p.date] = (dates[p.date] || 0) + (p[m.id] || 0);
        });
      });
      result[m.id] = Object.keys(dates).sort().map((k) => dates[k]);
    });
    return result;
  }, [meta]);

  const economics = useMemo(() => {
    let revenue = 0, fees = 0, ventas = 0, pagadas = 0;
    ghl.forEach((c: any) => {
      const cfg = clients.find((cli: any) => cli.name === c.name);
      if (!cfg || !c.current) return;
      const v = (c.current.venta || 0) + (c.current.pagada || 0);
      ventas += v;
      pagadas += c.current.pagada || 0;
      revenue += v * cfg.saleValue;
      fees += v * cfg.feePerSale;
    });
    return { revenue, fees, ventas, pagadas, profit: revenue - totals.current.spend - fees };
  }, [ghl, totals, clients]);

  const selectedDef = metricsToShow.find((m) => m.id === selectedMetric)!;
  const c = totals.current[selectedMetric];
  const p = totals.previous[selectedMetric];
  const { change, isPositive } = calcChange(c, p, selectedDef.lowerBetter);
  const seriesLabels = (meta[0]?.series || []).map((s: any) => s.date);

  return (
    <div className="view">
      <SectionHeader title="Meta Ads · Consolidado" />
      <div className="kpi-grid cols-6">
        {metricsToShow.map((m) => {
          const cur = totals.current[m.id];
          const prev = totals.previous[m.id];
          const { change, isPositive } = calcChange(cur, prev, m.lowerBetter);
          return (
            <KPI key={m.id} label={m.label} value={formatValue(cur, m.format)}
              change={change} isPositive={isPositive} sparkData={aggSeries[m.id]}
              selected={selectedMetric === m.id}
             onClick={() => { setSelectedMetric(m.id as string); onDrilldown(m.id as string); }}
            />
          )
        })}
      </div>

      <SectionHeader title="CRM · Pipeline consolidado" />
      <div className="kpi-grid cols-6">
        {(() => {
          const tot: any = {};
          ghl.forEach((c: any) => {
            ["scheduled", "showed", "venta", "pagada", "noshow", "cancelled"].forEach((k) => {
              tot[k] = (tot[k] || 0) + (c.current?.[k] || 0);
              tot[`prev_${k}`] = (tot[`prev_${k}`] || 0) + (c.previous?.[k] || 0);
            });
          });
          const items = [
            { key: "scheduled", label: "Scheduled" },
            { key: "showed", label: "Showed" },
            { key: "venta", label: "Venta" },
            { key: "pagada", label: "Pagada" },
            { key: "noshow", label: "No-show", lower: true },
            { key: "cancelled", label: "Cancelled", lower: true },
          ];
          return items.map((i) => {
            const { change, isPositive } = calcChange(tot[i.key] || 0, tot[`prev_${i.key}`] || 0, i.lower || false);
            return <KPI key={i.key} label={i.label} value={fmt.number(tot[i.key] || 0)} change={change} isPositive={isPositive} />;
          });
        })()}
      </div>

      <SectionHeader title="Resultado económico agencia" />
      <div className="kpi-grid">
        <KPI label="Revenue total clientes" value={fmt.currency(economics.revenue)} />
        <KPI label="Tu fee total" value={fmt.currency(economics.fees)} />
        <KPI label="Ventas totales" value={fmt.number(economics.ventas)} />
        <KPI label="Pagadas (cobrado)" value={fmt.number(economics.pagadas)} />
      </div>

      <div className="chart-donut-row">
        <MainChart
          eyebrow="Vista consolidada · período seleccionado"
          title={selectedDef.label}
          value={formatValue(c, selectedDef.format)}
          change={change}
          isPositive={isPositive}
          seriesData={aggSeries[selectedMetric] || []}
          seriesLabels={seriesLabels}
          format={selectedDef.format}
          selectedMetric={selectedMetric}
          onSelectMetric={(mm: any) => setSelectedMetric(mm as MetricId)}
          theme={theme}
          metricsToShow={metricsToShow}
        />
        <DonutPanel ghl={ghl} market={market} theme={theme} />
      </div>

      <div className="bottom-panels">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Performance por cliente</div>
              <div className="panel-sub">Spend vs Revenue del período</div>
            </div>
          </div>
          <ClientPerformanceTable clients={clients} meta={meta} ghl={ghl} />
        </div>
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Ventas por cliente</div>
              <div className="panel-sub">Distribución del período</div>
            </div>
          </div>
          <SalesByClientChart clients={clients} ghl={ghl} />
        </div>
      </div>
    </div>
  );
}

function ClientView({ clientId, clients, meta, ghl, market, theme, onDrilldown, selectedAdAccountId, onAdAccountChange }: any) {
  const cfg = clients.find((c: any) => c.id === clientId);
  if (!cfg) return null;

  const m = meta.find((c: any) => c.name === cfg.name);

  // Construir métricas dinámicas a partir de lo que devolvió el backend
  const metricsToShow = buildMetricsToShow(m?.activeMetrics || [], m?.customMetrics || []);

  // Si no hay métricas activas, mostrar mensaje
  if (metricsToShow.length === 0) {
    return (
      <div className="view">
        <AdAccountSwitcher cfg={cfg} selectedAdAccountId={selectedAdAccountId} onChange={onAdAccountChange} />
        <div style={{
          padding: 60, textAlign: "center",
          background: "var(--surface)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 12,
          marginTop: 20,
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 8 }}>
            No hay métricas activas
          </div>
          <div style={{ fontSize: 13, color: "var(--ink-muted)", marginBottom: 20 }}>
            Configurá qué métricas mostrar para esta cuenta publicitaria desde Settings.
          </div>
          <button
            onClick={() => window.location.href = "/settings"}
            style={{
              background: "var(--ink)", color: "var(--bg)", border: "none",
              padding: "10px 20px", borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Ir a Settings → Métricas
          </button>
        </div>
      </div>
    );
  }

  const firstMetricId = metricsToShow[0].id;
  const [selectedMetric, setSelectedMetric] = useState<string>(firstMetricId);

  // Si la métrica seleccionada ya no está activa, resetear
  useEffect(() => {
    if (!metricsToShow.find((mm) => mm.id === selectedMetric)) {
      setSelectedMetric(firstMetricId);
    }
  }, [metricsToShow, selectedMetric, firstMetricId]);
  const g = ghl.find((c: any) => c.name === cfg.name);
  const marketClient = market?.clients?.find((c: any) => c.name === cfg.name);

  const cur = m?.current || {};
  const prev = m?.previous || {};
  const series = m?.series || [];
  const counts = g?.current || {};
  const prevCounts = g?.previous || {};
  const leads = g?.leads || [];

  const ventas = (counts.venta || 0) + (counts.pagada || 0);
  const revenue = ventas * cfg.saleValue;
  const fee = ventas * cfg.feePerSale;
  const profit = revenue - (cur.spend || 0) - fee;

  const selectedDef = metricsToShow.find((mm) => mm.id === selectedMetric) || metricsToShow[0];
  const c = cur[selectedMetric] || 0;
  const p = prev[selectedMetric] || 0;
  const { change, isPositive } = calcChange(c, p, selectedDef.lowerBetter);

  return (
    <div className="view">
      <AdAccountSwitcher cfg={cfg} selectedAdAccountId={selectedAdAccountId} onChange={onAdAccountChange} />

      <SectionHeader title="Meta Ads" />
      <MetricsGrid
        metrics={metricsToShow}
        current={cur}
        previous={prev}
        series={series}
        selectedMetric={selectedMetric}
        onSelectMetric={setSelectedMetric}
      />
      <SectionHeader title="CRM Pipeline" />
      <div className="kpi-grid cols-6">
        {[
          { key: "scheduled", label: "Scheduled" },
          { key: "showed", label: "Showed" },
          { key: "venta", label: "Venta" },
          { key: "pagada", label: "Pagada" },
          { key: "noshow", label: "No-show", lower: true },
          { key: "cancelled", label: "Cancelled", lower: true },
        ].map((i) => {
          const { change, isPositive } = calcChange(counts[i.key] || 0, prevCounts[i.key] || 0, i.lower || false);
          return <KPI key={i.key} label={i.label} value={fmt.number(counts[i.key] || 0)} change={change} isPositive={isPositive} />;
        })}
      </div>

      <SectionHeader title="Resumen económico" />
      <div className="kpi-grid">
        <KPI label="Revenue cliente" value={fmt.currency(revenue)} />
        <KPI label="Ad spend" value={fmt.currency(cur.spend || 0)} />
        <KPI label="Tu fee total" value={fmt.currency(fee)} />
        <KPI label="Profit cliente" value={fmt.currency(profit)} />
      </div>

      <div className="chart-donut-row">
        <MainChart
          eyebrow={`${cfg.name} · período seleccionado`}
          title={selectedDef.label}
          value={formatValue(c, selectedDef.format)}
          change={change}
          isPositive={isPositive}
          seriesData={series.map((s: any) => s[selectedMetric] || 0)}
          seriesLabels={series.map((s: any) => s.date)}
          format={selectedDef.format}
          selectedMetric={selectedMetric}
          onSelectMetric={(mm: any) => setSelectedMetric(mm as MetricId)}
          theme={theme}
          metricsToShow={metricsToShow}
        />
        <DonutPanel ghl={[g].filter(Boolean)} market={marketClient ? { clients: [marketClient], totals: { leads: marketClient.leads, appointments: marketClient.appointments, sales: marketClient.sales } } : null} theme={theme} />
      </div>

      <div className="bottom-panels">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Leads agendados</div>
              <div className="panel-sub">{leads.length} en el período</div>
            </div>
          </div>
          <LeadsTable leads={leads} />
        </div>
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Distribución por estado</div>
              <div className="panel-sub">Pipeline del cliente</div>
            </div>
          </div>
          <PipelineDonut ghl={[g].filter(Boolean)} />
        </div>
      </div>
    </div>
  );
}

function MainChart({ eyebrow, title, value, change, isPositive, seriesData, seriesLabels, format, selectedMetric, onSelectMetric, theme, metricsToShow }: any) {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const ChartLib = (await import("chart.js/auto")).default;
      if (!mounted || !canvasRef.current) return;
      if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      const isDark = theme === "dark";
      const ink = isDark ? "#ffffff" : "#000000";
      const grid = isDark ? "#1a1a1a" : "#f0f0f0";
      const inkMuted = isDark ? "#8a8a8a" : "#6b6b6b";

      const grad = ctx.createLinearGradient(0, 0, 0, 280);
      grad.addColorStop(0, isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)");
      grad.addColorStop(1, isDark ? "rgba(255,255,255,0)" : "rgba(0,0,0,0)");

      chartRef.current = new ChartLib(ctx, {
        type: "line",
        data: {
          labels: seriesLabels,
          datasets: [{
            data: seriesData,
            borderColor: ink, backgroundColor: grad,
            borderWidth: 2, fill: true, tension: 0.35,
            pointRadius: 0, pointHoverRadius: 5,
            pointHoverBackgroundColor: ink,
            pointHoverBorderColor: isDark ? "#000" : "#fff",
            pointHoverBorderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? "#0f0f0f" : "#ffffff",
              titleColor: ink, bodyColor: ink,
              borderColor: isDark ? "#2a2a2a" : "#d8d8d8",
              borderWidth: 1, padding: 12, displayColors: false,
              titleFont: { size: 11, weight: 600 },
              bodyFont: { size: 13, weight: 700 },
              callbacks: {
                title: (items: any) => {
                  const date = items[0].label;
                  const d = new Date(date);
                  return d.toLocaleDateString("es-US", { weekday: "short", day: "numeric", month: "short" });
                },
                label: (ctx: any) => {
                  const v = ctx.parsed.y;
                  if (format === "currency") return fmt.currency(v);
                  if (format === "currency2") return fmt.currency2(v);
                  if (format === "number") return fmt.number(v);
                  if (format === "percent") return fmt.percent(v);
                  return String(v);
                },
              },
            },
          },
          scales: {
            x: { grid: { color: grid, lineWidth: 1 }, ticks: { color: inkMuted, font: { size: 10 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }, border: { display: false } },
            y: { grid: { color: grid, lineWidth: 1 }, ticks: { color: inkMuted, font: { size: 10 } }, border: { display: false } },
          },
        },
      });
    })();
    return () => { mounted = false; if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [seriesData, seriesLabels, format, theme]);

  return (
    <div className="main-chart">
      <div className="main-chart-header">
        <div className="main-chart-title-block">
          <div className="main-chart-eyebrow">{eyebrow}</div>
          <div className="main-chart-title">{title}</div>
          <div className="main-chart-value">
            {value}
            {change !== 0 && (
              <span className={`kpi-trend ${isPositive ? "up" : "down"}`} style={{ marginLeft: 12, fontSize: 12, verticalAlign: "middle" }}>
                {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="metric-selector">
          <button className={`metric-select-btn ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
            <span>{metricsToShow.find((m) => m.id === selectedMetric)?.label}</span>
            <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div className={`metric-dropdown ${open ? "open" : ""}`}>
            {metricsToShow.map((m) => (
              <div key={m.id} className={`metric-option ${selectedMetric === m.id ? "active" : ""}`} onClick={() => { onSelectMetric(m.id); setOpen(false); }}>
                <span>{m.label}</span>
                {selectedMetric === m.id && <span>✓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="main-chart-canvas">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}

const DONUT_OPTIONS = [
  { key: "pipeline", label: "Pipeline · Estados" },
  { key: "market_leads", label: "Mercado · Leads" },
  { key: "market_appointments", label: "Mercado · Appointments" },
  { key: "market_sales", label: "Mercado · Sales" },
] as const;

function DonutPanel({ ghl, market, theme }: any) {
  const [selected, setSelected] = useState<string>("pipeline");
  const [open, setOpen] = useState(false);

  return (
    <div className="donut-panel">
      <div className="donut-panel-header">
        <div>
          <div className="donut-panel-title">Distribución</div>
          <div className="donut-panel-sub">Análisis del período</div>
        </div>
        <div className="metric-selector">
          <button className={`metric-select-btn ${open ? "open" : ""}`} onClick={() => setOpen(!open)} style={{ minWidth: 160, fontSize: 12, padding: "8px 12px" }}>
            <span>{DONUT_OPTIONS.find((o) => o.key === selected)?.label}</span>
            <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div className={`metric-dropdown ${open ? "open" : ""}`}>
            {DONUT_OPTIONS.map((o) => (
              <div key={o.key} className={`metric-option ${selected === o.key ? "active" : ""}`} onClick={() => { setSelected(o.key); setOpen(false); }}>
                <span>{o.label}</span>
                {selected === o.key && <span>✓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="donut-content">
        {selected === "pipeline" && <PipelineDonut ghl={ghl} />}
        {selected === "market_leads" && <MarketDonut market={market} kind="leads" />}
        {selected === "market_appointments" && <MarketDonut market={market} kind="appointments" />}
        {selected === "market_sales" && <MarketDonut market={market} kind="sales" />}
      </div>
    </div>
  );
}

function DonutSVG({ segments }: { segments: { key: string; label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>Sin datos en este período</div>;
  }

  const radius = 70, cx = 100, cy = 100, strokeWidth = 24;

  if (segments.length === 1) {
    return (
      <div style={{ display: "flex", gap: 16, alignItems: "center", height: "100%", flexWrap: "wrap" }}>
        <svg viewBox="0 0 200 200" style={{ width: 160, height: 160, flexShrink: 0 }}>
          <circle cx={cx} cy={cy} r={radius} stroke={segments[0].color} strokeWidth={strokeWidth} fill="none" />
          <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--ink)" fontSize="22" fontWeight="700">{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--ink-muted)" fontSize="10" letterSpacing="0.1em">TOTAL</text>
        </svg>
        <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: segments[0].color, flexShrink: 0, border: "1px solid var(--border-strong)" }} />
            <span style={{ flex: 1, color: "var(--ink)" }}>{segments[0].label}</span>
            <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>
              {segments[0].value} (100%)
            </span>
          </div>
        </div>
      </div>
    );
  }

  let cumPercent = 0;
  const arcs = segments.map((s) => {
    const startAngle = cumPercent * 2 * Math.PI;
    const percent = s.value / total;
    cumPercent += percent;
    const endAngle = cumPercent * 2 * Math.PI;
    const x1 = cx + radius * Math.cos(startAngle - Math.PI / 2);
    const y1 = cy + radius * Math.sin(startAngle - Math.PI / 2);
    const x2 = cx + radius * Math.cos(endAngle - Math.PI / 2);
    const y2 = cy + radius * Math.sin(endAngle - Math.PI / 2);
    const largeArc = percent > 0.5 ? 1 : 0;
    return { ...s, d: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`, percent: percent * 100 };
  });

  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", height: "100%", flexWrap: "wrap" }}>
      <svg viewBox="0 0 200 200" style={{ width: 160, height: 160, flexShrink: 0 }}>
        {arcs.map((a) => (
          <path key={a.key} d={a.d} stroke={a.color} strokeWidth={strokeWidth} fill="none" />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--ink)" fontSize="22" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--ink-muted)" fontSize="10" letterSpacing="0.1em">TOTAL</text>
      </svg>
      <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 8 }}>
        {arcs.map((a) => (
          <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: a.color, flexShrink: 0, border: "1px solid var(--border-strong)" }} />
            <span style={{ flex: 1, color: "var(--ink)" }}>{a.label}</span>
            <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>
              {a.value} ({a.percent.toFixed(0)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineDonut({ ghl }: { ghl: any[] }) {
  const totals: any = ghl.reduce((acc, c: any) => {
    if (!c?.current) return acc;
    ["scheduled", "showed", "venta", "pagada", "noshow", "cancelled"].forEach((k) => {
      acc[k] = (acc[k] || 0) + (c.current[k] || 0);
    });
    return acc;
  }, {});

  const segments = [
    { key: "scheduled", label: "Scheduled", value: totals.scheduled || 0, color: "#8a8a8a" },
    { key: "showed", label: "Showed", value: totals.showed || 0, color: "#bdbdbd" },
    { key: "venta", label: "Venta", value: totals.venta || 0, color: "#ffffff" },
    { key: "pagada", label: "Pagada", value: totals.pagada || 0, color: "#e0e0e0" },
    { key: "noshow", label: "No Show", value: totals.noshow || 0, color: "#555555" },
    { key: "cancelled", label: "Cancelled", value: totals.cancelled || 0, color: "#3a3a3a" },
  ].filter((s) => s.value > 0);

  return <DonutSVG segments={segments} />;
}

function MarketDonut({ market, kind }: { market: any; kind: "leads" | "appointments" | "sales" }) {
  if (!market?.totals) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>Sin datos de mercado</div>;
  }

  const data = market.totals[kind] || {};
  const segments: any[] = [
    { key: "english", label: "English", value: data.english || 0, color: "#ffffff" },
    { key: "spanish", label: "Español", value: data.spanish || 0, color: "#8a8a8a" },
  ];
  if (kind === "leads" && data.unknown > 0) {
    segments.push({ key: "unknown", label: "Sin idioma", value: data.unknown, color: "#3a3a3a" });
  }

  return <DonutSVG segments={segments.filter((s) => s.value > 0)} />;
}

function LeadsTable({ leads }: { leads: any[] }) {
  const [showHidden, setShowHidden] = useState(true);
  const visible = showHidden ? leads : leads.filter((l: any) => l.status !== "cancelled" && l.status !== "noshow");

  if (leads.length === 0) {
    return <div style={{ padding: 24, textAlign: "center", color: "var(--ink-muted)", fontSize: 13 }}>No hay leads agendados en este período</div>;
  }

  const statusLabel = (s: string) => ({
    scheduled: "Scheduled", showed: "Showed", venta: "Venta", pagada: "Pagada", noshow: "No Show", cancelled: "Cancelled",
  } as any)[s] || s;

  return (
    <>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <button onClick={() => setShowHidden(!showHidden)} style={{
          background: "transparent", border: "1px solid var(--border-strong)",
          color: "var(--ink-muted)", padding: "6px 12px", borderRadius: 6,
          fontSize: 11, cursor: "pointer", fontFamily: "inherit",
        }}>
          {showHidden ? "Ocultar canc/no-show" : "Mostrar todo"}
        </button>
      </div>
      <div className="leads-table-wrap">
        <table className="leads-table">
          <thead><tr><th>Lead</th><th>Fecha</th><th>Estado</th></tr></thead>
          <tbody>
            {visible.map((l: any) => (
              <tr key={l.appointmentId}>
                <td style={{ fontWeight: 500 }}>{l.name}</td>
                <td style={{ color: "var(--ink-muted)" }}>
                  {new Date(l.startTime).toLocaleDateString("es-US", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td>
                  <span className={`lead-status status-${l.status}`}>
                    <span className="lead-status-dot" />
                    {statusLabel(l.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ClientPerformanceTable({ clients, meta, ghl }: any) {
  return (
    <div className="leads-table-wrap">
      <table className="leads-table">
        <thead><tr><th>Cliente</th><th>Spend</th><th>Ventas</th><th>Revenue</th></tr></thead>
        <tbody>
          {clients.map((cfg: any) => {
            const m = meta.find((x: any) => x.name === cfg.name);
            const g = ghl.find((x: any) => x.name === cfg.name);
            const ventas = (g?.current?.venta || 0) + (g?.current?.pagada || 0);
            const revenue = ventas * cfg.saleValue;
            return (
              <tr key={cfg.id}>
                <td style={{ fontWeight: 500 }}>{cfg.name}</td>
                <td style={{ color: "var(--ink-muted)" }}>{fmt.currency(m?.current?.spend || 0)}</td>
                <td>{ventas}</td>
                <td style={{ fontWeight: 600 }}>{fmt.currency(revenue)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SalesByClientChart({ clients, ghl }: any) {
  const data = clients.map((cfg: any) => {
    const g = ghl.find((x: any) => x.name === cfg.name);
    const ventas = (g?.current?.venta || 0) + (g?.current?.pagada || 0);
    return { name: cfg.name, value: ventas };
  });
  const max = Math.max(...data.map((d: any) => d.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "12px 0" }}>
      {data.map((d: any) => (
        <div key={d.name}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{d.name}</span>
            <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>{d.value}</span>
          </div>
          <div style={{ height: 8, background: "var(--bg-elevated)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${(d.value / max) * 100}%`,
              background: "var(--ink)",
              borderRadius: 4,
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function DrilldownModal({ metric, clients, meta, ghl, onClose }: any) {
  const def = metricsToShow.find((m) => m.id === metric)!;
  const rows = clients.map((cfg: any) => {
    const m = meta.find((x: any) => x.name === cfg.name);
    return {
      name: cfg.name,
      state: cfg.stateCode,
      current: m?.current?.[metric] || 0,
      previous: m?.previous?.[metric] || 0,
    };
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">{def.label}</div>
            <div className="modal-subtitle">Detalle por cliente · período actual vs anterior</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <table className="leads-table">
          <thead>
            <tr><th>Cliente</th><th>Estado</th><th>Período actual</th><th>Período anterior</th><th>Cambio</th></tr>
          </thead>
          <tbody>
            {rows.map((r: any) => {
              const { change, isPositive } = calcChange(r.current, r.previous, def.lowerBetter);
              return (
                <tr key={r.name}>
                  <td style={{ fontWeight: 500 }}>{r.name}</td>
                  <td style={{ color: "var(--ink-muted)" }}>{r.state}</td>
                  <td style={{ fontWeight: 600 }}>{formatValue(r.current, def.format)}</td>
                  <td style={{ color: "var(--ink-muted)" }}>{formatValue(r.previous, def.format)}</td>
                  <td>
                    <span className={`kpi-trend ${isPositive ? "up" : "down"}`}>
                      {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
  }
  // ============================================================ metricsToShow GRID ============================================================
function MetricsGrid({ metrics, current, previous, series, selectedMetric, onSelectMetric }: {
  metrics: MetricDef[];
  current: any;
  previous: any;
  series: any[];
  selectedMetric: string;
  onSelectMetric: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const visible = metrics.slice(0, 8);
  const hidden = metrics.slice(8);

  return (
    <>
      <div className="kpi-grid cols-6">
        {visible.map((mm) => {
          const v = Number(current?.[mm.id] || 0);
          const pv = Number(previous?.[mm.id] || 0);
          const { change, isPositive } = calcChange(v, pv, mm.lowerBetter);
          const sparkData = series.map((s: any) => Number(s?.[mm.id] || 0));
          return (
            <KPI key={mm.id} label={mm.label} value={formatValue(v, mm.format)}
              change={change} isPositive={isPositive} sparkData={sparkData}
              selected={selectedMetric === mm.id}
              onClick={() => onSelectMetric(mm.id)} />
          );
        })}
      </div>

      {hidden.length > 0 && (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
          <button
            onClick={() => setShowAll(true)}
            style={{
              background: "transparent",
              border: "1px solid var(--border-strong)",
              color: "var(--ink-muted)",
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Ver todas (+{hidden.length})
          </button>
        </div>
      )}

      {showAll && (
        <div className="modal-overlay" onClick={() => setShowAll(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Todas las métricas ({metrics.length})</div>
                <div className="modal-subtitle">Clic en una métrica para verla en el gráfico principal</div>
              </div>
              <button className="modal-close" onClick={() => setShowAll(false)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="kpi-grid cols-6">
              {metrics.map((mm) => {
                const v = Number(current?.[mm.id] || 0);
                const pv = Number(previous?.[mm.id] || 0);
                const { change, isPositive } = calcChange(v, pv, mm.lowerBetter);
                const sparkData = series.map((s: any) => Number(s?.[mm.id] || 0));
                return (
                  <KPI key={mm.id} label={mm.label} value={formatValue(v, mm.format)}
                    change={change} isPositive={isPositive} sparkData={sparkData}
                    selected={selectedMetric === mm.id}
                    onClick={() => { onSelectMetric(mm.id); setShowAll(false); }} />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
// ============================================================ PDF EXPORT MODAL ============================================================
// ============================================================ PDF EXPORT MODAL ============================================================
// ============================================================ PDF EXPORT MODAL ============================================================
function PdfExportModal({ onClose, isAgency, cfg, clients, meta, ghl, agency, range, selectedAdAccountId, exporting, setExporting }: any) {
  const [analysis, setAnalysis] = useState("");
  const [error, setError] = useState("");

  async function handleExport() {
    setError("");
    setExporting(true);

    try {
      // Calcular rango de fechas
      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      let since: string, until: string;
      if (range.preset === "custom" && range.since && range.until) {
        since = range.since;
        until = range.until;
      } else {
        const todayStr = toDateStr(today);
        switch (range.preset) {
          case "today": since = todayStr; until = todayStr; break;
          case "last_30d": since = toDateStr(new Date(today.getTime() - 29 * 86400000)); until = todayStr; break;
          case "this_month": since = toDateStr(new Date(today.getFullYear(), today.getMonth(), 1)); until = todayStr; break;
          default: since = toDateStr(new Date(today.getTime() - 6 * 86400000)); until = todayStr;
        }
      }

      // Construir contexto del reporte
      let clientName: string, state: string;
      let metricsToExport: any[] = [];
      let pipeline: any = undefined;
      let economics: any = undefined;
      let avatarUrl: string | null = null;
      if (isAgency) {
        clientName = "Vista Agencia · Consolidado";
        state = `${clients.length} clientes activos`;

        // Build métricas dinámicas para agencia
        const metricsToShow = buildMetricsToShow(agency?.activeMetrics || [], agency?.customMetrics || []);

        // Sumar totales de todos los clientes
        const totalCurrent: any = {};
        const totalPrevious: any = {};
        const totalSeries: Record<string, Record<string, number>> = {};
        metricsToShow.forEach((m: any) => {
          totalCurrent[m.id] = 0;
          totalPrevious[m.id] = 0;
          totalSeries[m.id] = {};
        });
        meta.forEach((c: any) => {
          metricsToShow.forEach((m: any) => {
            totalCurrent[m.id] += Number(c.current?.[m.id] || 0);
            totalPrevious[m.id] += Number(c.previous?.[m.id] || 0);
          });
          (c.series || []).forEach((p: any) => {
            metricsToShow.forEach((m: any) => {
              totalSeries[m.id][p.date] = (totalSeries[m.id][p.date] || 0) + Number(p[m.id] || 0);
            });
          });
        });
        // Recalcular métricas derivadas (CPC, CTR, etc.) para no sumarlas mal
    const recalcDerived = (totals: any) => {
          const spend = totals.spend || 0;
          const clicks = totals.clicks || 0;
          const linkClicks = totals.linkClicks || 0;
          const impressions = totals.impressions || 0;
          const reach = totals.reach || 0;
          const leads = totals.leads || 0;
          const lpv = totals.landingPageViews || 0;
          const uniqueClicks = totals.uniqueClicks || 0;
          const outboundClicks = totals.outboundClicks || 0;
          const messagingStarted = totals.messagingStarted || 0;
          const thruplays = totals.thruplays || 0;

          // Costos
          if (clicks > 0) totals.cpc = spend / clicks;
          if (impressions > 0) totals.cpm = (spend / impressions) * 1000;
          if (reach > 0) totals.cpp = (spend / reach) * 1000;
          if (linkClicks > 0) totals.costPerLinkClick = spend / linkClicks;
          if (leads > 0) totals.costPerLead = spend / leads;
          if (lpv > 0) totals.costPerLandingPageView = spend / lpv;
          if (thruplays > 0) totals.costPerThruplay = spend / thruplays;
          if (messagingStarted > 0) totals.costPerMessagingStart = spend / messagingStarted;

          // CTRs
          if (impressions > 0) totals.ctr = (clicks / impressions) * 100;
          if (impressions > 0) totals.linkCTR = (linkClicks / impressions) * 100;
          if (impressions > 0) totals.uniqueCTR = (uniqueClicks / impressions) * 100;
          if (impressions > 0) totals.outboundClicksCTR = (outboundClicks / impressions) * 100;

          // Frecuencia
          if (reach > 0) totals.frequency = impressions / reach;
        };
        
        recalcDerived(totalCurrent);
        recalcDerived(totalPrevious);
// Recalcular linkCTR y ctr usando promedio simple (igual que el dashboard)
        const recalcAsAverage = (totals: any, key: "current" | "previous") => {
          let sumLinkCTR = 0, sumCTR = 0, count = 0;
          meta.forEach((c: any) => {
            const data = c[key] || {};
            sumLinkCTR += Number(data.linkCTR || 0);
            sumCTR += Number(data.ctr || 0);
            count++;
          });
          if (count > 0) {
            totals.linkCTR = sumLinkCTR / count;
            totals.ctr = sumCTR / count;
          }
        };
        recalcAsAverage(totalCurrent, "current");
        recalcAsAverage(totalPrevious, "previous");

        const labels = Object.keys(totalSeries[metricsToShow[0]?.id] || {}).sort();
        metricsToExport = metricsToShow.map((m: any) => ({
          id: m.id,
          label: m.label,
          format: m.format,
          lowerBetter: m.lowerBetter,
          current: totalCurrent[m.id],
          previous: totalPrevious[m.id],
          series: labels.map((d) => totalSeries[m.id][d] || 0),
          seriesLabels: labels,
        }));

        // Pipeline consolidado
        const pipe: any = { scheduled: 0, showed: 0, venta: 0, pagada: 0, noshow: 0, cancelled: 0 };
        const prevPipe: any = { scheduled: 0, showed: 0, venta: 0, pagada: 0, noshow: 0, cancelled: 0 };
        ghl.forEach((g: any) => {
          if (!g?.current) return;
          ["scheduled", "showed", "venta", "pagada", "noshow", "cancelled"].forEach((k) => {
            pipe[k] += g.current[k] || 0;
            prevPipe[k] += g.previous?.[k] || 0;
          });
        });
        pipeline = {
          ...pipe,
          prev_scheduled: prevPipe.scheduled,
          prev_showed: prevPipe.showed,
          prev_venta: prevPipe.venta,
          prev_pagada: prevPipe.pagada,
          prev_noshow: prevPipe.noshow,
          prev_cancelled: prevPipe.cancelled,
        };

        // Economics agencia
        let revenue = 0, fees = 0, ventas = 0, pagadas = 0;
        ghl.forEach((c: any) => {
          const clientCfg = clients.find((cli: any) => cli.name === c.name);
          if (!clientCfg || !c.current) return;
          const v = (c.current.venta || 0) + (c.current.pagada || 0);
          ventas += v;
          pagadas += c.current.pagada || 0;
          revenue += v * clientCfg.saleValue;
          fees += v * clientCfg.feePerSale;
        });
       // Calcular revenue de pagadas (solo deals cobrados)
        let revenuePagadas = 0;
        ghl.forEach((c: any) => {
          const clientCfg = clients.find((cli: any) => cli.name === c.name);
          if (!clientCfg || !c.current) return;
          revenuePagadas += (c.current.pagada || 0) * clientCfg.saleValue;
        });

        economics = {
          revenue,
          spend: fees,
          fee: ventas,
          profit: revenuePagadas,
          label1: "Revenue total clientes",
          label2: "Tu fee total",
          label3: "Ventas totales",
          label4: "Pagadas (cobrado)",
        };
      } else {
        if (!cfg) { setError("No client selected"); setExporting(false); return; }
        clientName = cfg.name;
        state = cfg.state;
        avatarUrl = cfg.avatarUrl || null;

        const m = meta.find((c: any) => c.name === cfg.name);
        const metricsToShow = buildMetricsToShow(m?.activeMetrics || [], m?.customMetrics || []);

        metricsToExport = metricsToShow.map((mm: any) => ({
          id: mm.id,
          label: mm.label,
          format: mm.format,
          lowerBetter: mm.lowerBetter,
          current: Number(m?.current?.[mm.id] || 0),
          previous: Number(m?.previous?.[mm.id] || 0),
          series: (m?.series || []).map((s: any) => Number(s[mm.id] || 0)),
          seriesLabels: (m?.series || []).map((s: any) => s.date),
        }));

        const g = ghl.find((c: any) => c.name === cfg.name);
        if (g?.current) {
          pipeline = {
            scheduled: g.current.scheduled || 0,
            showed: g.current.showed || 0,
            venta: g.current.venta || 0,
            pagada: g.current.pagada || 0,
            noshow: g.current.noshow || 0,
            cancelled: g.current.cancelled || 0,
            prev_scheduled: g.previous?.scheduled || 0,
            prev_showed: g.previous?.showed || 0,
            prev_venta: g.previous?.venta || 0,
            prev_pagada: g.previous?.pagada || 0,
            prev_noshow: g.previous?.noshow || 0,
            prev_cancelled: g.previous?.cancelled || 0,
          };
        }

        const ventas = (g?.current?.venta || 0) + (g?.current?.pagada || 0);
        const revenue = ventas * cfg.saleValue;
        const fee = ventas * cfg.feePerSale;
        const spend = m?.current?.spend || 0;
        economics = {
          revenue, spend, fee, profit: revenue - spend - fee,
          label1: "Revenue cliente", label2: "Ad spend", label3: "Tu fee total", label4: "Profit cliente",
        };
      }

      // Métrica principal: la primera o la "spend"
      const mainMetricId = metricsToExport.find((m) => m.id === "spend")?.id || metricsToExport[0]?.id;

      const filenameSlug = isAgency ? "agencia" : clientName.toLowerCase().replace(/\s+/g, "-");
      const dateSlug = new Date().toISOString().split("T")[0];
      const filename = `${filenameSlug}-reporte-${dateSlug}.pdf`;

      // Cerrar el modal antes de exportar
      onClose();
      await new Promise((r) => setTimeout(r, 300));

      await exportFullReport({
        clientName,
        state,
        period: { since, until },
        isAgency,
        avatarUrl,
        metrics: metricsToExport,
        mainMetricId,
        pipeline,
        economics,
        analysis: analysis.trim() || undefined,
      }, filename);
    } catch (e: any) {
      setError(e.message || "Error generating PDF");
      setExporting(false);
    }
    setExporting(false);
  }

  return (
    <div className="modal-overlay" onClick={() => !exporting && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Export PDF</div>
            <div className="modal-subtitle">
              Generá un reporte profesional con los datos del período seleccionado
            </div>
          </div>
          <button className="modal-close" onClick={() => !exporting && onClose()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 600,
              textTransform: "uppercase", letterSpacing: "0.06em",
              color: "var(--ink-muted)", marginBottom: 8,
            }}>
              Análisis y conclusiones (opcional)
            </label>
            <textarea
              value={analysis}
              onChange={(e) => setAnalysis(e.target.value)}
              placeholder={`Escribí acá tu análisis del período.\n\nFormato soportado:\n# Título grande\n## Subtítulo\n### Sub-subtítulo\n**texto en negrita**\n*texto en itálica*\n- Bullet 1\n- Bullet 2`}
              rows={12}
              disabled={exporting}
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-strong)",
                borderRadius: 8,
                padding: "12px 14px",
                fontSize: 13,
                color: "var(--ink)",
                fontFamily: "inherit",
                outline: "none",
                resize: "vertical",
                minHeight: 200,
                lineHeight: 1.6,
              }}
            />
            <div style={{ fontSize: 10, color: "var(--ink-dim)", marginTop: 6, lineHeight: 1.5 }}>
              Soporta Markdown básico: <code>**negrita**</code>, <code>*itálica*</code>, <code># Título</code>, <code>- Lista</code>.
              Si dejás el campo vacío, el PDF no incluirá página de análisis.
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 16, padding: 12,
            background: "rgba(255,80,80,0.1)",
            border: "1px solid rgba(255,80,80,0.3)",
            color: "#ff8080",
            borderRadius: 8,
            fontSize: 12,
          }}>
            {error}
          </div>
        )}

        {exporting && (
          <div style={{
            marginTop: 16, padding: 12,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12, color: "var(--ink-muted)", textAlign: "center",
          }}>
            Generando PDF... esto puede tardar unos segundos
          </div>
        )}

        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 8,
          marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)",
        }}>
          <button onClick={onClose} disabled={exporting} style={{
            background: "transparent",
            border: "1px solid var(--border-strong)",
            color: "var(--ink-muted)",
            padding: "10px 16px", borderRadius: 8,
            fontSize: 13, cursor: exporting ? "not-allowed" : "pointer",
            fontFamily: "inherit",
          }}>Cancelar</button>
          <button onClick={handleExport} disabled={exporting} style={{
            background: "var(--ink)",
            color: "var(--bg)",
            border: "none",
            padding: "10px 20px", borderRadius: 8,
            fontSize: 13, fontWeight: 600,
            cursor: exporting ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            opacity: exporting ? 0.6 : 1,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? "Generando..." : "Generar PDF"}
          </button>
        </div>
      </div>
    </div>
  );
}