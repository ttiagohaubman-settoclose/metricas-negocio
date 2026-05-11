export const COLORS = {
  // Dark theme (default)
  dark: {
    bg: "#000000",
    bgElevated: "#0a0a0a",
    surface: "#0f0f0f",
    surfaceHover: "#161616",
    border: "#1f1f1f",
    borderStrong: "#2a2a2a",
    ink: "#ffffff",
    inkMuted: "#8a8a8a",
    inkDim: "#555555",
    grid: "#1a1a1a",
  },
  // Light theme
  light: {
    bg: "#ffffff",
    bgElevated: "#fafafa",
    surface: "#ffffff",
    surfaceHover: "#f7f7f7",
    border: "#ececec",
    borderStrong: "#d8d8d8",
    ink: "#000000",
    inkMuted: "#6b6b6b",
    inkDim: "#aaaaaa",
    grid: "#f0f0f0",
  },
  // Status colors (siempre escala de grises)
  status: {
    scheduled: "#8a8a8a",
    showed: "#bdbdbd",
    venta: "#ffffff",
    pagada: "#000000",
    noshow: "#555555",
    cancelled: "#3a3a3a",
  },
};

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

export function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    scheduled: "Scheduled",
    showed: "Showed",
    venta: "Venta",
    pagada: "Pagada",
    noshow: "No Show",
    cancelled: "Cancelled",
  };
  return labels[status] || status;
}