import OpenAI from "openai";
import type { OpenAIEmbeddingConfig } from "../../config/schema.js";
import { type EmbeddingProvider, truncateToTokenLimit } from "./base-provider.js";

const MAX_TOKENS = 8191; // OpenAI text-embedding-ada-002 limit

/**
 * OpenAI embedding provider
 */
export class OpenAIProvider implements EmbeddingProvider {
  readonly name = "openai";
  readonly dimension: number;

  private client: OpenAI;
  private model: string;
  private batchSize: number;

  constructor(config: OpenAIEmbeddingConfig) {
    this.dimension = config.dimension;
    this.model = config.model;
    this.batchSize = config.batchSize;

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async initialize(): Promise<void> {
    // OpenAI client doesn't need explicit initialization
    // Could add a test embedding call here to verify credentials
  }

  async embed(text: string): Promise<number[]> {
    const truncated = truncateToTokenLimit(text, MAX_TOKENS);

    const response = await this.client.embeddings.create({
      model: this.model,
      input: truncated,
    });

    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const truncatedBatch = batch.map((t) =>
        truncateToTokenLimit(t, MAX_TOKENS)
      );

      const response = await this.client.embeddings.create({
        model: this.model,
        input: truncatedBatch,
      });

      // OpenAI returns embeddings in the same order as input
      for (const item of response.data) {
        results.push(item.embedding);
      }
    }

    return results;
  }

  async dispose(): Promise<void> {
    // Nothing to cleanup for OpenAI client
  }
}
