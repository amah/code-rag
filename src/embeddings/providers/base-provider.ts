/**
 * Base interface for embedding providers
 */
export interface EmbeddingProvider {
  /** Provider name */
  readonly name: string;

  /** Embedding dimension */
  readonly dimension: number;

  /**
   * Initialize the provider (load models, establish connections, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Generate embedding for a single text
   */
  embed(text: string): Promise<number[]>;

  /**
   * Generate embeddings for a batch of texts
   */
  embedBatch(texts: string[]): Promise<number[][]>;

  /**
   * Cleanup resources
   */
  dispose(): Promise<void>;
}

/**
 * Truncates text to approximately fit within a token limit
 * Rough estimation: 1 token ≈ 4 characters
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars);
}
