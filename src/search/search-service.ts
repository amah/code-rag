import type { OpenSearchClient } from "../indexer/opensearch-client.js";
import type { EmbeddingService } from "../embeddings/embedding-service.js";
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
  RepositoryStats,
  SymbolType,
} from "../models/types.js";

/**
 * Search service for querying indexed code chunks
 */
export class SearchService {
  private client: OpenSearchClient;
  private embeddingService: EmbeddingService;

  constructor(client: OpenSearchClient, embeddingService: EmbeddingService) {
    this.client = client;
    this.embeddingService = embeddingService;
  }

  /**
   * Search for code chunks using semantic search
   */
  async search(request: SearchRequest): Promise<SearchResponse> {
    const startTime = Date.now();

    // Generate query embedding
    const queryVector = await this.embeddingService.embed(request.query);

    // Build filters
    const filters: Record<string, unknown>[] = [];

    if (request.filters) {
      if (request.filters.repo) {
        filters.push({ term: { repo: request.filters.repo } });
      }
      if (request.filters.language) {
        filters.push({ term: { language: request.filters.language } });
      }
      if (request.filters.microservice) {
        filters.push({ term: { microservice: request.filters.microservice } });
      }
      if (request.filters.symbol_type) {
        filters.push({ term: { symbol_type: request.filters.symbol_type } });
      }
    }

    // Execute k-NN search
    const k = request.top_k ?? 20;
    const searchResult = await this.client.knnSearch({
      queryVector,
      k,
      filters: filters.length > 0 ? filters : undefined,
    });

    // Map results
    const results: SearchResult[] = searchResult.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      repo: hit._source.repo as string,
      path: hit._source.path as string,
      language: hit._source.language as string,
      microservice: hit._source.microservice as string | undefined,
      symbol_type: hit._source.symbol_type as SymbolType,
      symbol_name: hit._source.symbol_name as string | undefined,
      signature: hit._source.signature as string | undefined,
      start_line: hit._source.start_line as number,
      end_line: hit._source.end_line as number,
      text: hit._source.text as string,
    }));

    return {
      results,
      total: searchResult.total,
      took_ms: Date.now() - startTime,
    };
  }

  /**
   * List all indexed repositories
   */
  async listRepositories(): Promise<string[]> {
    return this.client.listRepositories();
  }

  /**
   * Get statistics for a repository
   */
  async getRepositoryStats(repo: string): Promise<RepositoryStats> {
    const stats = await this.client.getRepoStats(repo);

    return {
      repo,
      total_chunks: stats.total,
      by_language: stats.byLanguage,
      by_symbol_type: stats.bySymbolType,
    };
  }

  /**
   * Get all chunks for a specific file
   */
  async getFileChunks(
    repo: string,
    path: string
  ): Promise<SearchResult[]> {
    const chunks = await this.client.getFileChunks(repo, path);

    return chunks.map((chunk) => ({
      id: chunk.id as string,
      score: 1.0, // No relevance score for direct fetch
      repo: chunk.repo as string,
      path: chunk.path as string,
      language: chunk.language as string,
      microservice: chunk.microservice as string | undefined,
      symbol_type: chunk.symbol_type as SymbolType,
      symbol_name: chunk.symbol_name as string | undefined,
      signature: chunk.signature as string | undefined,
      start_line: chunk.start_line as number,
      end_line: chunk.end_line as number,
      text: chunk.text as string,
    }));
  }
}
