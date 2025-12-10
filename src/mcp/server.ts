import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { AppConfig } from "../config/schema.js";
import { OpenSearchClient } from "../indexer/opensearch-client.js";
import { EmbeddingService } from "../embeddings/embedding-service.js";
import { SearchService } from "../search/search-service.js";
import {
  searchCodeTool,
  handleSearchCode,
  listRepositoriesTool,
  handleListRepositories,
  getRepositoryStatsTool,
  handleGetRepositoryStats,
  getFileChunksTool,
  handleGetFileChunks,
} from "./tools/index.js";

/**
 * Creates and starts the MCP server
 */
export async function createMcpServer(config: AppConfig): Promise<Server> {
  // Initialize services
  console.error("Initializing OpenSearch client...");
  const osClient = new OpenSearchClient(config.opensearch);

  const isConnected = await osClient.ping();
  if (!isConnected) {
    throw new Error("Failed to connect to OpenSearch");
  }
  console.error("Connected to OpenSearch");

  console.error(`Initializing embedding service (${config.embedding.provider})...`);
  const embeddingService = await EmbeddingService.create(config.embedding);
  console.error("Embedding service initialized");

  const searchService = new SearchService(osClient, embeddingService);

  // Create MCP server
  const server = new Server(
    {
      name: "code-rag",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register tool listing handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        searchCodeTool,
        listRepositoriesTool,
        getRepositoryStatsTool,
        getFileChunksTool,
      ],
    };
  });

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      let result: string;

      switch (name) {
        case "search_code":
          result = await handleSearchCode(searchService, args as any);
          break;

        case "list_repositories":
          result = await handleListRepositories(searchService);
          break;

        case "get_repository_stats":
          result = await handleGetRepositoryStats(searchService, args as any);
          break;

        case "get_file_chunks":
          result = await handleGetFileChunks(searchService, args as any);
          break;

        default:
          throw new Error(`Unknown tool: ${name}`);
      }

      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Starts the MCP server with stdio transport
 */
export async function startMcpServer(config: AppConfig): Promise<void> {
  const server = await createMcpServer(config);
  const transport = new StdioServerTransport();

  console.error("Starting Code RAG MCP server...");
  await server.connect(transport);
  console.error("MCP server connected via stdio");
}
