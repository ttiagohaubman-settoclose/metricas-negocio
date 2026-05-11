// Catálogo curado de métricas de Meta Ads API
// Cada métrica tiene: id (nombre técnico de Meta), label, format, category, lowerBetter
// Los IDs son los nombres reales que devuelve la Meta Marketing API

export type MetaMetricFormat = "currency" | "currency2" | "number" | "percent" | "decimal";

export type MetaMetricDef = {
  id: string;
  label: string;
  format: MetaMetricFormat;
  category: string;
  lowerBetter: boolean;
  description?: string;
};

export const META_METRICS_CATALOG: MetaMetricDef[] = [
  // ============ COSTOS ============
  { id: "spend", label: "Importe gastado", format: "currency", category: "Costos", lowerBetter: false, description: "Total invertido en el período" },
  { id: "cpc", label: "CPC (todos)", format: "currency2", category: "Costos", lowerBetter: true, description: "Costo por click (incluye todos los tipos)" },
  { id: "cpm", label: "CPM", format: "currency2", category: "Costos", lowerBetter: true, description: "Costo por 1000 impresiones" },
  { id: "cpp", label: "CPP", format: "currency2", category: "Costos", lowerBetter: true, description: "Costo por 1000 personas alcanzadas" },
  { id: "costPerLinkClick", label: "Costo por click en enlace", format: "currency2", category: "Costos", lowerBetter: true },
  { id: "costPerLead", label: "Costo por Lead", format: "currency2", category: "Costos", lowerBetter: true },
  { id: "costPerLandingPageView", label: "Costo por LPV", format: "currency2", category: "Costos", lowerBetter: true, description: "Costo por vista de landing page" },
  { id: "costPerThruplay", label: "Costo por ThruPlay", format: "currency2", category: "Costos", lowerBetter: true, description: "Costo por reproducción completa de video" },
  { id: "costPerMessagingStart", label: "Costo por conversación", format: "currency2", category: "Costos", lowerBetter: true },

  // ============ ALCANCE ============
  { id: "impressions", label: "Impresiones", format: "number", category: "Alcance", lowerBetter: false },
  { id: "reach", label: "Alcance", format: "number", category: "Alcance", lowerBetter: false, description: "Personas únicas que vieron el anuncio" },
  { id: "frequency", label: "Frecuencia", format: "decimal", category: "Alcance", lowerBetter: false, description: "Veces promedio que cada persona vio el anuncio" },

  // ============ ENGAGEMENT ============
  { id: "clicks", label: "Clicks (todos)", format: "number", category: "Engagement", lowerBetter: false },
  { id: "linkClicks", label: "Clicks en enlace", format: "number", category: "Engagement", lowerBetter: false },
  { id: "ctr", label: "CTR (todos)", format: "percent", category: "Engagement", lowerBetter: false },
  { id: "linkCTR", label: "CTR (enlace)", format: "percent", category: "Engagement", lowerBetter: false },
  { id: "uniqueClicks", label: "Clicks únicos", format: "number", category: "Engagement", lowerBetter: false },
  { id: "uniqueLinkClicks", label: "Clicks únicos en enlace", format: "number", category: "Engagement", lowerBetter: false },
  { id: "uniqueCTR", label: "CTR único", format: "percent", category: "Engagement", lowerBetter: false },
  { id: "outboundClicks", label: "Clicks salientes", format: "number", category: "Engagement", lowerBetter: false, description: "Clicks que llevan fuera de Facebook" },
  { id: "outboundClicksCTR", label: "CTR saliente", format: "percent", category: "Engagement", lowerBetter: false },
  { id: "postEngagement", label: "Interacciones con publicación", format: "number", category: "Engagement", lowerBetter: false },
  { id: "pageEngagement", label: "Interacciones con página", format: "number", category: "Engagement", lowerBetter: false },
  { id: "postReactions", label: "Reacciones", format: "number", category: "Engagement", lowerBetter: false },
  { id: "postComments", label: "Comentarios", format: "number", category: "Engagement", lowerBetter: false },
  { id: "postShares", label: "Compartidos", format: "number", category: "Engagement", lowerBetter: false },
  { id: "postSaves", label: "Guardados", format: "number", category: "Engagement", lowerBetter: false },

  // ============ CONVERSIONES ============
  { id: "leads", label: "Leads", format: "number", category: "Conversiones", lowerBetter: false },
  { id: "landingPageViews", label: "Vistas de landing page", format: "number", category: "Conversiones", lowerBetter: false },
  { id: "purchases", label: "Compras", format: "number", category: "Conversiones", lowerBetter: false },
  { id: "addsToCart", label: "Agregados al carrito", format: "number", category: "Conversiones", lowerBetter: false },
  { id: "initiatedCheckouts", label: "Checkouts iniciados", format: "number", category: "Conversiones", lowerBetter: false },
  { id: "registrations", label: "Registros completados", format: "number", category: "Conversiones", lowerBetter: false },
  { id: "messagingStarted", label: "Conversaciones iniciadas", format: "number", category: "Conversiones", lowerBetter: false },
  { id: "submitApplications", label: "Solicitudes enviadas", format: "number", category: "Conversiones", lowerBetter: false },
  { id: "viewContent", label: "Vistas de contenido", format: "number", category: "Conversiones", lowerBetter: false },

  // ============ VIDEO ============
  { id: "videoPlays", label: "Reproducciones de video", format: "number", category: "Video", lowerBetter: false },
  { id: "video25Watched", label: "Vistos al 25%", format: "number", category: "Video", lowerBetter: false },
  { id: "video50Watched", label: "Vistos al 50%", format: "number", category: "Video", lowerBetter: false },
  { id: "video75Watched", label: "Vistos al 75%", format: "number", category: "Video", lowerBetter: false },
  { id: "video95Watched", label: "Vistos al 95%", format: "number", category: "Video", lowerBetter: false },
  { id: "video100Watched", label: "Vistos al 100%", format: "number", category: "Video", lowerBetter: false },
  { id: "thruplays", label: "ThruPlays", format: "number", category: "Video", lowerBetter: false, description: "Videos vistos completos o 15+ segundos" },
  { id: "videoAvgTimeWatched", label: "Tiempo prom. visto", format: "decimal", category: "Video", lowerBetter: false, description: "Segundos promedio de visualización" },

  // ============ CALIDAD ============
  { id: "qualityRanking", label: "Clasificación de calidad", format: "number", category: "Calidad", lowerBetter: false, description: "Above/Below average" },
  { id: "engagementRateRanking", label: "Clasificación de engagement", format: "number", category: "Calidad", lowerBetter: false },
  { id: "conversionRateRanking", label: "Clasificación de conversión", format: "number", category: "Calidad", lowerBetter: false },

  // ============ ROI / RETURN ============
  { id: "purchaseRoas", label: "ROAS compras", format: "decimal", category: "ROI", lowerBetter: false, description: "Return on Ad Spend en compras" },
  { id: "websitePurchaseRoas", label: "ROAS web purchase", format: "decimal", category: "ROI", lowerBetter: false },
];

// Helper: obtener una métrica por ID
export function getMetricById(id: string): MetaMetricDef | undefined {
  return META_METRICS_CATALOG.find((m) => m.id === id);
}

// Helper: agrupar por categoría
export function getMetricsByCategory(): Record<string, MetaMetricDef[]> {
  const grouped: Record<string, MetaMetricDef[]> = {};
  META_METRICS_CATALOG.forEach((m) => {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  });
  return grouped;
}