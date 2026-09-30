import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { DashboardConfig } from "./types.js";

const fieldRef = /^'(?:[^']|'')+'\[[^\]]+\]$/;
const measureRef = /^\[[^\]]+\]$/;

const filterSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["multi-select", "date-range"]),
  field: z.string().regex(fieldRef, "field must look like 'Table'[Column]"),
});

const cardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  measure: z.string().regex(measureRef, "measure must look like [Measure]"),
  format: z.enum(["integer", "decimal", "percentage", "currency", "duration"]),
});

const chartSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["bar", "line", "pie"]),
  dimension: z.string().regex(fieldRef, "dimension must look like 'Table'[Column]"),
  measure: z.string().regex(measureRef, "measure must look like [Measure]"),
  sort: z.enum(["asc", "desc"]).optional(),
  limit: z.number().int().positive().max(1000).optional(),
});

const dashboardSchema = z.object({
  branding: z.object({
    name: z.string().min(1),
    subtitle: z.string().optional(),
    accent: z.string().optional(),
  }),
  layout: z.object({
    showCardTitles: z.boolean().optional(),
  }).optional(),
  filters: z.array(filterSchema),
  cards: z.array(cardSchema),
  charts: z.array(chartSchema),
});

function configPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../config/dashboard.json");
}

export function loadDashboardConfig(): DashboardConfig {
  const raw = fs.readFileSync(configPath(), "utf8");
  return dashboardSchema.parse(JSON.parse(raw)) as DashboardConfig;
}

export function publicDashboardConfig(config: DashboardConfig) {
  return {
    branding: config.branding,
    layout: {
      showCardTitles: config.layout?.showCardTitles ?? false,
    },
    filters: config.filters.map(({ id, label, type }) => ({ id, label, type })),
    cards: config.cards.map(({ id, title, format }) => ({ id, title, format })),
    charts: config.charts.map(({ id, title, type }) => ({ id, title, type })),
  };
}
