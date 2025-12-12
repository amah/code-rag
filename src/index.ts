#!/usr/bin/env bun
/**
 * Code RAG - REST API Server Entry Point
 */
import { getConfig } from "./config/index.js";
import { startServer } from "./api/server.js";
import { parseArgs } from "util";

function printUsage() {
  console.log(`
Usage: bun run src/index.ts [options]

Options:
  -c, --config <path>  Path to configuration file (default: config/default.yaml)
  -h, --help           Show this help message

Environment Variables:
  OPENSEARCH_URL       OpenSearch server URL (default: http://localhost:9200)
  REST_PORT            REST API server port (default: 3000)
  RAG_PROVIDER         RAG provider: ollama, openrouter, openai, openai-compatible
  RAG_MODEL            Model name for RAG (default: llama3.2)
  OPENROUTER_API_KEY   API key for OpenRouter provider
  OPENAI_API_KEY       API key for OpenAI provider
  REPOS_ROOT_DIR       Root directory containing repositories to index
`);
}

async function main() {
  // Parse command line arguments
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      config: { type: "string", short: "c" },
      help: { type: "boolean", short: "h" },
    },
    strict: true,
    allowPositionals: false,
  });

  if (values.help) {
    printUsage();
    process.exit(0);
  }

  console.log("Code RAG - Source Code Search API");
  console.log("==================================\n");

  // Load configuration
  console.log("Loading configuration...");
  const config = getConfig(values.config);

  if (!config.server.rest.enabled) {
    console.log("REST API server is disabled in configuration.");
    process.exit(0);
  }

  try {
    await startServer(config);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
