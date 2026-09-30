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

function initialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("powerbi_dashboard_theme");
  return saved === "dark" ? "dark" : "light";
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.2 15.3A8.7 8.7 0 0 1 8.7 3.8a8.8 8.8 0 1 0 11.5 11.5Z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.3" />
      <rect x="14" y="4" width="6" height="6" rx="1.3" />
      <rect x="4" y="14" width="6" height="6" rx="1.3" />
      <rect x="14" y="14" width="6" height="6" rx="1.3" />
    </svg>
  );
}

function FilterIcon() {
  return <span className="funnel-icon" aria-hidden="true" />;
}

function MetricSlot({
  title,
  value,
  showTitle,
}: {
  title?: string;
  value: string;
  showTitle: boolean;
}) {
  return (
    <article className="metric-group">
      <span className="metric-corner" aria-hidden="true" />
      {showTitle && title ? <div className="metric-title">{title}</div> : <div className="metric-title metric-title-empty" />}
      <div className="metric-headline">{value}</div>
      <div className="metric-list metric-list-empty" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </article>
  );
}

function ChartPanel({
  title,
  option,
}: {
  title?: string;
  option?: EChartsOption;
}) {
  return (
    <article className="chart-panel">
      <div className="chart-panel-head">
        <div>
          <span className="panel-kicker">VISUAL</span>
          {title ? <h2>{title}</h2> : <h2 className="chart-title-empty">&nbsp;</h2>}
        </div>
        <span className="panel-dot" />
      </div>
      <div className="chart-panel-body">
        {option ? <EChart option={option} className="dashboard-chart" /> : <div className="chart-empty-state">—</div>}
      </div>
    </article>
  );
}

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<FilterSelections>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("powerbi_dashboard_theme", theme);
  }, [theme]);

  useEffect(() => {
    Promise.all([getStatus(), getConfig()])
      .then(([nextStatus, nextConfig]) => {
        setStatus(nextStatus);
        setConfig(nextConfig);
        document.documentElement.style.setProperty("--accent", nextConfig.branding.accent ?? "#07b2fd");
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

  const cards = useMemo(
    () => new Map(data?.cards.map((card) => [card.id, card.value]) ?? []),
    [data],
  );

  const chartData = useMemo(
    () => new Map(data?.charts.map((chart) => [chart.id, chart.rows]) ?? []),
    [data],
  );

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
    return (
      <main className="center-state">
        <div className="loader" />
        <p>Loading project configuration…</p>
        {error && <pre>{error}</pre>}
      </main>
    );
  }

  const message = setupMessage(status);
  const accent = config.branding.accent ?? "#07b2fd";
  const cardSlotCount = Math.max(4, config.cards.length);
  const chartSlotCount = Math.max(3, config.charts.length);

  const buildChartOption = (chartIndex: number): EChartsOption | undefined => {
    const chart = config.charts[chartIndex];
    if (!chart) return undefined;

    const rows = chartData.get(chart.id) ?? [];
    const dark = theme === "dark";
    const text = dark ? "#f7f9fc" : "#0d1317";
    const soft = dark ? "#aebbd0" : "#67758a";
    const muted = dark ? "#71819a" : "#8a949f";
    const grid = dark ? "rgba(130,171,222,.13)" : "#edf0f2";
    const tooltipBg = dark ? "#0d1b2d" : "#ffffff";
    const tooltipBorder = dark ? "rgba(130,171,222,.22)" : "#e5e8eb";

    if (chart.type === "pie") {
      return {
        tooltip: {
          trigger: "item",
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: text },
        },
        legend: {
          bottom: 0,
          textStyle: { color: soft, fontSize: 10 },
        },
        series: [{
          type: "pie",
          radius: ["46%", "69%"],
          center: ["50%", "46%"],
          data: rows.map((row) => ({ name: row.label, value: row.value ?? 0 })),
          label: { color: soft, fontSize: 10 },
        }],
      };
    }

    if (chart.type === "bar") {
      return {
        animationDuration: 450,
        grid: { left: 128, right: 64, top: 8, bottom: 8, containLabel: false },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: tooltipBg,
          borderColor: tooltipBorder,
          textStyle: { color: text },
        },
        xAxis: { type: "value", show: false },
        yAxis: {
          type: "category",
          inverse: true,
          data: rows.map((row) => row.label),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: soft,
            fontSize: 11,
            width: 108,
            overflow: "truncate",
            align: "right",
          },
        },
        series: [{
          type: "bar",
          data: rows.map((row) => row.value ?? 0),
          barWidth: 18,
          showBackground: true,
          backgroundStyle: {
            color: dark ? "rgba(255,255,255,.07)" : "#eeeeee",
            borderRadius: 999,
          },
          itemStyle: { color: accent, borderRadius: [0, 999, 999, 0] },
        }],
      };
    }

    return {
      animationDuration: 450,
      grid: { left: 44, right: 18, top: 16, bottom: 34 },
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipBg,
        borderColor: tooltipBorder,
        textStyle: { color: text },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: rows.map((row) => row.label),
        axisLine: { lineStyle: { color: grid } },
        axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: muted, fontSize: 10 },
        splitLine: { lineStyle: { color: grid } },
      },
      series: [{
        type: "line",
        smooth: 0.35,
        showSymbol: false,
        data: rows.map((row) => row.value ?? 0),
        lineStyle: { color: accent, width: 3 },
        areaStyle: { color: "rgba(7,178,253,.20)" },
      }],
    };
  };

  return (
    <div className={`app-shell ${filtersOpen ? "filters-open" : ""}`}>
      <header className="topbar">
        <div className="title-wrap">
          <div className="page-kicker">POWER BI WEB DASHBOARD</div>
          <h1>{config.branding.name}</h1>
        </div>

        <div className="brand-spacer" aria-hidden="true" />

        <div className="topbar-meta">
          <div className={`data-source-status ${status.powerBiConfigured ? "" : "unavailable"}`}>
            <span className="status-dot" />
            {status.powerBiConfigured ? "Power BI configurado" : "Configuração pendente"}
          </div>
        </div>
      </header>

      <div className="workspace">
        {!filtersOpen && (
          <aside className="nav-rail" aria-label="Navegação">
            <button className="rail-button rail-home-button" type="button" aria-label="Visão geral" title="Visão geral">
              <GridIcon />
            </button>
            <span className="rail-divider" />
            <button
              className="rail-button"
              type="button"
              aria-label="Filtros"
              title="Filtros"
              onClick={() => setFiltersOpen(true)}
            >
              <FilterIcon />
            </button>
            <span className="rail-divider" />
            <button
              className="rail-button theme-button"
              type="button"
              aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
              title={theme === "light" ? "Tema escuro" : "Tema claro"}
              onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <MoonIcon /> : <SunIcon />}
            </button>
          </aside>
        )}

        <aside className="filter-sidebar" aria-label="Filtros" aria-hidden={!filtersOpen}>
          <div className="filter-header">
            <div className="filter-title-icon"><FilterIcon /></div>
            <div>
              <h2>Filtros</h2>
              <p>Refine a visão do dashboard</p>
            </div>
            <button className="collapse-filter" type="button" onClick={() => setFiltersOpen(false)} aria-label="Fechar filtros">‹</button>
          </div>
          <div className="filter-body">
            <Filters config={config} value={filters} onChange={setFilters} />
          </div>
        </aside>

        <main className="dashboard-area">
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

          {error && (
            <section className="error-card">
              <strong>Power BI request failed</strong>
              <p>{error}</p>
            </section>
          )}

          {status.dashboardConfigured && (
            <>
              <section className="section-head">
                <div>
                  <span className="eyebrow">INDICADORES</span>
                  <h2>Resumo do período</h2>
                </div>
              </section>

              <section className="summary-grid" aria-label="Indicadores principais">
                {Array.from({ length: cardSlotCount }, (_, index) => {
                  const card = config.cards[index];
                  return (
                    <MetricSlot
                      key={card?.id ?? `empty-card-${index}`}
                      title={card?.title}
                      value={card ? formatValue(cards.get(card.id) ?? null, card.format) : "—"}
                      showTitle={config.layout.showCardTitles}
                    />
                  );
                })}
              </section>

              <section className="charts-grid">
                {Array.from({ length: chartSlotCount }, (_, index) => {
                  const chart = config.charts[index];
                  return (
                    <ChartPanel
                      key={chart?.id ?? `empty-chart-${index}`}
                      title={chart?.title}
                      option={buildChartOption(index)}
                    />
                  );
                })}
              </section>

              <section className="history-card">
                <div className="history-header">
                  <div>
                    <span className="panel-kicker">DETALHAMENTO</span>
                    <h2>Histórico</h2>
                  </div>
                </div>
                <div className="history-placeholder">—</div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
