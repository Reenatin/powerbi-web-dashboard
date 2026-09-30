import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "./components/EChart";
import { FilterSidebar } from "./components/FilterSidebar";
import { MetricGroup } from "./components/MetricGroup";
import { getConfig, getDashboardData, getStatus, testConnection } from "./services/api";
import type { DashboardData, FilterSelections, PublicConfig, SystemStatus, ValueFormat } from "./types/api";

type ThemeMode = "light" | "dark";
type HistoryGranularity = "day" | "month" | "year";

function initialTheme(): ThemeMode {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem("powerbi_dashboard_theme");
  return saved === "dark" || saved === "light" ? saved : "light";
}

function formatValue(value: number | null | undefined, format: ValueFormat = "integer"): string {
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

function activeFilterCount(filters: FilterSelections): number {
  return Object.values(filters).reduce((count, selected) => {
    if (Array.isArray(selected)) return count + (selected.length > 0 ? 1 : 0);
    return count + (selected?.from || selected?.to ? 1 : 0);
  }, 0);
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

function NavigationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4.3 11.1 19.1 4.5c.7-.3 1.4.4 1.1 1.1l-6.6 14.8c-.3.8-1.5.7-1.7-.1l-1.5-6.7-6.7-1.5c-.8-.2-.9-1.4.6-2Z" />
    </svg>
  );
}

function FocusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />
    </svg>
  );
}

function GranularitySwitch({
  value,
  onChange,
  compact = false,
  hidden = false,
}: {
  value: HistoryGranularity;
  onChange: (value: HistoryGranularity) => void;
  compact?: boolean;
  hidden?: boolean;
}) {
  const items: { value: HistoryGranularity; label: string }[] = [
    { value: "day", label: "Dia" },
    { value: "month", label: "Mês" },
    { value: "year", label: "Ano" },
  ];

  return (
    <div className={`history-granularity-switch ${compact ? "compact" : ""} ${hidden ? "template-hidden" : ""}`} role="group" aria-label="Granularidade da tabela">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={value === item.value ? "active" : ""}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function ChartPanel({
  kicker,
  title,
  children,
  hiddenText,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  hiddenText: boolean;
}) {
  return (
    <article className="chart-panel">
      <div className="chart-panel-head">
        <div className={hiddenText ? "template-hidden" : ""}>
          <span className="panel-kicker">{kicker || "\u00A0"}</span>
          <h2>{title || "\u00A0"}</h2>
        </div>
        <span className="panel-dot" />
      </div>
      <div className="chart-panel-body">{children}</div>
    </article>
  );
}

export default function App() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<FilterSelections>({});
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyFocusOpen, setHistoryFocusOpen] = useState(false);
  const [historyGranularity, setHistoryGranularity] = useState<HistoryGranularity>("day");
  const [railExpanded, setRailExpanded] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(initialTheme);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("powerbi_dashboard_theme", theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
      "content",
      theme === "dark" ? "#07111f" : "#ffffff",
    );
  }, [theme]);

  useEffect(() => {
    const revealTimer = window.setTimeout(() => setRailExpanded(true), 1000);
    return () => window.clearTimeout(revealTimer);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setHistoryFocusOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!menuOpen && !historyFocusOpen) {
      document.body.style.overflow = "";
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen, historyFocusOpen]);

  useEffect(() => {
    Promise.all([getStatus(), getConfig()])
      .then(([nextStatus, nextConfig]) => {
        setStatus(nextStatus);
        setConfig(nextConfig);
        document.documentElement.style.setProperty("--accent", nextConfig.branding.accent ?? "#07b2fd");
        document.documentElement.style.setProperty("--accent-strong", nextConfig.branding.accent ?? "#079edc");
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  useEffect(() => {
    if (!status?.powerBiConfigured || !status.dashboardConfigured) return;
    let active = true;
    getDashboardData(filters)
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(null);
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      active = false;
    };
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
  const filterCount = activeFilterCount(filters);
  const accent = config.branding.accent ?? "#07b2fd";
  const textHidden = !config.layout.showSectionTitles;

  const cardAt = (index: number) => {
    const card = config.cards[index];
    return {
      title: config.layout.showCardTitles ? card?.title ?? "" : "",
      value: card ? formatValue(cards.get(card.id), card.format) : "—",
    };
  };

  const metric = (index: number) => {
    const item = cardAt(index);
    return {
      label: item.title,
      value: item.value,
      sub: "\u00A0",
    };
  };

  const chartTheme = {
    text: theme === "dark" ? "#f7f9fc" : "#0d1317",
    soft: theme === "dark" ? "#aebbd0" : "#67758a",
    muted: theme === "dark" ? "#71819a" : "#8a949f",
    grid: theme === "dark" ? "rgba(130,171,222,.13)" : "#edf0f2",
    barBackground: theme === "dark" ? "rgba(255,255,255,.07)" : "#eeeeee",
    tooltipBg: theme === "dark" ? "#0d1b2d" : "#ffffff",
    tooltipBorder: theme === "dark" ? "rgba(130,171,222,.22)" : "#e5e8eb",
  };

  const buildChartOption = (index: number): EChartsOption => {
    const chart = config.charts[index];
    const rows = chart ? chartData.get(chart.id) ?? [] : [];

    if (!chart) {
      return {
        xAxis: { show: false },
        yAxis: { show: false },
        series: [],
      };
    }

    if (chart.type === "pie") {
      return {
        animationDuration: 450,
        tooltip: {
          trigger: "item",
          backgroundColor: chartTheme.tooltipBg,
          borderColor: chartTheme.tooltipBorder,
          textStyle: { color: chartTheme.text },
        },
        series: [{
          type: "pie",
          radius: ["46%", "70%"],
          center: ["50%", "50%"],
          data: rows.map((row) => ({ name: row.label, value: row.value ?? 0 })),
          label: { color: chartTheme.soft, fontSize: 10 },
        }],
      };
    }

    if (chart.type === "bar") {
      return {
        animationDuration: 450,
        grid: {
          left: index === 0 ? 150 : 130,
          right: 72,
          top: 8,
          bottom: 8,
          containLabel: false,
        },
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "shadow" },
          backgroundColor: chartTheme.tooltipBg,
          borderColor: chartTheme.tooltipBorder,
          textStyle: { color: chartTheme.text },
        },
        xAxis: { type: "value", show: false },
        yAxis: {
          type: "category",
          inverse: true,
          data: rows.map((item) => item.label),
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: {
            color: chartTheme.soft,
            fontSize: 12,
            width: index === 0 ? 132 : 110,
            overflow: "truncate",
            align: "right",
          },
        },
        series: [{
          type: "bar",
          data: rows.map((item, rowIndex) => ({
            value: item.value ?? 0,
            itemStyle: {
              color: rowIndex === 0 ? accent : (theme === "dark" ? "#3b9ec9" : "#69c5ee"),
              borderRadius: [0, 999, 999, 0],
            },
          })),
          barWidth: 18,
          showBackground: true,
          backgroundStyle: { color: chartTheme.barBackground, borderRadius: 999 },
          label: {
            show: true,
            position: "right",
            distance: 52,
            color: chartTheme.text,
            fontWeight: 700,
            fontSize: 12,
          },
        }],
      };
    }

    return {
      animationDuration: 450,
      grid: { left: 44, right: 18, top: 16, bottom: 34 },
      tooltip: {
        trigger: "axis",
        backgroundColor: chartTheme.tooltipBg,
        borderColor: chartTheme.tooltipBorder,
        textStyle: { color: chartTheme.text },
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: rows.map((item) => item.label),
        axisLine: { lineStyle: { color: chartTheme.grid } },
        axisTick: { show: false },
        axisLabel: { color: chartTheme.muted, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: chartTheme.muted, fontSize: 10 },
        splitLine: { lineStyle: { color: chartTheme.grid } },
      },
      series: [{
        type: "line",
        smooth: 0.35,
        showSymbol: false,
        data: rows.map((item) => item.value ?? 0),
        lineStyle: { color: accent, width: 3 },
        areaStyle: { color: "rgba(7,178,253,.22)" },
      }],
    };
  };

  const chartTitle = (index: number) =>
    config.layout.showChartTitles ? config.charts[index]?.title ?? "" : "";

  return (
    <div className={`app-shell ${filtersOpen ? "filters-open" : ""} ${railExpanded ? "rail-expanded" : "rail-collapsed"}`}>
      <header className="topbar">
        <div className="company-heading">
          <span className="company-logo company-logo-placeholder" aria-hidden="true" />
          <div className={`title-wrap ${config.layout.showHeaderText ? "" : "template-hidden"}`}>
            <div className="page-kicker">{config.branding.subtitle || "Dashboard"}</div>
            <h1>{config.branding.name}</h1>
          </div>
        </div>

        <div className="brand-center" aria-hidden="true" />

        <div className="topbar-meta">
          <div className="updated template-hidden" aria-hidden="true">
            <span>Atualizado em</span>
            <strong>00/00/0000 00:00</strong>
          </div>
        </div>
      </header>

      <div className="workspace">
        {!filtersOpen && (
          <aside className="nav-rail" aria-label="Navegação">
            <button
              className="rail-button rail-brand-button"
              type="button"
              aria-label={railExpanded ? "Recolher atalhos" : "Expandir atalhos"}
              aria-expanded={railExpanded}
              title={railExpanded ? "Recolher atalhos" : "Expandir atalhos"}
              onClick={() => setRailExpanded((current) => !current)}
            >
              <span className="hamburger-icon" aria-hidden="true"><i /><i /><i /></span>
            </button>

            <div className="rail-secondary-actions" aria-hidden={!railExpanded}>
              <span className="rail-divider" />
              <button
                className="rail-button rail-blue-button navigation-rail-button"
                type="button"
                tabIndex={railExpanded ? 0 : -1}
                aria-label="Páginas do dashboard"
                title="Páginas"
                onClick={() => setMenuOpen(true)}
              >
                <span className="navigation-icon"><NavigationIcon /></span>
              </button>
              <span className="rail-divider" />
              <button
                className="rail-button rail-blue-button filter-rail-button"
                type="button"
                tabIndex={railExpanded ? 0 : -1}
                aria-label="Filtros"
                title="Filtros"
                onClick={() => setFiltersOpen(true)}
              >
                <span className="funnel-icon" aria-hidden="true" />
                {filterCount > 0 && <span className="filter-count">{filterCount}</span>}
              </button>
              <span className="rail-divider" />
              <button
                className="rail-button theme-rail-button"
                type="button"
                tabIndex={railExpanded ? 0 : -1}
                aria-label={theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"}
                title={theme === "light" ? "Tema escuro" : "Tema claro"}
                onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}
              >
                <span className="theme-icon">
                  {theme === "light" ? <MoonIcon /> : <SunIcon />}
                </span>
              </button>
            </div>
          </aside>
        )}

        <FilterSidebar
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          config={config}
          value={filters}
          onApply={setFilters}
        />

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
                <div className={textHidden ? "template-hidden" : ""}>
                  <span className="eyebrow">INDICADORES</span>
                  <h2>Resumo do período</h2>
                </div>
              </section>

              <section className="summary-grid" aria-label="Indicadores principais">
                <MetricGroup title={cardAt(0).title} headline={cardAt(0).value} metrics={[metric(1), metric(2)]} />
                <MetricGroup title={cardAt(3).title} headline={cardAt(3).value} metrics={[metric(4), metric(5), metric(6)]} />
                <MetricGroup title={cardAt(7).title} headline={cardAt(7).value} metrics={[metric(8), metric(9)]} />
                <MetricGroup title={cardAt(10).title} headline={cardAt(10).value} metrics={[metric(11), metric(12)]} />
              </section>

              <section className="charts-grid">
                {[0, 1, 2].map((index) => (
                  <ChartPanel
                    key={config.charts[index]?.id ?? `chart-slot-${index}`}
                    kicker={chartTitle(index)}
                    title={chartTitle(index)}
                    hiddenText={!config.layout.showChartTitles}
                  >
                    <EChart option={buildChartOption(index)} className="dashboard-chart" />
                  </ChartPanel>
                ))}
              </section>

              <section className="history-card">
                <div className="history-header">
                  <div className={textHidden ? "template-hidden" : ""}>
                    <span className="panel-kicker">DETALHAMENTO</span>
                    <h2>Histórico</h2>
                  </div>
                  <div className="history-header-actions">
                    <GranularitySwitch
                      value={historyGranularity}
                      onChange={setHistoryGranularity}
                      hidden={textHidden}
                    />
                    <div className={`history-legend ${textHidden ? "template-hidden" : ""}`}>
                      <span /> período selecionado
                    </div>
                    <button
                      className="focus-table-button"
                      type="button"
                      aria-label="Abrir tabela em modo foco"
                      title="Modo foco"
                      onClick={() => setHistoryFocusOpen(true)}
                    >
                      <FocusIcon />
                    </button>
                  </div>
                </div>
                <div className="detail-table-wrap detail-table-wrap-empty" aria-hidden="true" />
              </section>
            </>
          )}
        </main>
      </div>

      {historyFocusOpen && (
        <div className="focus-table-backdrop" role="presentation" onMouseDown={() => setHistoryFocusOpen(false)}>
          <section
            className="focus-table-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="focusTableTitle"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="focus-table-head">
              <div className={textHidden ? "template-hidden" : ""}>
                <span className="eyebrow">DETALHAMENTO</span>
                <h2 id="focusTableTitle">Histórico</h2>
                <p>Modo foco para análise da tabela.</p>
              </div>
              <div className="focus-table-head-actions">
                <GranularitySwitch
                  value={historyGranularity}
                  onChange={setHistoryGranularity}
                  compact
                  hidden={textHidden}
                />
                <button
                  className="focus-table-close"
                  type="button"
                  onClick={() => setHistoryFocusOpen(false)}
                  aria-label="Fechar modo foco"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="focus-table-content">
              <div className="detail-table-wrap detail-table-wrap-empty" aria-hidden="true" />
            </div>
          </section>
        </div>
      )}

      {menuOpen && (
        <div className="page-menu-backdrop" role="presentation" onMouseDown={() => setMenuOpen(false)}>
          <section
            className="page-menu-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pageMenuTitle"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="page-menu-head">
              <div className={textHidden ? "template-hidden" : ""}>
                <span className="eyebrow">NAVEGAÇÃO</span>
                <h2 id="pageMenuTitle">Páginas do dashboard</h2>
                <p>Escolha a visão que deseja abrir.</p>
              </div>
              <button className="page-menu-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Fechar">×</button>
            </div>

            <div className="page-menu-grid">
              <button className="page-menu-option active" type="button" onClick={() => setMenuOpen(false)}>
                <span className={`page-menu-index ${textHidden ? "template-hidden" : ""}`}>01</span>
                <span className={`page-menu-copy ${textHidden ? "template-hidden" : ""}`}>
                  <strong>Visão Geral</strong>
                  <small>Página atual</small>
                </span>
                <span className="page-menu-arrow">›</span>
              </button>
            </div>
          </section>
        </div>
      )}

      <div className="mobile-filter-backdrop" onClick={() => setFiltersOpen(false)} />
    </div>
  );
}
