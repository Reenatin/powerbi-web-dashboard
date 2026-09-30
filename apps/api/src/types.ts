export type ValueFormat = "integer" | "decimal" | "percentage" | "currency" | "duration";
export type ChartType = "bar" | "line" | "pie";
export type SortDirection = "asc" | "desc";
export type FilterType = "multi-select" | "date-range";

export type DashboardFilterConfig = {
  id: string;
  label: string;
  type: FilterType;
  field: string;
};

export type DashboardCardConfig = {
  id: string;
  title: string;
  measure: string;
  format: ValueFormat;
};

export type DashboardChartConfig = {
  id: string;
  title: string;
  type: ChartType;
  dimension: string;
  measure: string;
  sort?: SortDirection;
  limit?: number;
};

export type DashboardConfig = {
  branding: {
    name: string;
    subtitle?: string;
    accent?: string;
  };
  layout?: {
    showCardTitles?: boolean;
  };
  filters: DashboardFilterConfig[];
  cards: DashboardCardConfig[];
  charts: DashboardChartConfig[];
};

export type FilterSelection = Record<string, string[] | { from?: string; to?: string }>;
