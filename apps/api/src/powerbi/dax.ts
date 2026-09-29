import type { DashboardConfig, FilterSelection } from "../types.js";

function quote(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function dateParts(value?: string): [number, number, number] | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

function filterArgs(config: DashboardConfig, selections: FilterSelection): string[] {
  const args: string[] = [];

  for (const filter of config.filters) {
    const selection = selections[filter.id];
    if (!selection) continue;

    if (filter.type === "multi-select" && Array.isArray(selection) && selection.length) {
      args.push(`TREATAS({${selection.map(quote).join(", ")}}, ${filter.field})`);
    }

    if (filter.type === "date-range" && !Array.isArray(selection)) {
      const from = dateParts(selection.from);
      const to = dateParts(selection.to);
      const conditions: string[] = [];
      if (from) conditions.push(`${filter.field} >= DATE(${from.join(", ")})`);
      if (to) conditions.push(`${filter.field} <= DATE(${to.join(", ")})`);
      if (conditions.length) args.push(`KEEPFILTERS(FILTER(ALL(${filter.field}), ${conditions.join(" && ")}))`);
    }
  }

  return args;
}

function calculateTable(expression: string, config: DashboardConfig, selections: FilterSelection): string {
  const args = filterArgs(config, selections);
  return args.length ? `CALCULATETABLE(\n${expression},\n${args.map((arg) => `  ${arg}`).join(",\n")}\n)` : expression;
}

export function cardsQuery(config: DashboardConfig, selections: FilterSelection): string | null {
  if (!config.cards.length) return null;
  const row = `ROW(\n${config.cards.map((card) => `  "${card.id}", ${card.measure}`).join(",\n")}\n)`;
  return `EVALUATE\n${calculateTable(row, config, selections)}`;
}

export function chartQuery(config: DashboardConfig, chartId: string, selections: FilterSelection): string {
  const chart = config.charts.find((item) => item.id === chartId);
  if (!chart) throw new Error(`Unknown chart: ${chartId}`);

  let table = `SELECTCOLUMNS(\n  SUMMARIZECOLUMNS(\n    ${chart.dimension},\n    "value", ${chart.measure}\n  ),\n  "label", ${chart.dimension},\n  "value", [value]\n)`;

  if (chart.limit) table = `TOPN(${chart.limit}, ${table}, [value], DESC)`;
  const sort = (chart.sort ?? "desc").toUpperCase();
  return `EVALUATE\n${calculateTable(table, config, selections)}\nORDER BY [value] ${sort}`;
}

export function filterOptionsQuery(config: DashboardConfig, filterId: string): string {
  const filter = config.filters.find((item) => item.id === filterId);
  if (!filter) throw new Error(`Unknown filter: ${filterId}`);
  if (filter.type !== "multi-select") throw new Error(`Filter ${filterId} does not expose discrete options.`);

  return `EVALUATE\nSELECTCOLUMNS(\n  FILTER(VALUES(${filter.field}), NOT ISBLANK(${filter.field})),\n  "value", ${filter.field}\n)\nORDER BY [value] ASC`;
}
