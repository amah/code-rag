import express, { type Express, type Request, type Response } from "express";
import type { AppConfig } from "../config/schema.js";
import { OpenSearchClient } from "../indexer/opensearch-client.js";
import { EmbeddingService } from "../embeddings/embedding-service.js";
import { SearchService } from "../search/search-service.js";
import { RagService } from "../rag/rag-service.js";
import { createSearchRouter } from "./routes/search.js";
import { createRagRouter } from "./routes/rag.js";

/**
 * Creates and configures the Express server
 */
export async function createServer(config: AppConfig): Promise<Express> {
  const app = express();

  // Middleware
  app.use(express.json());

  // Initialize services
  console.log("Initializing OpenSearch client...");
  const osClient = new OpenSearchClient(config.opensearch);

  // Check OpenSearch connection
  const isConnected = await osClient.ping();
  if (!isConnected) {
    throw new Error("Failed to connect to OpenSearch");
  }
  console.log("Connected to OpenSearch");

  console.log(`Initializing embedding service (${config.embedding.provider})...`);
  const embeddingService = await EmbeddingService.create(config.embedding);
  console.log("Embedding service initialized");

  const searchService = new SearchService(osClient, embeddingService);

  // Initialize RAG service if configured
  let ragService: RagService | null = null;
  if (config.rag) {
    console.log(`Initializing RAG service (${config.rag.provider}/${config.rag.model})...`);
    ragService = new RagService(config.rag, searchService);
    if (ragService.isConfigured()) {
      console.log("RAG service initialized");
    } else {
      console.log("RAG service initialized but API key not set - RAG queries disabled");
    }
  }

  // Health check endpoint
  app.get("/health", async (req: Request, res: Response) => {
    const osHealthy = await osClient.ping();

    res.json({
      status: osHealthy ? "healthy" : "degraded",
      services: {
        opensearch: osHealthy ? "connected" : "disconnected",
        embedding: embeddingService.providerName,
        rag: ragService?.isConfigured() ? ragService.providerName : "not configured",
      },
    });
  });

  // API routes
  app.use("/api", createSearchRouter(searchService));
  app.use("/api", createRagRouter(ragService));

  // Also mount at root for backwards compatibility
  app.use("/", createSearchRouter(searchService));
  app.use("/", createRagRouter(ragService));

  return app;
}

/**
 * Starts the Express server
 */
export async function startServer(config: AppConfig): Promise<void> {
  const app = await createServer(config);
  const port = config.server.rest.port;

  app.listen(port, () => {
    console.log(`\nCode RAG API server running on http://localhost:${port}`);
    console.log(`\nEndpoints:`);
    console.log(`  POST /search-code     - Search for code`);
    console.log(`  GET  /repositories    - List indexed repositories`);
    console.log(`  GET  /repositories/:repo/stats - Get repository stats`);
    console.log(`  GET  /file-chunks     - Get chunks for a file`);
    console.log(`  POST /rag/query       - RAG query with AI response (streaming)`);
    console.log(`  GET  /rag/status      - RAG service status`);
    console.log(`  GET  /health          - Health check`);
  });
}
