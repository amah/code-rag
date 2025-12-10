import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { SearchService } from "../../search/search-service.js";

// Request validation schemas
const SearchRequestSchema = z.object({
  query: z.string().min(1, "Query is required"),
  top_k: z.number().min(1).max(100).optional().default(20),
  filters: z
    .object({
      repo: z.string().optional(),
      language: z.string().optional(),
      microservice: z.string().optional(),
      symbol_type: z
        .enum(["file", "class", "interface", "enum", "function", "method", "block"])
        .optional(),
    })
    .optional(),
});

const GetFileChunksSchema = z.object({
  repo: z.string().min(1, "Repository name is required"),
  path: z.string().min(1, "File path is required"),
});

/**
 * Creates the search API router
 */
export function createSearchRouter(searchService: SearchService): Router {
  const router = Router();

  /**
   * POST /search-code
   * Search for code chunks using semantic search
   */
  router.post("/search-code", async (req: Request, res: Response) => {
    try {
      const parsed = SearchRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parsed.error.errors,
        });
      }

      const result = await searchService.search(parsed.data);

      return res.json(result);
    } catch (error) {
      console.error("Search error:", error);
      return res.status(500).json({
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /repositories
   * List all indexed repositories
   */
  router.get("/repositories", async (req: Request, res: Response) => {
    try {
      const repos = await searchService.listRepositories();
      return res.json({ repositories: repos });
    } catch (error) {
      console.error("List repositories error:", error);
      return res.status(500).json({
        error: "Failed to list repositories",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /repositories/:repo/stats
   * Get statistics for a specific repository
   */
  router.get("/repositories/:repo/stats", async (req: Request, res: Response) => {
    try {
      const { repo } = req.params;
      const stats = await searchService.getRepositoryStats(repo);
      return res.json(stats);
    } catch (error) {
      console.error("Get repository stats error:", error);
      return res.status(500).json({
        error: "Failed to get repository stats",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /file-chunks
   * Get all chunks for a specific file
   */
  router.get("/file-chunks", async (req: Request, res: Response) => {
    try {
      const parsed = GetFileChunksSchema.safeParse(req.query);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parsed.error.errors,
        });
      }

      const chunks = await searchService.getFileChunks(
        parsed.data.repo,
        parsed.data.path
      );

      return res.json({ chunks });
    } catch (error) {
      console.error("Get file chunks error:", error);
      return res.status(500).json({
        error: "Failed to get file chunks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return router;
}
