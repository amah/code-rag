#!/usr/bin/env bun
/**
 * Script to create/recreate the OpenSearch index for code chunks
 */
import { getConfig, getEmbeddingDimension } from "../config/index.js";
import { OpenSearchClient } from "../indexer/opensearch-client.js";

async function main() {
  const args = process.argv.slice(2);
  const forceRecreate = args.includes("--force") || args.includes("-f");

  console.log("Loading configuration...");
  const config = getConfig();

  console.log(`Connecting to OpenSearch at ${config.opensearch.url}...`);
  const client = new OpenSearchClient(config.opensearch);

  // Check connection
  const isConnected = await client.ping();
  if (!isConnected) {
    console.error("❌ Failed to connect to OpenSearch");
    process.exit(1);
  }
  console.log("✅ Connected to OpenSearch");

  // Check if index exists
  const indexExists = await client.indexExists();
  const indexName = client.getIndexName();

  if (indexExists) {
    if (forceRecreate) {
      console.log(`Deleting existing index '${indexName}'...`);
      await client.deleteIndex();
      console.log("✅ Index deleted");
    } else {
      console.log(`⚠️  Index '${indexName}' already exists.`);
      console.log("   Use --force to recreate it.");
      await client.close();
      process.exit(0);
    }
  }

  // Get embedding dimension from config
  const dimension = getEmbeddingDimension(config);
  console.log(`Creating index '${indexName}' with embedding dimension ${dimension}...`);

  try {
    await client.createIndex(dimension);
    console.log("✅ Index created successfully");
  } catch (error) {
    console.error("❌ Failed to create index:", error);
    process.exit(1);
  }

  await client.close();
  console.log("\nIndex setup complete!");
  console.log(`\nNext steps:`);
  console.log(`  1. Run 'bun run ingest' to index your repositories`);
  console.log(`  2. Run 'bun run dev' to start the search API server`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
