import { ConfidentialClientApplication } from "@azure/msal-node";
import { env, entraConfigured } from "../config.js";

let cachedToken: { value: string; expiresAt: number } | null = null;

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const bracket = /^\[(.+)\]$/.exec(key);
    const tableBracket = /^[^[]+\[(.+)\]$/.exec(key);
    output[bracket?.[1] ?? tableBracket?.[1] ?? key] = value;
  }
  return output;
}

export async function getAccessToken(): Promise<string> {
  if (!entraConfigured || !env.TENANT_ID || !env.CLIENT_ID || !env.CLIENT_SECRET) {
    throw new Error("Microsoft Entra ID is not configured. Fill TENANT_ID, CLIENT_ID and CLIENT_SECRET in .env.");
  }

  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const app = new ConfidentialClientApplication({
    auth: {
      clientId: env.CLIENT_ID,
      authority: `https://login.microsoftonline.com/${env.TENANT_ID}`,
      clientSecret: env.CLIENT_SECRET,
    },
  });

  const result = await app.acquireTokenByClientCredential({
    scopes: ["https://analysis.windows.net/powerbi/api/.default"],
  });

  if (!result?.accessToken) throw new Error("Microsoft Entra ID did not return an access token.");

  cachedToken = {
    value: result.accessToken,
    expiresAt: result.expiresOn?.getTime() ?? Date.now() + 50 * 60_000,
  };

  return cachedToken.value;
}

async function powerBiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* keep empty */ }

  if (!response.ok) {
    const code = json?.error?.code ?? "PowerBIError";
    const detail = json?.error?.["pbi.error"]?.details?.[0]?.detail?.value ?? json?.error?.message ?? text;
    throw new Error(`${code} (${response.status}): ${detail}`);
  }

  return json as T;
}

export type PowerBiDataset = {
  id: string;
  name: string;
  configuredBy?: string;
  isRefreshable?: boolean;
  isOnPremisesDataGatewayOverrideEnabled?: boolean;
  targetStorageMode?: string;
};

export async function listWorkspaceDatasets(): Promise<PowerBiDataset[]> {
  if (!env.POWERBI_WORKSPACE_ID) {
    throw new Error("POWERBI_WORKSPACE_ID is required to list semantic models.");
  }

  const url = `https://api.powerbi.com/v1.0/myorg/groups/${env.POWERBI_WORKSPACE_ID}/datasets`;
  const result = await powerBiRequest<{ value?: PowerBiDataset[] }>(url);
  return result.value ?? [];
}

export async function executeDax(dax: string): Promise<Record<string, unknown>[]> {
  if (!env.POWERBI_WORKSPACE_ID || !env.POWERBI_DATASET_ID) {
    throw new Error("POWERBI_WORKSPACE_ID and POWERBI_DATASET_ID are required.");
  }

  const url = `https://api.powerbi.com/v1.0/myorg/groups/${env.POWERBI_WORKSPACE_ID}/datasets/${env.POWERBI_DATASET_ID}/executeQueries`;
  const json = await powerBiRequest<any>(url, {
    method: "POST",
    body: JSON.stringify({
      queries: [{ query: dax }],
      serializerSettings: { includeNulls: true },
    }),
  });

  const result = json?.results?.[0];
  if (result?.error) throw new Error(`${result.error.code ?? "DAXError"}: ${result.error.message ?? "Unknown DAX error"}`);

  return (result?.tables?.[0]?.rows ?? []).map((row: Record<string, unknown>) => normalizeRow(row));
}
