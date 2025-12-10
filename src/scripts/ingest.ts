#!/usr/bin/env bun
/**
 * CLI script for running the ingestion pipeline
 */
import { parseArgs } from "util";
import { getConfig } from "../config/index.js";
import { IngestionPipeline } from "../pipeline/ingestion-pipeline.js";

function printHelp() {
  console.log(`
Code RAG Ingestion CLI

Usage:
  bun run ingest [options]

Options:
  --repo <name>    Only index a specific repository
  --dry-run        Parse and chunk files but don't index
  --config <path>  Path to config file (default: config/default.yaml)
  --help           Show this help message

Examples:
  bun run ingest                      # Index all repositories
  bun run ingest --repo my-service    # Index only my-service
  bun run ingest --dry-run            # Preview what would be indexed
`);
}

async function main() {
  // Parse arguments
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      repo: { type: "string" },
      "dry-run": { type: "boolean", default: false },
      config: { type: "string" },
      help: { type: "boolean", default: false },
    },
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  console.log("Code RAG Ingestion Pipeline");
  console.log("===========================\n");

  // Load configuration
  console.log("Loading configuration...");
  const config = getConfig(values.config);
  console.log(`  Repositories root: ${config.repositories.rootDir}`);
  console.log(`  OpenSearch: ${config.opensearch.url}`);
  console.log(`  Embedding provider: ${config.embedding.provider}`);

  // Create and run pipeline
  const pipeline = new IngestionPipeline(config);

  try {
    const result = await pipeline.run({
      repo: values.repo,
      dryRun: values["dry-run"],
      onProgress: (status) => {
        // Progress indicator (optional)
        if (status.phase === "parsing" && status.file) {
          process.stdout.write(
            `\r  Parsing: ${status.filesProcessed}/${status.totalFiles} files`
          );
        } else if (status.phase === "embedding") {
          process.stdout.write(
            `\r  Embedding: ${status.chunksIndexed ?? 0}/${status.chunksCreated} chunks`
          );
        } else if (status.phase === "indexing") {
          process.stdout.write(
            `\r  Indexing: ${status.chunksIndexed ?? 0}/${status.chunksCreated} chunks`
          );
        }
      },
    });

    // Clear progress line
    process.stdout.write("\r" + " ".repeat(60) + "\r");

    // Print summary
    console.log("\n\nIngestion Complete!");
    console.log("===================");
    console.log(`  Repositories: ${result.repositories}`);
    console.log(`  Files processed: ${result.files}`);
    console.log(`  Chunks created: ${result.chunks}`);
    console.log(`  Chunks indexed: ${result.indexed}`);
    console.log(`  Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      for (const error of result.errors.slice(0, 10)) {
        console.log(`  - ${error}`);
      }
      if (result.errors.length > 10) {
        console.log(`  ... and ${result.errors.length - 10} more`);
      }
    }

    await pipeline.dispose();
  } catch (error) {
    console.error("\nIngestion failed:", error);
    await pipeline.dispose();
    process.exit(1);
  }
}

main();
