import { useEffect, useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "./components/EChart";
import { Filters } from "./components/Filters";
import { getConfig, getDashboardData, getStatus, testConnection } from "./services/api";
import type { DashboardData, FilterSelections, PublicConfig, SystemStatus, ValueFormat } from "./types/api";

type ThemeMode = "light" | "dark";

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

function themeFromStorage(): ThemeMode {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem("pbi_web_theme") === "dark" ? "dark" : "light";
}

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<FilterSelections>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(themeFromStorage);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("pbi_web_theme", theme);
  }, [theme]);

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
      .then((result) => {
        setData(result);
        setError(null);
      })
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
  const accent = config.branding.accent ?? "#0ea5e9";

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div>
          <span className="header-kicker">POWER BI WEB DASHBOARD</span>
          <h1>{config.branding.name}</h1>
          {config.branding.subtitle && <p>{config.branding.subtitle}</p>}
        </div>

        <div className="header-actions">
          <span className="connection-badge">
            <span className={status.powerBiConfigured ? "connection-dot connected" : "connection-dot"} />
            {status.powerBiConfigured ? "Power BI configured" : "Setup required"}
          </span>
        </div>
      </header>

      <div className="dashboard-workspace">
        <nav className="side-rail" aria-label="Dashboard tools">
          <button className="rail-action rail-action-primary" type="button" title="Visão geral" aria-label="Visão geral">
            <span className="rail-grid-icon" />
          </button>

          <span className="rail-separator" />

          <button
            className={`rail-action ${filtersOpen ? "is-active" : ""}`}
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            title="Filtros"
            aria-label="Filtros"
          >
            <span className="rail-filter-icon" />
          </button>

          <span className="rail-separator" />

          <button
            className="rail-action"
            type="button"
            onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
            title="Alternar tema"
            aria-label="Alternar tema"
          >
            <span className={theme === "light" ? "theme-symbol moon" : "theme-symbol sun"} />
          </button>
        </nav>

        {filtersOpen && (
          <aside className="filters-drawer">
            <div className="filters-drawer-title">
              <div>
                <span>FILTROS</span>
                <strong>Refine a visualização</strong>
              </div>
              <button type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros">×</button>
            </div>
            <Filters config={config} value={filters} onChange={setFilters} />
          </aside>
        )}

        <main className="dashboard-content">
          {message && (
            <section className="setup-panel">
              <div className="setup-mark">PBI</div>
              <div>
                <span className="section-kicker">GETTING STARTED</span>
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

          {error && (
            <section className="error-panel">
              <strong>Power BI request failed</strong>
              <p>{error}</p>
            </section>
          )}

          {status.dashboardConfigured && config.cards.length > 0 && (
            <section>
              <div className="section-title">
                <span className="section-kicker">INDICADORES</span>
                <h2>Resumo do período</h2>
              </div>

              <div className="metric-grid">
                {config.cards.map((card) => (
                  <article className="metric-tile" key={card.id}>
                    {config.layout.showCardTitles && <span className="metric-title">{card.title}</span>}
                    <strong>{formatValue(cards.get(card.id) ?? null, card.format)}</strong>
                    <i aria-hidden="true" />
                  </article>
                ))}
              </div>
            </section>
          )}

          {status.dashboardConfigured && config.charts.length > 0 && (
            <section>
              <div className="section-title">
                <span className="section-kicker">ANÁLISE</span>
                <h2>Visualizações</h2>
              </div>

              <div className="visual-grid">
                {config.charts.map((chart) => {
                  const rows = chartData.get(chart.id) ?? [];
                  const dark = theme === "dark";
                  const axisColor = dark ? "#aebbd0" : "#64748b";
                  const gridColor = dark ? "rgba(148,163,184,.14)" : "#edf1f4";
                  const tooltipBackground = dark ? "#0e1b2b" : "#ffffff";
                  const option: EChartsOption = chart.type === "pie"
                    ? {
                        tooltip: { trigger: "item", backgroundColor: tooltipBackground },
                        series: [{
                          type: "pie",
                          radius: ["48%", "72%"],
                          data: rows.map((row) => ({ name: row.label, value: row.value ?? 0 })),
                        }],
                      }
                    : {
                        tooltip: { trigger: "axis", backgroundColor: tooltipBackground },
                        grid: { left: 46, right: 18, top: 16, bottom: 48, containLabel: true },
                        xAxis: {
                          type: "category",
                          data: rows.map((row) => row.label),
                          axisLine: { lineStyle: { color: gridColor } },
                          axisLabel: { color: axisColor, rotate: rows.length > 8 ? 30 : 0 },
                        },
                        yAxis: {
                          type: "value",
                          axisLine: { show: false },
                          splitLine: { lineStyle: { color: gridColor } },
                          axisLabel: { color: axisColor },
                        },
                        series: [{
                          type: chart.type,
                          data: rows.map((row) => row.value ?? 0),
                          smooth: chart.type === "line",
                          itemStyle: { color: accent },
                          lineStyle: { color: accent, width: 3 },
                          areaStyle: chart.type === "line" ? { color: "rgba(14,165,233,.12)" } : undefined,
                        }],
                      };

                  return (
                    <article className="visual-panel" key={chart.id}>
                      <div className="visual-panel-heading">
                        <div>
                          <span className="section-kicker">VISUAL</span>
                          <h3>{chart.title}</h3>
                        </div>
                        <span className="visual-dot" />
                      </div>
                      <EChart option={option} />
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>

      {filtersOpen && <button className="mobile-drawer-backdrop" type="button" aria-label="Fechar filtros" onClick={() => setFiltersOpen(false)} />}
    </div>
  );
}
