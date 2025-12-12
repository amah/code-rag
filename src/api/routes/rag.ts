import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { RagService } from "../../rag/rag-service.js";

// Request validation schema
const RagQuerySchema = z.object({
  query: z.string().min(1, "Query is required"),
  filters: z
    .object({
      repo: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
  stream: z.boolean().optional().default(true),
});

/**
 * Creates the RAG API router
 */
export function createRagRouter(ragService: RagService | null): Router {
  const router = Router();

  /**
   * POST /rag/query
   * Query code using RAG with streaming response
   */
  router.post("/rag/query", async (req: Request, res: Response) => {
    // Check if RAG is configured
    if (!ragService) {
      return res.status(503).json({
        error: "RAG service not configured",
        message: "Set OPENROUTER_API_KEY or OPENAI_API_KEY to enable RAG queries",
      });
    }

    if (!ragService.isConfigured()) {
      return res.status(503).json({
        error: "RAG service not configured",
        message: "API key not set for the configured provider",
      });
    }

    try {
      const parsed = RagQuerySchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: parsed.error.errors,
        });
      }

      const { query, filters, stream } = parsed.data;

      if (stream) {
        // Set up SSE headers for streaming
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.flushHeaders();

        try {
          const { stream: ragStream, context } = await ragService.streamQuery({
            query,
            filters,
          });

          // Send context metadata first
          res.write(
            `data: ${JSON.stringify({
              type: "context",
              chunks: context.chunks.length,
              sources: context.chunks.map((c) => ({
                repo: c.repo,
                path: c.path,
                lines: `${c.start_line}-${c.end_line}`,
                symbol: c.symbol_name,
                score: c.score,
              })),
            })}\n\n`
          );

          // Stream text chunks
          for await (const chunk of ragStream.textStream) {
            res.write(`data: ${JSON.stringify({ type: "text", content: chunk })}\n\n`);
          }

          // Send done event
          res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
          res.end();
        } catch (streamError) {
          console.error("RAG stream error:", streamError);
          res.write(
            `data: ${JSON.stringify({
              type: "error",
              message: streamError instanceof Error ? streamError.message : "Stream error",
            })}\n\n`
          );
          res.end();
        }
      } else {
        // Non-streaming response
        const { text, context } = await ragService.query({ query, filters });

        return res.json({
          answer: text,
          sources: context.chunks.map((c) => ({
            repo: c.repo,
            path: c.path,
            lines: `${c.start_line}-${c.end_line}`,
            symbol: c.symbol_name,
            score: c.score,
            text: c.text,
          })),
        });
      }
    } catch (error) {
      console.error("RAG query error:", error);
      return res.status(500).json({
        error: "RAG query failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /rag/status
   * Check RAG service status
   */
  router.get("/rag/status", (req: Request, res: Response) => {
    if (!ragService) {
      return res.json({
        enabled: false,
        message: "RAG service not configured",
      });
    }

    return res.json({
      enabled: true,
      configured: ragService.isConfigured(),
      provider: ragService.providerName,
    });
  });

  return router;
}
