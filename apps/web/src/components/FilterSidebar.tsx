import { useEffect, useMemo, useState } from "react";
import { getFilterOptions } from "../services/api";
import type { FilterSelections, PublicConfig } from "../types/api";
import { MultiSelectFilter } from "./MultiSelectFilter";
import { PeriodPicker } from "./PeriodPicker";

function cloneSelections(value: FilterSelections): FilterSelections {
  const next: FilterSelections = {};
  for (const [key, selected] of Object.entries(value)) {
    next[key] = Array.isArray(selected) ? [...selected] : { ...selected };
  }
  return next;
}

export function FilterSidebar({
  open,
  onClose,
  config,
  value,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  config: PublicConfig;
  value: FilterSelections;
  onApply: (value: FilterSelections) => void;
}) {
  const [draft, setDraft] = useState<FilterSelections>(() => cloneSelections(value));
  const [options, setOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (open) setDraft(cloneSelections(value));
  }, [open, value]);

  useEffect(() => {
    let active = true;
    const multi = config.filters.filter((filter) => filter.type === "multi-select");

    Promise.all(
      multi.map(async (filter) => {
        try {
          const items = await getFilterOptions(filter.id);
          return [filter.id, items] as const;
        } catch {
          return [filter.id, []] as const;
        }
      }),
    ).then((entries) => {
      if (!active) return;
      setOptions(Object.fromEntries(entries));
    });

    return () => {
      active = false;
    };
  }, [config.filters]);

  const clearValue = useMemo<FilterSelections>(() => {
    const next: FilterSelections = {};
    for (const filter of config.filters) {
      next[filter.id] = filter.type === "multi-select" ? [] : {};
    }
    return next;
  }, [config.filters]);

  return (
    <aside className="filter-sidebar" aria-label="Filtros" aria-hidden={!open}>
      <div className="filter-header">
        <div className="filter-title-icon" aria-hidden="true">
          <span className="funnel-icon" />
        </div>
        <div>
          <h2>Filtros</h2>
          <p>Refine a visão do dashboard</p>
        </div>
        <button className="collapse-filter" type="button" onClick={onClose} aria-label="Fechar filtros">‹</button>
      </div>

      <div className="filter-body">
        {config.filters.map((filter) => {
          if (filter.type === "date-range") {
            const selected = !Array.isArray(draft[filter.id])
              ? draft[filter.id] as { from?: string; to?: string } | undefined
              : undefined;

            return (
              <div className="filter-group period-filter-group" key={filter.id}>
                <span className="filter-label">{filter.label}</span>
                <PeriodPicker
                  from={selected?.from}
                  to={selected?.to}
                  onChange={(range) => setDraft((current) => ({ ...current, [filter.id]: range }))}
                />
              </div>
            );
          }

          const selected = Array.isArray(draft[filter.id]) ? draft[filter.id] as string[] : [];

          return (
            <MultiSelectFilter
              key={filter.id}
              label={filter.label}
              values={selected}
              options={options[filter.id] ?? []}
              searchPlaceholder={`Pesquisar ${filter.label.toLocaleLowerCase("pt-BR")}`}
              onChange={(values) => setDraft((current) => ({ ...current, [filter.id]: values }))}
            />
          );
        })}
      </div>

      <div className="filter-actions">
        <button className="secondary-button" type="button" onClick={() => setDraft(cloneSelections(clearValue))}>
          Limpar
        </button>
        <button
          className="primary-button"
          type="button"
          onClick={() => {
            onApply(cloneSelections(draft));
            if (window.innerWidth <= 900) onClose();
          }}
        >
          Aplicar filtros
        </button>
      </div>
    </aside>
  );
}
