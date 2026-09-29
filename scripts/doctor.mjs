import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env");
const configPath = path.join(root, "config", "dashboard.json");

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
      })
  );
}

const env = readEnv(envPath);
const required = ["TENANT_ID", "CLIENT_ID", "CLIENT_SECRET", "POWERBI_WORKSPACE_ID", "POWERBI_DATASET_ID"];

console.log("Power BI Web Dashboard Doctor\n");

if (!fs.existsSync(envPath)) {
  console.log("✗ .env not found. Copy .env.example to .env");
} else {
  console.log("✓ .env found");
}

for (const key of required) {
  console.log(env[key] ? `✓ ${key} configured` : `✗ ${key} missing`);
}

try {
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  console.log("✓ config/dashboard.json is valid JSON");
  console.log(`  cards: ${config.cards?.length ?? 0}`);
  console.log(`  charts: ${config.charts?.length ?? 0}`);
  console.log(`  filters: ${config.filters?.length ?? 0}`);
} catch (error) {
  console.log(`✗ dashboard config invalid: ${error instanceof Error ? error.message : String(error)}`);
}

console.log("\nRun npm run dev and use 'Test connection' in the UI to validate Entra ID + Power BI executeQueries.");
