import type { DashboardData, FilterSelections, PublicConfig, SystemStatus } from "../types/api";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { throw new Error(text || `HTTP ${response.status}`); }
  if (!response.ok) throw new Error(json?.message ?? json?.error ?? `HTTP ${response.status}`);
  return json as T;
}

export const getStatus = () => request<SystemStatus>("/api/system/status");
export const getConfig = () => request<PublicConfig>("/api/dashboard/config");
export const getFilterOptions = (id: string) => request<string[]>(`/api/dashboard/filters/${encodeURIComponent(id)}/options`);

export const testConnection = () => request<{ ok: boolean }>("/api/system/test-connection", { method: "POST" });

export const getDashboardData = (filters: FilterSelections) => request<DashboardData>("/api/dashboard/data", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ filters }),
});
