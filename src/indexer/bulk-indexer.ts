import type { CodeChunk, CodeChunkWithoutEmbedding } from "../models/code-chunk.js";
import type { OpenSearchClient } from "./opensearch-client.js";
import type { EmbeddingService } from "../embeddings/embedding-service.js";

export interface IndexingResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

export interface IndexingProgress {
  phase: "embedding" | "indexing";
  completed: number;
  total: number;
}

/**
 * Bulk indexer for code chunks
 * Handles embedding generation and OpenSearch indexing
 */
export class BulkIndexer {
  private client: OpenSearchClient;
  private embeddingService: EmbeddingService;
  private batchSize: number;

  constructor(
    client: OpenSearchClient,
    embeddingService: EmbeddingService,
    batchSize = 100
  ) {
    this.client = client;
    this.embeddingService = embeddingService;
    this.batchSize = batchSize;
  }

  /**
   * Indexes a batch of code chunks
   */
  async indexChunks(
    chunks: CodeChunkWithoutEmbedding[],
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<IndexingResult> {
    if (chunks.length === 0) {
      return { total: 0, successful: 0, failed: 0, errors: [] };
    }

    // Phase 1: Generate embeddings
    console.log(`Generating embeddings for ${chunks.length} chunks...`);

    const texts = chunks.map((c) => c.text);
    const embeddings = await this.embeddingService.embedBatchWithProgress(
      texts,
      (completed, total) => {
        if (onProgress) {
          onProgress({ phase: "embedding", completed, total });
        }
      }
    );

    // Combine chunks with embeddings
    const chunksWithEmbeddings: CodeChunk[] = chunks.map((chunk, i) => ({
      ...chunk,
      embedding: embeddings[i],
    }));

    // Phase 2: Index into OpenSearch
    console.log(`Indexing ${chunks.length} chunks into OpenSearch...`);

    let totalSuccessful = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < chunksWithEmbeddings.length; i += this.batchSize) {
      const batch = chunksWithEmbeddings.slice(i, i + this.batchSize);

      const result = await this.client.bulkIndex(batch as any);
      totalSuccessful += result.successful;
      totalFailed += result.failed;
      allErrors.push(...result.errors);

      if (onProgress) {
        onProgress({
          phase: "indexing",
          completed: Math.min(i + this.batchSize, chunksWithEmbeddings.length),
          total: chunksWithEmbeddings.length,
        });
      }
    }

    return {
      total: chunks.length,
      successful: totalSuccessful,
      failed: totalFailed,
      errors: allErrors,
    };
  }

  /**
   * Re-indexes chunks for a specific repository
   * Deletes existing chunks first
   */
  async reindexRepository(
    repoName: string,
    chunks: CodeChunkWithoutEmbedding[],
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<IndexingResult> {
    // Delete existing chunks for this repo
    console.log(`Deleting existing chunks for ${repoName}...`);
    const deleted = await this.client.deleteRepoChunks(repoName);
    console.log(`Deleted ${deleted} existing chunks`);

    // Index new chunks
    return this.indexChunks(chunks, onProgress);
  }

  /**
   * Indexes chunks incrementally (upsert)
   * Useful for updating specific files
   */
  async upsertChunks(
    chunks: CodeChunkWithoutEmbedding[],
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<IndexingResult> {
    // OpenSearch bulk API with doc IDs handles upserts automatically
    return this.indexChunks(chunks, onProgress);
  }
}
