import type { LocalEmbeddingConfig } from "../../config/schema.js";
import { type EmbeddingProvider, truncateToTokenLimit } from "./base-provider.js";

// Dynamic import for transformers.js
let pipeline: any;
let env: any;

const MAX_TOKENS = 512; // Most local models have smaller context

/**
 * Local embedding provider using Transformers.js
 * Runs models in-process using ONNX/WASM
 */
export class LocalProvider implements EmbeddingProvider {
  readonly name = "local";
  readonly dimension: number;

  private model: string;
  private localModelPath?: string;
  private batchSize: number;
  private cacheDir: string;
  private extractor: any = null;

  constructor(config: LocalEmbeddingConfig) {
    this.dimension = config.dimension;
    this.model = config.model;
    this.localModelPath = config.localModelPath;
    this.batchSize = config.batchSize;
    this.cacheDir = config.cacheDir;
  }

  async initialize(): Promise<void> {
    // Dynamic import to avoid loading transformers.js when not needed
    const transformers = await import("@xenova/transformers");
    pipeline = transformers.pipeline;
    env = transformers.env;

    // Configure cache directory
    env.cacheDir = this.cacheDir;

    // Enable local models
    env.allowLocalModels = true;

    // Set local model path if specified
    if (this.localModelPath) {
      env.localModelPath = this.localModelPath;
      console.log(`Using local model path: ${this.localModelPath}`);
    }

    console.log(`Loading local embedding model: ${this.model}...`);

    // Load the feature extraction pipeline
    this.extractor = await pipeline("feature-extraction", this.model, {
      quantized: true, // Use quantized model for better performance
    });

    console.log(`Model ${this.model} loaded successfully`);
  }

  async embed(text: string): Promise<number[]> {
    if (!this.extractor) {
      throw new Error("Local provider not initialized. Call initialize() first.");
    }

    const truncated = truncateToTokenLimit(text, MAX_TOKENS);

    const output = await this.extractor(truncated, {
      pooling: "mean",
      normalize: true,
    });

    // Convert to regular array
    return Array.from(output.data as Float32Array);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.extractor) {
      throw new Error("Local provider not initialized. Call initialize() first.");
    }

    const results: number[][] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);

      // Process each text in the batch
      // Note: Transformers.js batching support varies by model
      for (const text of batch) {
        const truncated = truncateToTokenLimit(text, MAX_TOKENS);

        const output = await this.extractor(truncated, {
          pooling: "mean",
          normalize: true,
        });

        results.push(Array.from(output.data as Float32Array));
      }
    }

    return results;
  }

  async dispose(): Promise<void> {
    this.extractor = null;
  }
}
