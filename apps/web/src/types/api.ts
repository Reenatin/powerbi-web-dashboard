export type ValueFormat = "integer" | "decimal" | "percentage" | "currency" | "duration";
export type FilterType = "multi-select" | "date-range";
export type ChartType = "bar" | "line" | "pie";

export type PublicConfig = {
  branding: { name: string; subtitle?: string; accent?: string };
  layout: { showCardTitles: boolean };
  filters: { id: string; label: string; type: FilterType }[];
  cards: { id: string; title: string; format: ValueFormat }[];
  charts: { id: string; title: string; type: ChartType }[];
};

export type SystemStatus = {
  powerBiConfigured: boolean;
  dashboardConfigured: boolean;
  datasetName?: string | null;
  counts?: { cards: number; charts: number; filters: number };
  error?: string;
};

export type FilterSelections = Record<string, string[] | { from?: string; to?: string }>;

export type DashboardData = {
  cards: { id: string; value: number | null }[];
  charts: { id: string; rows: { label: string; value: number | null }[] }[];
};
