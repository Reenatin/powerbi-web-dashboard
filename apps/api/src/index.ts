import express from "express";
import cors from "cors";
import { env } from "./config.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { systemRouter } from "./routes/system.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/system", systemRouter);
app.use("/api/dashboard", dashboardRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({
    error: "DashboardApiError",
    message: err instanceof Error ? err.message : String(err),
  });
});

app.listen(env.API_PORT, () => {
  console.log(`Power BI Web Dashboard API: http://localhost:${env.API_PORT}`);
});
