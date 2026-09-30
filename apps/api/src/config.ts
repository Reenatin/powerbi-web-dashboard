import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootEnv = path.resolve(here, "../../../.env");
dotenv.config({ path: rootEnv });

const schema = z.object({
  TENANT_ID: z.string().optional(),
  CLIENT_ID: z.string().optional(),
  CLIENT_SECRET: z.string().optional(),
  POWERBI_WORKSPACE_ID: z.string().optional(),
  POWERBI_DATASET_ID: z.string().optional(),
  POWERBI_DATASET_NAME: z.string().optional(),
  API_PORT: z.coerce.number().int().positive().default(3001),
});

export const env = schema.parse(process.env);

export const entraConfigured = Boolean(
  env.TENANT_ID &&
  env.CLIENT_ID &&
  env.CLIENT_SECRET
);

export const workspaceConfigured = Boolean(
  entraConfigured &&
  env.POWERBI_WORKSPACE_ID
);

export const powerBiConfigured = Boolean(
  workspaceConfigured &&
  env.POWERBI_DATASET_ID
);
