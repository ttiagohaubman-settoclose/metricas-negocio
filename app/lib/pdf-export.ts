import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// ============================================================
// Tipos
// ============================================================
export type ExportMetric = {
  id: string;
  label: string;
  format: string;
  lowerBetter: boolean;
  current: number;
  previous: number;
  series: number[]; // valores por día
  seriesLabels: string[]; // fechas YYYY-MM-DD
};

export type ExportContext = {
  clientName: string;
  state: string;
  period: { since: string; until: string };
  isAgency: boolean;
  avatarUrl?: string | null;
  // Métricas activas para mostrar (las del dashboard)
  metrics: ExportMetric[];
  // La métrica principal seleccionada (para el gráfico grande)
  mainMetricDef?: string;
  // Pipeline CRM
  pipeline?: {
    scheduled: number; showed: number; venta: number;
    pagada: number; noshow: number; cancelled: number;
    // previos para % cambio
    prev_scheduled?: number; prev_showed?: number; prev_venta?: number;
    prev_pagada?: number; prev_noshow?: number; prev_cancelled?: number;
  };
  // Resumen económico cliente o agencia
  economics?: {
    revenue: number; spend: number; fee: number; profit: number;
    label1?: string; label2?: string; label3?: string; label4?: string;
  };
  // Análisis (markdown)
  analysis?: string;
};

// ============================================================
// Helpers de formato
// ============================================================
async function loadLogo(): Promise<string | null> {
  try {
    const res = await fetch("/settoclose-logo-black.png");
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

function formatValue(value: number, format: string): string {
  if (format === "currency") return "$" + Math.round(value).toLocaleString("en-US");
  if (format === "currency2") return "$" + value.toFixed(2);
  if (format === "number") return Math.round(value).toLocaleString("en-US");
  if (format === "percent") return value.toFixed(2) + "%";
  if (format === "decimal") return value.toFixed(2);
  return String(value);
}

function formatCurrency(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function calcChange(cur: number, prev: number, lowerBetter: boolean) {
  if (prev === 0) return { change: 0, isPositive: cur > 0 ? !lowerBetter : false };
  const change = ((cur - prev) / prev) * 100;
  return { change, isPositive: lowerBetter ? change < 0 : change > 0 };
}

function formatPeriodDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("es-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatShortDate(s: string): string {
  const d = new Date(s + "T00:00:00");
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ============================================================
// Markdown render
// ============================================================
function escapeHtml(t: string) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function processInline(text: string): string {
  let result = escapeHtml(text);
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 600; color: #000;">$1</strong>');
  result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em style="font-style: italic;">$1</em>');
  return result;
}

function renderMarkdown(markdown: string): string {
  if (!markdown.trim()) return "";
  const lines = markdown.split("\n");
  const html: string[] = [];
  let inList = false;
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push('<div style="height: 8px;"></div>');
      continue;
    }
    if (line.startsWith("### ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3 style="font-size: 13px; font-weight: 600; margin: 14px 0 6px 0; color: #000;">${processInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h2 style="font-size: 15px; font-weight: 700; margin: 18px 0 8px 0; color: #000;">${processInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h1 style="font-size: 18px; font-weight: 700; margin: 20px 0 10px 0; color: #000;">${processInline(line.slice(2))}</h1>`);
      continue;
    }
    if (line.trimStart().startsWith("- ")) {
      const content = line.trimStart().slice(2);
      if (!inList) { html.push('<ul style="margin: 6px 0; padding-left: 18px; list-style: none;">'); inList = true; }
      html.push(`<li style="font-size: 12px; line-height: 1.7; color: #1a1a1a; margin-bottom: 4px; position: relative;"><span style="position: absolute; left: -14px; color: #666;">•</span>${processInline(content)}</li>`);
      continue;
    }
    if (inList) { html.push("</ul>"); inList = false; }
    html.push(`<p style="font-size: 12px; line-height: 1.7; color: #1a1a1a; margin: 0 0 6px 0;">${processInline(line)}</p>`);
  }
  if (inList) html.push("</ul>");
  return html.join("");
}

// ============================================================
// Construir SVG del gráfico con ejes X e Y
// ============================================================
function buildChartSVG(metric: ExportMetric): string {
  const data = metric.series;
  const labels = metric.seriesLabels;

  const W = 700, H = 220;
  const padTop = 12, padRight = 12, padBottom = 28, padLeft = 50;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  if (data.length === 0) {
    return `<div style="width: ${W}px; height: ${H}px; display: flex; align-items: center; justify-content: center; color: #999; font-size: 12px;">Sin datos en este período</div>`;
  }

  const max = Math.max(...data, 1);
  const min = Math.min(0, Math.min(...data));
  const range = max - min || 1;

  // Coordenadas de cada punto
  const points = data.map((v, i) => {
    const x = padLeft + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW);
    const y = padTop + chartH - ((v - min) / range) * chartH;
    return { x, y, v, label: labels[i] };
  });

  const pathLine = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const pathArea = `${pathLine} L ${points[points.length - 1].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} L ${points[0].x.toFixed(1)} ${(padTop + chartH).toFixed(1)} Z`;

  // Ejes Y: 4 valores
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const v = min + range * (1 - t);
    const y = padTop + chartH * t;
    return { v, y };
  });

  // Ejes X: máximo 6 fechas equiespaciadas
  const maxXTicks = Math.min(6, labels.length);
  const step = Math.max(1, Math.floor(labels.length / maxXTicks));
  const xTicks: { x: number; label: string }[] = [];
  for (let i = 0; i < labels.length; i += step) {
    const x = padLeft + (labels.length === 1 ? chartW / 2 : (i / (labels.length - 1)) * chartW);
    xTicks.push({ x, label: formatShortDate(labels[i]) });
  }
  // Asegurar que el último siempre esté
  if (xTicks[xTicks.length - 1].label !== formatShortDate(labels[labels.length - 1])) {
    const i = labels.length - 1;
    const x = padLeft + chartW;
    xTicks.push({ x, label: formatShortDate(labels[i]) });
  }

  const fmtTickValue = (v: number) => {
    if (metric.format === "currency") return "$" + Math.round(v).toLocaleString("en-US");
    if (metric.format === "currency2") return "$" + v.toFixed(2);
    if (metric.format === "percent") return v.toFixed(1) + "%";
    if (metric.format === "decimal") return v.toFixed(1);
    return Math.round(v).toLocaleString("en-US");
  };

  return `
    <svg viewBox="0 0 ${W} ${H}" style="width: 100%; max-width: ${W}px; height: auto; display: block;" xmlns="http://www.w3.org/2000/svg" font-family="Poppins, sans-serif">
      <!-- Y grid lines -->
      ${yTicks.map((t) => `
        <line x1="${padLeft}" y1="${t.y.toFixed(1)}" x2="${(padLeft + chartW).toFixed(1)}" y2="${t.y.toFixed(1)}"
              stroke="#eaeaea" stroke-width="1" />
      `).join("")}

      <!-- Área bajo la curva -->
      <path d="${pathArea}" fill="#000" fill-opacity="0.08" />

      <!-- Línea principal -->
      <path d="${pathLine}" stroke="#000" stroke-width="1.5" fill="none" stroke-linejoin="round" stroke-linecap="round" />

      <!-- Puntos -->
      ${points.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="2" fill="#000" />`).join("")}

      <!-- Eje Y labels -->
      ${yTicks.map((t) => `
        <text x="${(padLeft - 6).toFixed(0)}" y="${(t.y + 3).toFixed(0)}"
              text-anchor="end" font-size="9" fill="#666">${fmtTickValue(t.v)}</text>
      `).join("")}

      <!-- Eje X labels -->
      ${xTicks.map((t) => `
        <text x="${t.x.toFixed(1)}" y="${(H - 8).toFixed(0)}"
              text-anchor="middle" font-size="9" fill="#666">${t.label}</text>
      `).join("")}

      <!-- Eje X line -->
      <line x1="${padLeft}" y1="${(padTop + chartH).toFixed(0)}"
            x2="${(padLeft + chartW).toFixed(0)}" y2="${(padTop + chartH).toFixed(0)}"
            stroke="#000" stroke-width="1" />
    </svg>
  `;
}

// ============================================================
// Construir KPI Card (HTML)
// ============================================================
function buildKpiCard(m: ExportMetric, isSelected: boolean): string {
  const { change, isPositive } = calcChange(m.current, m.previous, m.lowerBetter);
  const showChange = m.previous !== 0 || m.current !== 0;
const sparkSvg = "";

  return `
    <div style="
      background: ${isSelected ? "#fafafa" : "#ffffff"};
      border: 1px solid ${isSelected ? "#000" : "#e5e5e5"};
      border-radius: 8px;
      padding: 12px;
      box-sizing: border-box;
    ">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 6px; margin-bottom: 6px;">
        <div style="font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; line-height: 1.2;">${escapeHtml(m.label)}</div>
        ${showChange ? `
          <div style="font-size: 9px; font-weight: 600; color: ${isPositive ? "#0a8a3d" : "#c41e3a"}; white-space: nowrap;">
            ${isPositive ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}%
          </div>
        ` : ""}
      </div>
      <div style="font-size: 18px; font-weight: 700; color: #000; letter-spacing: -0.02em;">${formatValue(m.current, m.format)}</div>
      ${sparkSvg}
    </div>
  `;
}

// ============================================================
// Construir HTML del reporte completo
// ============================================================
function buildReportHTML(ctx: ExportContext, logoBase64: string | null): string {
  const dateRange = `${formatPeriodDate(ctx.period.since)} — ${formatPeriodDate(ctx.period.until)}`;
  const generatedDate = new Date().toLocaleDateString("es-US", { day: "numeric", month: "long", year: "numeric" });

  // KPIs en grid de 4 columnas
  const kpisHTML = ctx.metrics.length > 0 ? `
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px;">
      ${ctx.metrics.map((m) => buildKpiCard(m, m.id === ctx.mainMetricDef)).join("")}
    </div>
  ` : "";

  // Gráfico de la métrica principal
  const mainMetric = ctx.metrics.find((m) => m.id === ctx.mainMetricDef) || ctx.metrics[0];
  const chartHTML = mainMetric ? `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #000;">
        <div style="font-size: 9px; color: #999; font-weight: 600; letter-spacing: 0.1em;">02</div>
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase;">Evolución · ${escapeHtml(mainMetric.label)}</div>
      </div>
      <div style="background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
          <div>
            <div style="font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">Valor del período</div>
            <div style="font-size: 24px; font-weight: 700; color: #000; letter-spacing: -0.02em;">${formatValue(mainMetric.current, mainMetric.format)}</div>
          </div>
          ${(() => {
            const { change, isPositive } = calcChange(mainMetric.current, mainMetric.previous, mainMetric.lowerBetter);
            return mainMetric.previous !== 0 || mainMetric.current !== 0 ? `
              <div style="font-size: 11px; font-weight: 600; color: ${isPositive ? "#0a8a3d" : "#c41e3a"};">
                ${isPositive ? "▲" : "▼"} ${Math.abs(change).toFixed(1)}% vs período anterior
              </div>
            ` : "";
          })()}
        </div>
        ${buildChartSVG(mainMetric)}
      </div>
    </div>
  ` : "";

  // Pipeline CRM
  const pipelineHTML = ctx.pipeline ? `
    <div style="margin-bottom: 20px;">
      <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #000;">
        <div style="font-size: 9px; color: #999; font-weight: 600; letter-spacing: 0.1em;">03</div>
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase;">CRM Pipeline</div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;">
        ${(() => {
          const items = [
            { label: "Scheduled", value: ctx.pipeline.scheduled, prev: ctx.pipeline.prev_scheduled, dark: false },
            { label: "Showed", value: ctx.pipeline.showed, prev: ctx.pipeline.prev_showed, dark: false },
            { label: "Venta", value: ctx.pipeline.venta, prev: ctx.pipeline.prev_venta, dark: true },
            { label: "Pagada", value: ctx.pipeline.pagada, prev: ctx.pipeline.prev_pagada, dark: true },
            { label: "No-show", value: ctx.pipeline.noshow, prev: ctx.pipeline.prev_noshow, dark: true },
            { label: "Cancelled", value: ctx.pipeline.cancelled, prev: ctx.pipeline.prev_cancelled, dark: true },
          ];
          return items.map((i) => `
            <div style="
              background: #fff;
              color: #000;
              border: 1px solid #e5e5e5;
              border-radius: 6px;
              padding: 10px;
            ">
              <div style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; margin-bottom: 4px;">${i.label}</div>
              <div style="font-size: 20px; font-weight: 700;">${i.value}</div>
            </div>
          `).join("");
        })()}
      </div>
    </div>
  ` : "";

  // Resumen económico
  const ecoHTML = ctx.economics ? `
    <div style="margin-bottom: 12px;">
      <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #000;">
        <div style="font-size: 9px; color: #999; font-weight: 600; letter-spacing: 0.1em;">04</div>
        <div style="font-size: 12px; font-weight: 700; text-transform: uppercase;">Resumen Económico</div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
        <div style="border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px;">
          <div style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; margin-bottom: 6px;">${escapeHtml(ctx.economics.label1 || "Revenue")}</div>
          <div style="font-size: 18px; font-weight: 700;">${formatCurrency(ctx.economics.revenue)}</div>
        </div>
        <div style="border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px;">
          <div style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; margin-bottom: 6px;">${escapeHtml(ctx.economics.label2 || "Ad Spend")}</div>
          <div style="font-size: 18px; font-weight: 700;">${formatCurrency(ctx.economics.spend)}</div>
        </div>
        <div style="border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px;">
          <div style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; margin-bottom: 6px;">${escapeHtml(ctx.economics.label3 || "Fee")}</div>
          <div style="font-size: 18px; font-weight: 700;">${ctx.isAgency ? Math.round(ctx.economics.fee).toLocaleString("en-US") : formatCurrency(ctx.economics.fee)}</div>
        </div>
        <div style="
          border: 1px solid #e5e5e5;
          background: #fff;
          color: #000;
          border-radius: 6px;
          padding: 12px;
        ">
          <div style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500; margin-bottom: 6px;">${escapeHtml(ctx.economics.label4 || "Profit")}</div>
          <div style="font-size: 18px; font-weight: 700;">${formatCurrency(ctx.economics.profit)}</div>
        </div>
      </div>
    </div>
  ` : "";

  return `
    <div id="pdf-report" style="
      width: 794px;
      background: #ffffff;
      color: #000000;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 32px 40px 24px 40px;
      box-sizing: border-box;
    ">
      <!-- HEADER -->
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px;">
        ${logoBase64 ? `<img src="${logoBase64}" style="height: 26px; display: block;" />` : `<div style="font-weight: 700; font-size: 16px;">SetToClose</div>`}
        <div style="text-align: right;">
          <div style="font-size: 8px; color: #999; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 500;">Generado</div>
          <div style="font-size: 10px; color: #333; font-weight: 500;">${generatedDate}</div>
        </div>
      </div>

      <!-- TITLE BLOCK -->
      <div style="padding-bottom: 14px; border-bottom: 1px solid #e0e0e0; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 16px;">
          <div style="display: flex; align-items: center; gap: 14px; min-width: 0; flex: 1;">
            ${ctx.avatarUrl ? `
              <div style="
                width: 52px; height: 52px; border-radius: 10px;
                overflow: hidden;
                border: 1px solid #e5e5e5;
                flex-shrink: 0;
                background: #f8f8f8;
              ">
                <img src="${ctx.avatarUrl}" crossorigin="anonymous" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
              </div>
            ` : ""}
            <div style="min-width: 0;">
              <div style="font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600; margin-bottom: 4px;">Reporte</div>
              <div style="font-size: 22px; font-weight: 700; color: #000; letter-spacing: -0.02em; line-height: 1.1; line-height: 1.2;">${escapeHtml(ctx.clientName)}</div>
              <div style="font-size: 11px; color: #666; margin-top: 2px;">${escapeHtml(ctx.state)}</div>
            </div>
          </div>
          <div style="padding: 6px 12px; background: #f3f3f3; border-radius: 6px; font-size: 11px; color: #555; font-weight: 500; flex-shrink: 0; white-space: nowrap;">
            ${dateRange}
          </div>
        </div>
      </div>

      <!-- KPIs -->
      ${ctx.metrics.length > 0 ? `
        <div style="margin-bottom: 4px;">
          <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #000;">
            <div style="font-size: 9px; color: #999; font-weight: 600; letter-spacing: 0.1em;">01</div>
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase;">${ctx.isAgency ? "Meta Ads · Consolidado" : "Meta Ads"}</div>
          </div>
          ${kpisHTML}
        </div>
      ` : ""}

      ${chartHTML}
      ${pipelineHTML}
      ${ecoHTML}

      <!-- FOOTER -->
      <div style="margin-top: 18px; padding-top: 10px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 8px; color: #999;">SetToClose · Reporte Confidencial</div>
        <div style="font-size: 8px; color: #999;">${escapeHtml(ctx.clientName)}</div>
      </div>
    </div>
  `;
}

// ============================================================
// HTML de página de análisis
// ============================================================
function buildAnalysisHTML(ctx: ExportContext, logoBase64: string | null): string {
  const dateRange = `${formatPeriodDate(ctx.period.since)} — ${formatPeriodDate(ctx.period.until)}`;
  const renderedMarkdown = renderMarkdown(ctx.analysis || "");

  return `
    <div id="pdf-analysis" style="
      width: 794px;
      min-height: 1123px;
      background: #ffffff;
      color: #000000;
      font-family: 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif;
      padding: 40px 56px;
      box-sizing: border-box;
      position: relative;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; padding-bottom: 14px; border-bottom: 1px solid #e0e0e0;">
        <div style="display: flex; align-items: center; gap: 16px;">
          ${logoBase64 ? `<img src="${logoBase64}" style="height: 22px; display: block;" />` : `<div style="font-weight: 700; font-size: 14px;">SetToClose</div>`}
          <div style="font-size: 11px; color: #666;">${escapeHtml(ctx.clientName)}</div>
        </div>
        <div style="font-size: 10px; color: #999;">${dateRange}</div>
      </div>

      <div style="margin-bottom: 20px;">
        <div style="font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 600; margin-bottom: 6px;">Sección</div>
        <h1 style="font-size: 28px; font-weight: 700; letter-spacing: -0.03em; margin: 0; color: #000;">Análisis y Conclusiones</h1>
      </div>

      <div style="width: 40px; height: 3px; background: #000; margin-bottom: 24px;"></div>

      <div style="font-family: 'Poppins', sans-serif;">
        ${renderedMarkdown}
      </div>

      <div style="position: absolute; bottom: 30px; left: 56px; right: 56px; display: flex; justify-content: space-between; align-items: center; padding-top: 14px; border-top: 1px solid #e0e0e0;">
        <div style="font-size: 9px; color: #999;">SetToClose · Reporte Confidencial</div>
        <div style="font-size: 9px; color: #999;">${escapeHtml(ctx.clientName)}</div>
      </div>
    </div>
  `;
}

// ============================================================
// EXPORTACIÓN PRINCIPAL
// ============================================================
export async function exportFullReport(ctx: ExportContext, filename: string = "reporte.pdf") {
  const logoBase64 = await loadLogo();

  // Construir HTML del reporte y agregarlo al DOM (oculto)
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.top = "-99999px";
  container.style.left = "0";
  container.style.zIndex = "-1";
  container.innerHTML = buildReportHTML(ctx, logoBase64);
  document.body.appendChild(container);
  await new Promise((r) => setTimeout(r, 300));

  let reportCanvas: HTMLCanvasElement;
  try {
    const reportEl = container.querySelector("#pdf-report") as HTMLElement;
    reportCanvas = await html2canvas(reportEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 794,
    });
  } finally {
    document.body.removeChild(container);
  }

  // Crear PDF A4 Portrait
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Insertar reporte (manteniendo proporción, dividiendo en páginas si es necesario)
  const imgData = reportCanvas.toDataURL("image/png");
  const ratio = reportCanvas.width / reportCanvas.height;
  const fullWidth = pdfWidth;
  const fullHeight = fullWidth / ratio;

  if (fullHeight <= pdfHeight) {
    pdf.addImage(imgData, "PNG", 0, 0, fullWidth, fullHeight);
  } else {
    // Dividir en páginas
    let currentY = 0;
    let isFirstPage = true;
    const pxPerMM = reportCanvas.width / fullWidth;

    while (currentY < fullHeight) {
      if (!isFirstPage) pdf.addPage();
      const sliceH = Math.min(pdfHeight, fullHeight - currentY);

      const sliceCanvas = document.createElement("canvas");
      const sliceCtx = sliceCanvas.getContext("2d");
      if (!sliceCtx) break;

      const sliceHPx = Math.round(sliceH * pxPerMM);
      const sliceYPx = Math.round(currentY * pxPerMM);

      sliceCanvas.width = reportCanvas.width;
      sliceCanvas.height = sliceHPx;
      sliceCtx.fillStyle = "#fff";
      sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sliceCtx.drawImage(reportCanvas, 0, sliceYPx, reportCanvas.width, sliceHPx, 0, 0, reportCanvas.width, sliceHPx);

      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 0, 0, fullWidth, sliceH);
      currentY += sliceH;
      isFirstPage = false;
    }
  }

  // Página de análisis si hay
  if (ctx.analysis && ctx.analysis.trim().length > 0) {
    const aContainer = document.createElement("div");
    aContainer.style.position = "fixed";
    aContainer.style.top = "-99999px";
    aContainer.style.left = "0";
    aContainer.innerHTML = buildAnalysisHTML(ctx, logoBase64);
    document.body.appendChild(aContainer);
    await new Promise((r) => setTimeout(r, 200));

    try {
      const aEl = aContainer.querySelector("#pdf-analysis") as HTMLElement;
      const aCanvas = await html2canvas(aEl, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: "#fff", windowWidth: 794,
      });

      pdf.addPage();
      const aImgData = aCanvas.toDataURL("image/png");
      const aRatio = aCanvas.width / aCanvas.height;
      let aW = pdfWidth;
      let aH = aW / aRatio;
      if (aH > pdfHeight) {
        aH = pdfHeight;
        aW = aH * aRatio;
      }
      pdf.addImage(aImgData, "PNG", (pdfWidth - aW) / 2, 0, aW, aH);
    } finally {
      document.body.removeChild(aContainer);
    }
  }

  pdf.save(filename);
}