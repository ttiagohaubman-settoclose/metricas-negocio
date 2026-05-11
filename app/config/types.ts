export type DateRange = {
  preset?: "today" | "last_7d" | "last_30d" | "this_month" | "custom";
  since?: string;
  until?: string;
};

export type MetaMetrics = {
  spend: number;
  linkClicks: number;
  costPerLinkClick: number;
  linkCTR: number;
  leads: number;
  costPerLead: number | null;
  landingPageViews: number;
  costPerLandingPageView: number | null;
};

export type LeadStatus = "scheduled" | "showed" | "venta" | "pagada" | "noshow" | "cancelled";

export type LeadCounts = {
  scheduled: number;
  showed: number;
  venta: number;
  pagada: number;
  noshow: number;
  cancelled: number;
};

export type Lead = {
  appointmentId: string;
  contactId: string;
  name: string;
  startTime: string;
  appointmentStatus: string;
  tags: string[];
  status: LeadStatus;
};

export type ClientFullData = {
  id: string;
  name: string;
  state: string;
  meta: MetaMetrics;
  leads: Lead[];
  counts: LeadCounts;
};