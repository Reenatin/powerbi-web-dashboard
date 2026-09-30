import { useMemo, useState } from "react";

export function MultiSelectFilter({
  label,
  values,
  options,
  onChange,
  searchPlaceholder,
}: {
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
  searchPlaceholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    if (!query) return options;
    return options.filter((item) => item.toLocaleLowerCase("pt-BR").includes(query));
  }, [options, search]);

  const allSelected = options.length > 0 && values.length === options.length;
  const hasSelection = values.length > 0;
  const summary = !hasSelection
    ? "Todos"
    : values.length === 1
      ? values[0]
      : `${values.length} selecionados`;

  const toggle = (value: string) => {
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    );
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : [...options]);
  };

  return (
    <div className="multi-filter-group">
      <span className="filter-label">{label}</span>
      <button
        className="multi-filter-trigger"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="multi-filter-copy">
          <small>{hasSelection ? "Seleção atual" : "Sem restrição"}</small>
          <strong title={summary}>{summary}</strong>
        </span>
        {hasSelection && <span className="multi-filter-count">{values.length}</span>}
        <span className="multi-filter-chevron" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="multi-filter-panel">
          <input
            className="multi-filter-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
          />

          <div className="multi-filter-options">
            <label className="multi-filter-option multi-filter-option-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
              />
              <span className="multi-filter-check">✓</span>
              <span className="multi-filter-option-copy">
                <strong>Todos</strong>
                <small>{options.length ? `${options.length} opções disponíveis` : "Nenhuma opção disponível"}</small>
              </span>
            </label>

            {filtered.map((option) => (
              <label className="multi-filter-option" key={option}>
                <input
                  type="checkbox"
                  checked={values.includes(option)}
                  onChange={() => toggle(option)}
                />
                <span className="multi-filter-check">✓</span>
                <span className="multi-filter-option-copy">
                  <strong title={option}>{option}</strong>
                </span>
              </label>
            ))}

            {options.length > 0 && filtered.length === 0 && (
              <div className="multi-filter-empty">Nenhuma opção encontrada.</div>
            )}
            {options.length === 0 && (
              <div className="multi-filter-empty">Nenhuma opção disponível.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
