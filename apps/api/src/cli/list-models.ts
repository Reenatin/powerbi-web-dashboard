import { env, entraConfigured } from "../config.js";
import { listWorkspaceDatasets } from "../powerbi/client.js";

function shortId(value?: string): string {
  if (!value) return "not configured";
  return value;
}

async function main() {
  console.log("");
  console.log("Power BI Web Dashboard — Semantic Models");
  console.log("========================================");
  console.log("");

  if (!entraConfigured) {
    console.error("✗ Microsoft Entra ID is not configured.");
    console.error("  Fill TENANT_ID, CLIENT_ID and CLIENT_SECRET in .env.");
    process.exitCode = 1;
    return;
  }

  if (!env.POWERBI_WORKSPACE_ID) {
    console.error("✗ POWERBI_WORKSPACE_ID is missing in .env.");
    console.error("  Add the workspace ID first, then run this command again.");
    process.exitCode = 1;
    return;
  }

  console.log(`Workspace ID: ${env.POWERBI_WORKSPACE_ID}`);
  console.log(`Current Dataset ID: ${shortId(env.POWERBI_DATASET_ID)}`);
  console.log("");
  console.log("Connecting to Microsoft Entra ID and Power BI...");

  try {
    const datasets = await listWorkspaceDatasets();

    if (!datasets.length) {
      console.log("");
      console.log("No semantic models were returned for this workspace.");
      console.log("Check whether the Service Principal has access to the workspace.");
      return;
    }

    console.log("");
    console.log(`Semantic Models found: ${datasets.length}`);
    console.log("");

    datasets.forEach((dataset, index) => {
      const selected = dataset.id === env.POWERBI_DATASET_ID ? "  ← CURRENT" : "";
      console.log(`${index + 1}. ${dataset.name}${selected}`);
      console.log(`   Dataset ID: ${dataset.id}`);
      if (dataset.targetStorageMode) {
        console.log(`   Storage mode: ${dataset.targetStorageMode}`);
      }
      console.log("");
    });

    console.log("Copy the desired Dataset ID to your .env:");
    console.log("");
    console.log("POWERBI_DATASET_ID=<dataset-id>");
    console.log("POWERBI_DATASET_NAME=<semantic-model-name>");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("✗ Could not list semantic models.");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("");
    console.error("Check:");
    console.error("  • TENANT_ID / CLIENT_ID / CLIENT_SECRET");
    console.error("  • POWERBI_WORKSPACE_ID");
    console.error("  • Service Principal access to the workspace");
    process.exitCode = 1;
  }
}

main();
