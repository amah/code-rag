#!/usr/bin/env bun
/**
 * Code RAG - REST API Server Entry Point
 */
import { getConfig } from "./config/index.js";
import { startServer } from "./api/server.js";

async function main() {
  console.log("Code RAG - Source Code Search API");
  console.log("==================================\n");

  // Load configuration
  console.log("Loading configuration...");
  const config = getConfig();

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
