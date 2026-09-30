import type { ReactNode } from "react";

export type MetricItem = {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
};

export function MetricGroup({
  title,
  headline,
  metrics,
}: {
  title: string;
  headline: ReactNode;
  metrics: MetricItem[];
}) {
  return (
    <article className="metric-group">
      <span className="metric-corner" aria-hidden="true" />
      <div className={`metric-title ${title ? "" : "template-hidden"}`}>{title || "\u00A0"}</div>
      <div className="metric-headline">{headline}</div>
      <div className={`metric-list metric-list-${metrics.length}`}>
        {metrics.map((metric) => (
          <div className="metric-item" key={metric.label}>
            <div className={`metric-label ${metric.label ? "" : "template-hidden"}`}>{metric.label || "\u00A0"}</div>
            <div className="metric-value">{metric.value}</div>
            {metric.sub !== undefined && <div className="metric-sub">{metric.sub}</div>}
          </div>
        ))}
      </div>
    </article>
  );
}
