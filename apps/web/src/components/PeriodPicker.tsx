import { useEffect, useMemo, useState } from "react";

const weekdayLabels = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"];
const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type Preset = "today" | "week" | "month" | "3m" | "6m" | "1y";

function parseKey(value?: string | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function startOfWeekMonday(date: Date): Date {
  const result = new Date(date);
  const offset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - offset);
  return result;
}

function formatDate(value?: string): string {
  const date = parseKey(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function normalizeRange(start?: string, end?: string): [string | undefined, string | undefined] {
  if (!start || !end) return [start, end];
  return start <= end ? [start, end] : [end, start];
}

function daysBetween(start?: string, end?: string): number {
  const a = parseKey(start);
  const b = parseKey(end);
  if (!a || !b) return 0;
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

function clampKey(key: string, minDate?: string | null, maxDate?: string | null): string {
  if (minDate && key < minDate) return minDate;
  if (maxDate && key > maxDate) return maxDate;
  return key;
}

export function PeriodPicker({
  from,
  to,
  minDate,
  maxDate,
  onChange,
}: {
  from?: string;
  to?: string;
  minDate?: string | null;
  maxDate?: string | null;
  onChange: (range: { from?: string; to?: string }) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const todayKey = toKey(today);
  const maxSelectableKey = todayKey;
  const maxSelectableDate = today;
  const minSelectableDate = parseKey(minDate ?? undefined);

  const initialAnchor = parseKey(to ?? maxDate ?? undefined) ?? maxSelectableDate;
  const [open, setOpen] = useState(false);
  const [awaitingEnd, setAwaitingEnd] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(firstOfMonth(initialAnchor));

  useEffect(() => {
    const candidate = parseKey(to ?? maxDate ?? undefined) ?? maxSelectableDate;
    const capped = candidate > maxSelectableDate ? maxSelectableDate : candidate;
    setVisibleMonth(firstOfMonth(capped));
  }, [to, maxDate, maxSelectableKey]);

  const [start, end] = normalizeRange(from, to);

  const calendarCells = useMemo(() => {
    const first = firstOfMonth(visibleMonth);
    const last = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
    const mondayOffset = (first.getDay() + 6) % 7;
    const cells: Array<Date | null> = Array.from({ length: mondayOffset }, () => null);
    for (let day = 1; day <= last.getDate(); day += 1) {
      cells.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [visibleMonth]);

  const isAvailable = (key: string) => {
    if (minDate && key < minDate) return false;
    if (key > maxSelectableKey) return false;
    return true;
  };

  const chooseDay = (key: string) => {
    if (!isAvailable(key)) return;

    if (!awaitingEnd || !from) {
      onChange({ from: key, to: key });
      setAwaitingEnd(true);
      return;
    }

    if (key < from) onChange({ from: key, to: from });
    else onChange({ from, to: key });
    setAwaitingEnd(false);
  };

  const setPresetRange = (preset: Preset) => {
    const endDate = new Date(maxSelectableDate);
    let startDate = new Date(endDate);

    if (preset === "week") {
      startDate = startOfWeekMonday(endDate);
    } else if (preset === "month") {
      startDate = firstOfMonth(endDate);
    } else if (preset === "3m") {
      startDate = addMonths(firstOfMonth(endDate), -2);
    } else if (preset === "6m") {
      startDate = addMonths(firstOfMonth(endDate), -5);
    } else if (preset === "1y") {
      startDate = addMonths(firstOfMonth(endDate), -11);
    }

    const endKey = clampKey(toKey(endDate), minDate, maxSelectableKey);
    const startKey = clampKey(toKey(startDate), minDate, endKey);
    onChange({ from: startKey, to: endKey });
    setVisibleMonth(firstOfMonth(endDate));
    setAwaitingEnd(false);
  };

  const minMonth = minSelectableDate ? firstOfMonth(minSelectableDate) : null;
  const maxMonth = firstOfMonth(maxSelectableDate);
  const canGoPrevious = !minMonth || monthIndex(visibleMonth) > monthIndex(minMonth);
  const canGoNext = monthIndex(visibleMonth) < monthIndex(maxMonth);

  const selectedCount = daysBetween(start, end);
  const summary = start && end
    ? start === end
      ? formatDate(start)
      : `${formatDate(start)} — ${formatDate(end)}`
    : formatDate(maxSelectableKey);

  return (
    <div className="period-picker">
      <button
        type="button"
        className="period-picker-trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="period-picker-calendar" aria-hidden="true">▦</span>
        <span className="period-picker-trigger-copy">
          <small>Intervalo selecionado</small>
          <strong>{summary}</strong>
        </span>
        <span className="period-picker-chevron" aria-hidden="true">⌄</span>
      </button>

      {open && (
        <div className="period-picker-panel">
          <div className="period-quick-row">
            <button type="button" className="period-quick" onClick={() => setPresetRange("today")}>Hoje</button>
            <button type="button" className="period-quick" onClick={() => setPresetRange("week")}>Essa Semana</button>
            <button type="button" className="period-quick" onClick={() => setPresetRange("month")}>Esse Mês</button>
            <button type="button" className="period-quick" onClick={() => setPresetRange("3m")}>3 Meses</button>
            <button type="button" className="period-quick" onClick={() => setPresetRange("6m")}>6 Meses</button>
            <button type="button" className="period-quick" onClick={() => setPresetRange("1y")}>1 Ano</button>
          </div>

          <div className="period-range-summary">
            <div className="period-range-field">
              <span>De</span>
              <strong>{formatDate(start)}</strong>
            </div>
            <span className="period-range-arrow">→</span>
            <div className="period-range-field">
              <span>Até</span>
              <strong>{formatDate(end)}</strong>
            </div>
          </div>

          <div className="period-picker-calendar-card">
            <div className="period-picker-month-nav">
              <button
                type="button"
                aria-label="Mês anterior"
                disabled={!canGoPrevious}
                onClick={() => {
                  if (canGoPrevious) setVisibleMonth((value) => addMonths(value, -1));
                }}
              >‹</button>
              <strong>{monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}</strong>
              <button
                type="button"
                aria-label="Próximo mês"
                disabled={!canGoNext}
                onClick={() => {
                  if (canGoNext) setVisibleMonth((value) => addMonths(value, 1));
                }}
              >›</button>
            </div>

            <div className="period-weekdays" aria-hidden="true">
              {weekdayLabels.map((label) => <span key={label}>{label}</span>)}
            </div>

            <div className="period-day-grid" aria-label="Dias do mês">
              {calendarCells.map((date, index) => {
                if (!date) return <span className="period-day-empty" key={`empty-${index}`} />;
                const key = toKey(date);
                const disabled = !isAvailable(key);
                const inRange = Boolean(start && end && key > start && key < end);
                const rangeStart = key === start;
                const rangeEnd = key === end;
                return (
                  <button
                    type="button"
                    key={key}
                    disabled={disabled}
                    aria-disabled={disabled}
                    className={[
                      "period-day-button",
                      disabled ? "unavailable" : "",
                      inRange ? "in-range" : "",
                      rangeStart ? "range-start" : "",
                      rangeEnd ? "range-end" : "",
                      awaitingEnd && !rangeStart ? "awaiting-end" : "",
                    ].filter(Boolean).join(" ")}
                    onClick={() => chooseDay(key)}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="period-picker-helper">
            <span className="period-helper-dot" />
            <span>
              {awaitingEnd
                ? "Agora selecione a data final."
                : selectedCount > 0
                  ? `${selectedCount} ${selectedCount === 1 ? "dia selecionado" : "dias selecionados"}.`
                  : "Selecione a data inicial e a data final."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
