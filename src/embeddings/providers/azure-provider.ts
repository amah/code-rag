import OpenAI, { AzureOpenAI } from "openai";
import type { AzureEmbeddingConfig } from "../../config/schema.js";
import { type EmbeddingProvider, truncateToTokenLimit } from "./base-provider.js";

const MAX_TOKENS = 8191;

/**
 * Azure OpenAI embedding provider
 */
export class AzureProvider implements EmbeddingProvider {
  readonly name = "azure";
  readonly dimension: number;

  private client: AzureOpenAI;
  private deployment: string;
  private batchSize: number;

  constructor(config: AzureEmbeddingConfig) {
    this.dimension = config.dimension;
    this.deployment = config.deployment;
    this.batchSize = config.batchSize;

    this.client = new AzureOpenAI({
      apiKey: config.apiKey,
      endpoint: config.endpoint,
      apiVersion: config.apiVersion,
    });
  }

  async initialize(): Promise<void> {
    // Azure client doesn't need explicit initialization
  }

  async embed(text: string): Promise<number[]> {
    const truncated = truncateToTokenLimit(text, MAX_TOKENS);

    const response = await this.client.embeddings.create({
      model: this.deployment,
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
        model: this.deployment,
        input: truncatedBatch,
      });

      for (const item of response.data) {
        results.push(item.embedding);
      }
    }

    return results;
  }

  async dispose(): Promise<void> {
    // Nothing to cleanup
  }
}
