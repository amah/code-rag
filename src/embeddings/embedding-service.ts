import type { EmbeddingConfig } from "../config/schema.js";
import {
  type EmbeddingProvider,
  OpenAIProvider,
  AzureProvider,
  LocalProvider,
} from "./providers/index.js";

/**
 * Embedding service factory and wrapper
 * Provides a unified interface for all embedding providers
 */
export class EmbeddingService {
  private provider: EmbeddingProvider;
  private initialized = false;

  private constructor(provider: EmbeddingProvider) {
    this.provider = provider;
  }

  /**
   * Creates an embedding service with the configured provider
   */
  static async create(config: EmbeddingConfig): Promise<EmbeddingService> {
    let provider: EmbeddingProvider;

    switch (config.provider) {
      case "openai":
        if (!config.openai) {
          throw new Error("OpenAI configuration is required when provider is 'openai'");
        }
        provider = new OpenAIProvider(config.openai);
        break;

      case "azure":
        if (!config.azure) {
          throw new Error("Azure configuration is required when provider is 'azure'");
        }
        provider = new AzureProvider(config.azure);
        break;

      case "local":
        if (!config.local) {
          throw new Error("Local configuration is required when provider is 'local'");
        }
        provider = new LocalProvider(config.local);
        break;

      default:
        throw new Error(`Unknown embedding provider: ${config.provider}`);
    }

    const service = new EmbeddingService(provider);
    await service.initialize();
    return service;
  }

  /**
   * Initialize the provider
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    await this.provider.initialize();
    this.initialized = true;
  }

  /**
   * Gets the provider name
   */
  get providerName(): string {
    return this.provider.name;
  }

  /**
   * Gets the embedding dimension
   */
  get dimension(): number {
    return this.provider.dimension;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(text: string): Promise<number[]> {
    if (!this.initialized) {
      throw new Error("Embedding service not initialized");
    }
    return this.provider.embed(text);
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.initialized) {
      throw new Error("Embedding service not initialized");
    }
    return this.provider.embedBatch(texts);
  }

  /**
   * Generate embeddings with progress callback
   */
  async embedBatchWithProgress(
    texts: string[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<number[][]> {
    if (!this.initialized) {
      throw new Error("Embedding service not initialized");
    }

    const results: number[][] = [];
    const batchSize = 50; // Process 50 at a time for progress updates

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const embeddings = await this.provider.embedBatch(batch);
      results.push(...embeddings);

      if (onProgress) {
        onProgress(Math.min(i + batchSize, texts.length), texts.length);
      }
    }

    return results;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    await this.provider.dispose();
    this.initialized = false;
  }
}

// Singleton instance
let serviceInstance: EmbeddingService | null = null;

/**
 * Gets or creates the embedding service instance
 */
export async function getEmbeddingService(
  config: EmbeddingConfig
): Promise<EmbeddingService> {
  if (!serviceInstance) {
    serviceInstance = await EmbeddingService.create(config);
  }
  return serviceInstance;
}

/**
 * Resets the embedding service instance
 */
export async function resetEmbeddingService(): Promise<void> {
  if (serviceInstance) {
    await serviceInstance.dispose();
    serviceInstance = null;
  }
}
