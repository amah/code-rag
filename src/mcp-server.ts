#!/usr/bin/env bun
/**
 * Code RAG - MCP Server Entry Point
 */
import { getConfig } from "./config/index.js";
import { startMcpServer } from "./mcp/server.js";

async function main() {
  // Note: MCP server logs to stderr to not interfere with stdio transport
  console.error("Code RAG - MCP Server");
  console.error("=====================\n");

  // Load configuration
  console.error("Loading configuration...");
  const config = getConfig();

  if (!config.server.mcp.enabled) {
    console.error("MCP server is disabled in configuration.");
    process.exit(0);
  }

  try {
    await startMcpServer(config);
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main();
