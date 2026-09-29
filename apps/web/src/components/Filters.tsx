import { useEffect, useState } from "react";
import { getFilterOptions } from "../services/api";
import type { FilterSelections, PublicConfig } from "../types/api";

export function Filters({ config, value, onChange }: {
  config: PublicConfig;
  value: FilterSelections;
  onChange: (next: FilterSelections) => void;
}) {
  const [options, setOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    config.filters.filter((filter) => filter.type === "multi-select").forEach((filter) => {
      getFilterOptions(filter.id)
        .then((items) => setOptions((current) => ({ ...current, [filter.id]: items })))
        .catch(() => setOptions((current) => ({ ...current, [filter.id]: [] })));
    });
  }, [config]);

  if (!config.filters.length) return null;

  return (
    <section className="filters-panel">
      <div className="section-heading">
        <span>FILTERS</span>
        <h2>Refine the dashboard</h2>
      </div>
      <div className="filters-grid">
        {config.filters.map((filter) => {
          if (filter.type === "date-range") {
            const selected = !Array.isArray(value[filter.id]) ? value[filter.id] as { from?: string; to?: string } | undefined : undefined;
            return (
              <div className="filter-control" key={filter.id}>
                <label>{filter.label}</label>
                <div className="date-pair">
                  <input type="date" value={selected?.from ?? ""} onChange={(event) => onChange({ ...value, [filter.id]: { ...selected, from: event.target.value } })} />
                  <input type="date" value={selected?.to ?? ""} onChange={(event) => onChange({ ...value, [filter.id]: { ...selected, to: event.target.value } })} />
                </div>
              </div>
            );
          }

          const selected = Array.isArray(value[filter.id]) ? value[filter.id] as string[] : [];
          return (
            <div className="filter-control" key={filter.id}>
              <label>{filter.label}</label>
              <select
                multiple
                value={selected}
                onChange={(event) => onChange({ ...value, [filter.id]: Array.from(event.currentTarget.selectedOptions).map((item) => item.value) })}
              >
                {(options[filter.id] ?? []).map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </div>
          );
        })}
      </div>
    </section>
  );
}
