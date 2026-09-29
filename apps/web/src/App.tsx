import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "./components/EChart";
import { Filters } from "./components/Filters";
import { getConfig, getDashboardData, getStatus, testConnection } from "./services/api";
import type { DashboardData, FilterSelections, PublicConfig, SystemStatus, ValueFormat } from "./types/api";

function formatValue(value: number | null, format: ValueFormat): string {
  if (value == null) return "—";
  if (format === "percentage") {
    const normalized = Math.abs(value) <= 1 ? value * 100 : value;
    return `${normalized.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
  }
  if (format === "currency") return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  if (format === "duration") return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
  if (format === "decimal") return value.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  return Math.round(value).toLocaleString("pt-BR");
}

function setupMessage(status: SystemStatus) {
  if (!status.powerBiConfigured) return "Configure seu .env para conectar o Microsoft Entra ID e o Power BI.";
  if (!status.dashboardConfigured) return "A conexão está configurada. Agora adicione cards ou gráficos em config/dashboard.json.";
  return null;
}

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<FilterSelections>({});
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getStatus(), getConfig()])
      .then(([nextStatus, nextConfig]) => {
        setStatus(nextStatus);
        setConfig(nextConfig);
        document.documentElement.style.setProperty("--accent", nextConfig.branding.accent ?? "#0ea5e9");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  useEffect(() => {
    if (!status?.powerBiConfigured || !status.dashboardConfigured) return;
    getDashboardData(filters)
      .then((result) => { setData(result); setError(null); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, [filters, status]);

  const cards = useMemo(() => new Map(data?.cards.map((card) => [card.id, card.value]) ?? []), [data]);
  const chartData = useMemo(() => new Map(data?.charts.map((chart) => [chart.id, chart.rows]) ?? []), [data]);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection();
      setTestResult(result.ok ? "Connection successful." : "Connection returned an unexpected result.");
    } catch (reason) {
      setTestResult(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setTesting(false);
    }
  };

  if (!status || !config) {
    return <main className="center-state"><div className="loader" /><p>Loading project configuration…</p>{error && <pre>{error}</pre>}</main>;
  }

  const message = setupMessage(status);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">OPEN SOURCE STARTER KIT</span>
          <h1>{config.branding.name}</h1>
          <p>{config.branding.subtitle ?? "Power BI semantic model → custom web dashboard"}</p>
        </div>
        <div className="status-pill">
          <span className={status.powerBiConfigured ? "status-dot ok" : "status-dot"} />
          {status.powerBiConfigured ? "Power BI configured" : "Setup required"}
        </div>
      </header>

      <main className="content">
        {message && (
          <section className="setup-card">
            <div className="setup-icon">PBI</div>
            <div>
              <span className="eyebrow">GETTING STARTED</span>
              <h2>No demo data. Your model, your dashboard.</h2>
              <p>{message}</p>
              <div className="setup-actions">
                <button onClick={runTest} disabled={!status.powerBiConfigured || testing}>
                  {testing ? "Testing…" : "Test connection"}
                </button>
                <code>npm run doctor</code>
              </div>
              {testResult && <div className="test-result">{testResult}</div>}
            </div>
          </section>
        )}

        {error && <section className="error-card"><strong>Power BI request failed</strong><p>{error}</p></section>}

        {status.dashboardConfigured && (
          <>
            <Filters config={config} value={filters} onChange={setFilters} />

            {config.cards.length > 0 && (
              <section>
                <div className="section-heading"><span>OVERVIEW</span><h2>Key metrics</h2></div>
                <div className="cards-grid">
                  {config.cards.map((card) => (
                    <article className="metric-card" key={card.id}>
                      <span>{card.title}</span>
                      <strong>{formatValue(cards.get(card.id) ?? null, card.format)}</strong>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {config.charts.length > 0 && (
              <section>
                <div className="section-heading"><span>ANALYSIS</span><h2>Configured visuals</h2></div>
                <div className="charts-grid">
                  {config.charts.map((chart) => {
                    const rows = chartData.get(chart.id) ?? [];
                    const option: EChartsOption = chart.type === "pie"
                      ? {
                          tooltip: { trigger: "item" },
                          series: [{ type: "pie", radius: ["48%", "72%"], data: rows.map((row) => ({ name: row.label, value: row.value ?? 0 })) }],
                        }
                      : {
                          tooltip: { trigger: "axis" },
                          grid: { left: 42, right: 20, top: 20, bottom: 54, containLabel: true },
                          xAxis: { type: "category", data: rows.map((row) => row.label), axisLabel: { rotate: rows.length > 7 ? 30 : 0 } },
                          yAxis: { type: "value" },
                          series: [{
                            type: chart.type,
                            data: rows.map((row) => row.value ?? 0),
                            smooth: chart.type === "line",
                            itemStyle: { color: config.branding.accent ?? "#0ea5e9" },
                            lineStyle: { color: config.branding.accent ?? "#0ea5e9" },
                          }],
                        };
                    return (
                      <article className="chart-card" key={chart.id}>
                        <h3>{chart.title}</h3>
                        <EChart option={option} />
                      </article>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer>
        React + TypeScript · Node.js · ECharts · Power BI REST API
      </footer>
    </div>
  );
}
