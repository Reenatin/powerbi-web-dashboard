import { Router } from "express";
import { env, powerBiConfigured } from "../config.js";
import { loadDashboardConfig } from "../dashboard-config.js";
import { executeDax } from "../powerbi/client.js";

export const systemRouter = Router();

systemRouter.get("/status", (_req, res) => {
  try {
    const config = loadDashboardConfig();
    res.json({
      powerBiConfigured,
      datasetName: env.POWERBI_DATASET_NAME ?? null,
      dashboardConfigured: config.cards.length + config.charts.length > 0,
      counts: { cards: config.cards.length, charts: config.charts.length, filters: config.filters.length },
    });
  } catch (error) {
    res.status(500).json({ powerBiConfigured, dashboardConfigured: false, error: error instanceof Error ? error.message : String(error) });
  }
});

systemRouter.post("/test-connection", async (_req, res, next) => {
  try {
    const rows = await executeDax('EVALUATE ROW("ok", 1)');
    res.json({ ok: rows[0]?.ok === 1 || rows.length > 0 });
  } catch (error) {
    next(error);
  }
});
