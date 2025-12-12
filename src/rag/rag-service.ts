import { createOpenAI } from "@ai-sdk/openai";
import { streamText, type LanguageModel } from "ai";
import type { RagConfig } from "../config/schema.js";
import type { SearchService } from "../search/search-service.js";
import type { SearchResult } from "../models/types.js";

export interface RagQuery {
  query: string;
  filters?: {
    repo?: string;
    language?: string;
  };
}

export interface RagContext {
  chunks: SearchResult[];
  totalChunks: number;
}

/**
 * RAG Service for answering questions about code using retrieved context
 */
export class RagService {
  private model: LanguageModel;
  private searchService: SearchService;
  private config: RagConfig;

  constructor(config: RagConfig, searchService: SearchService) {
    this.config = config;
    this.searchService = searchService;
    this.model = this.createModel();
  }

  private createModel(): LanguageModel {
    const { provider, model } = this.config;

    if (provider === "ollama") {
      // Ollama provides OpenAI-compatible API
      const ollama = createOpenAI({
        baseURL: this.config.ollama?.baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
        apiKey: "ollama", // Ollama doesn't require a real API key
      });
      return ollama(model);
    }

    if (provider === "openai-compatible") {
      // Generic OpenAI-compatible endpoint (vLLM, llama.cpp, TGI, etc.)
      const compatible = createOpenAI({
        baseURL: this.config["openai-compatible"]?.baseUrl || process.env.OPENAI_COMPATIBLE_BASE_URL || "http://localhost:8000/v1",
        apiKey: this.config["openai-compatible"]?.apiKey || process.env.OPENAI_COMPATIBLE_API_KEY || "no-key",
      });
      return compatible(model);
    }

    if (provider === "openrouter") {
      const openrouter = createOpenAI({
        baseURL: this.config.openrouter?.baseUrl || "https://openrouter.ai/api/v1",
        apiKey: this.config.openrouter?.apiKey || process.env.OPENROUTER_API_KEY || "",
        headers: {
          "HTTP-Referer": "https://github.com/code-rag",
          "X-Title": "Code RAG",
        },
      });
      return openrouter(model);
    }

    if (provider === "openai") {
      const openai = createOpenAI({
        baseURL: this.config.openai?.baseUrl || "https://api.openai.com/v1",
        apiKey: this.config.openai?.apiKey || process.env.OPENAI_API_KEY || "",
      });
      return openai(model);
    }

    throw new Error(`Unknown RAG provider: ${provider}`);
  }

  /**
   * Retrieve relevant code context for a query
   */
  async retrieveContext(request: RagQuery): Promise<RagContext> {
    const searchResult = await this.searchService.search({
      query: request.query,
      top_k: this.config.topK,
      filters: request.filters,
    });

    // Filter by minimum score
    const chunks = searchResult.results.filter(
      (r) => r.score >= this.config.minScore
    );

    return {
      chunks,
      totalChunks: searchResult.total,
    };
  }

  /**
   * Build the system prompt with code context
   */
  buildPrompt(context: RagContext): string {
    if (context.chunks.length === 0) {
      return `You are a helpful code assistant. No relevant code was found in the indexed repositories for this query. Let the user know and offer to help with general programming questions.`;
    }

    const codeContext = context.chunks
      .map((chunk, i) => {
        const header = `### [${i + 1}] ${chunk.repo}/${chunk.path}:${chunk.start_line}-${chunk.end_line}`;
        const meta = [
          chunk.symbol_name ? `Symbol: ${chunk.symbol_name}` : null,
          chunk.signature ? `Signature: ${chunk.signature}` : null,
          `Language: ${chunk.language}`,
          `Relevance: ${Math.round(chunk.score * 100)}%`,
        ]
          .filter(Boolean)
          .join(" | ");

        return `${header}\n${meta}\n\`\`\`${chunk.language}\n${chunk.text}\n\`\`\``;
      })
      .join("\n\n");

    return `You are a code expert assistant. Answer questions using ONLY the code context provided below.

## Instructions
- Base your answers on the provided code snippets
- Cite specific files and line numbers when referencing code (e.g., "In file.ts:42")
- If the code doesn't contain enough information to fully answer, say so
- Be concise but thorough

## Code Context (${context.chunks.length} relevant snippets)

${codeContext}

---
Answer the user's question based on the code above.`;
  }

  /**
   * Stream a RAG response for a query
   */
  async streamQuery(request: RagQuery) {
    // Retrieve relevant code context
    const context = await this.retrieveContext(request);

    // Build system prompt with context
    const systemPrompt = this.buildPrompt(context);

    // Stream response from LLM
    const result = streamText({
      model: this.model,
      maxTokens: this.config.maxTokens,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: request.query,
        },
      ],
    });

    return {
      stream: result,
      context,
    };
  }

  /**
   * Get a non-streaming RAG response
   */
  async query(request: RagQuery): Promise<{ text: string; context: RagContext }> {
    const { stream, context } = await this.streamQuery(request);

    // Collect the full response
    let text = "";
    for await (const chunk of stream.textStream) {
      text += chunk;
    }

    return { text, context };
  }

  /**
   * Check if the RAG service is properly configured
   */
  isConfigured(): boolean {
    const { provider } = this.config;

    // Local providers don't require API keys
    if (provider === "ollama") {
      return true; // Ollama runs locally, no API key needed
    }

    if (provider === "openai-compatible") {
      return true; // Self-hosted, API key is optional
    }

    // Online providers require API keys
    if (provider === "openrouter") {
      const apiKey = this.config.openrouter?.apiKey || process.env.OPENROUTER_API_KEY;
      return !!apiKey;
    }

    if (provider === "openai") {
      const apiKey = this.config.openai?.apiKey || process.env.OPENAI_API_KEY;
      return !!apiKey;
    }

    return false;
  }

  get providerName(): string {
    return `${this.config.provider}/${this.config.model}`;
  }
}
