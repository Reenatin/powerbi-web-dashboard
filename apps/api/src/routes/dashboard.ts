import { Router } from "express";
import { z } from "zod";
import { loadDashboardConfig, publicDashboardConfig } from "../dashboard-config.js";
import { executeDax } from "../powerbi/client.js";
import { cardsQuery, chartQuery, filterOptionsQuery } from "../powerbi/dax.js";
import type { FilterSelection } from "../types.js";

export const dashboardRouter = Router();

const selectionSchema = z.record(z.string(), z.union([
  z.array(z.string()),
  z.object({ from: z.string().optional(), to: z.string().optional() }),
])).default({});

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

dashboardRouter.get("/config", (_req, res, next) => {
  try {
    res.json(publicDashboardConfig(loadDashboardConfig()));
  } catch (error) {
    next(error);
  }
});

dashboardRouter.get("/filters/:filterId/options", async (req, res, next) => {
  try {
    const config = loadDashboardConfig();
    const rows = await executeDax(filterOptionsQuery(config, req.params.filterId));
    res.json(rows.map((row) => String(row.value ?? "")).filter(Boolean));
  } catch (error) {
    next(error);
  }
});

dashboardRouter.post("/data", async (req, res, next) => {
  try {
    const config = loadDashboardConfig();
    const selections = selectionSchema.parse(req.body?.filters ?? {}) as FilterSelection;
    const cardDax = cardsQuery(config, selections);

    const [cardRows, chartResults] = await Promise.all([
      cardDax ? executeDax(cardDax) : Promise.resolve([]),
      Promise.all(config.charts.map(async (chart) => {
        const rows = await executeDax(chartQuery(config, chart.id, selections));
        return {
          id: chart.id,
          rows: rows.map((row) => ({ label: String(row.label ?? ""), value: toNumber(row.value) })).filter((row) => row.label),
        };
      })),
    ]);

    const cardRow = cardRows[0] ?? {};
    res.json({
      cards: config.cards.map((card) => ({ id: card.id, value: toNumber(cardRow[card.id]) })),
      charts: chartResults,
    });
  } catch (error) {
    next(error);
  }
});
