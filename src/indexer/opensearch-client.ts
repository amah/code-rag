import { Client } from "@opensearch-project/opensearch";
import type { OpenSearchConfig } from "../config/schema.js";

/**
 * OpenSearch client wrapper with connection management
 */
export class OpenSearchClient {
  private client: Client;
  private indexName: string;

  constructor(config: OpenSearchConfig) {
    this.indexName = config.index;

    // Build client options
    const clientOptions: any = {
      node: config.url,
      ssl: {
        rejectUnauthorized: false, // Allow self-signed certs for dev
      },
    };

    // Only add auth if credentials are provided
    if (config.auth) {
      clientOptions.auth = {
        username: config.auth.username,
        password: config.auth.password,
      };
    }

    this.client = new Client(clientOptions);
  }

  /**
   * Gets the underlying OpenSearch client
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Gets the configured index name
   */
  getIndexName(): string {
    return this.indexName;
  }

  /**
   * Checks if OpenSearch is reachable
   */
  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  /**
   * Checks if the index exists
   */
  async indexExists(): Promise<boolean> {
    try {
      const response = await this.client.indices.exists({
        index: this.indexName,
      });
      return response.statusCode === 200;
    } catch {
      return false;
    }
  }

  /**
   * Creates the code_chunks index with k-NN enabled
   */
  async createIndex(embeddingDimension: number): Promise<void> {
    const indexBody = {
      settings: {
        index: {
          knn: true,
          "knn.algo_param.ef_search": 256,
          "knn.algo_param.ef_construction": 512,
          "knn.algo_param.m": 16,
        },
      },
      mappings: {
        properties: {
          id: { type: "keyword" },
          repo: { type: "keyword" },
          branch: { type: "keyword" },
          commit: { type: "keyword" },
          path: { type: "keyword" },
          language: { type: "keyword" },
          microservice: { type: "keyword" },
          symbol_type: { type: "keyword" },
          symbol_name: {
            type: "text",
            fields: {
              keyword: { type: "keyword" },
            },
          },
          signature: { type: "text" },
          start_line: { type: "integer" },
          end_line: { type: "integer" },
          text: { type: "text" },
          package: { type: "keyword" },
          imports: { type: "keyword" },
          calls: { type: "keyword" },
          aggregate: { type: "keyword" },
          tags: { type: "keyword" },
          embedding: {
            type: "knn_vector",
            dimension: embeddingDimension,
            method: {
              name: "hnsw",
              space_type: "cosinesimil",
              engine: "lucene",
            },
          },
        },
      },
    };

    await this.client.indices.create({
      index: this.indexName,
      body: indexBody as any,
    });
  }

  /**
   * Deletes the index if it exists
   */
  async deleteIndex(): Promise<void> {
    if (await this.indexExists()) {
      await this.client.indices.delete({
        index: this.indexName,
      });
    }
  }

  /**
   * Performs a k-NN search
   */
  async knnSearch(params: {
    queryVector: number[];
    k: number;
    filters?: Record<string, unknown>[];
  }): Promise<{
    hits: Array<{
      _id: string;
      _score: number;
      _source: Record<string, unknown>;
    }>;
    total: number;
    took: number;
  }> {
    const query: Record<string, unknown> = {
      knn: {
        embedding: {
          vector: params.queryVector,
          k: params.k,
        },
      },
    };

    // Add filters if provided
    if (params.filters && params.filters.length > 0) {
      query.knn = {
        embedding: {
          vector: params.queryVector,
          k: params.k,
          filter: {
            bool: {
              filter: params.filters,
            },
          },
        },
      };
    }

    const response = await this.client.search({
      index: this.indexName,
      body: {
        size: params.k,
        query,
        _source: {
          excludes: ["embedding"], // Don't return the embedding vector
        },
      },
    });

    const hits = response.body.hits?.hits || [];
    const total = response.body.hits?.total;

    return {
      hits: hits as any,
      total: typeof total === "number" ? total : (total?.value ?? 0),
      took: response.body.took ?? 0,
    };
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(
    documents: Array<{ id: string; [key: string]: unknown }>
  ): Promise<{ successful: number; failed: number; errors: string[] }> {
    const body: Record<string, any>[] = [];

    for (const doc of documents) {
      body.push({
        index: {
          _index: this.indexName,
          _id: doc.id,
        },
      });
      body.push(doc as Record<string, any>);
    }

    const response = await this.client.bulk({
      body,
      refresh: true,
    });

    const errors: string[] = [];
    let failed = 0;

    if (response.body.errors) {
      for (const item of response.body.items || []) {
        if (item.index?.error) {
          failed++;
          errors.push(
            `${item.index._id}: ${item.index.error.type} - ${item.index.error.reason}`
          );
        }
      }
    }

    return {
      successful: documents.length - failed,
      failed,
      errors,
    };
  }

  /**
   * Gets document count for a repository
   */
  async getRepoCount(repo: string): Promise<number> {
    const response = await this.client.count({
      index: this.indexName,
      body: {
        query: {
          term: { repo },
        },
      },
    });
    return response.body.count;
  }

  /**
   * Gets aggregated stats for a repository
   */
  async getRepoStats(repo: string): Promise<{
    total: number;
    byLanguage: Record<string, number>;
    bySymbolType: Record<string, number>;
  }> {
    const response = await this.client.search({
      index: this.indexName,
      body: {
        size: 0,
        query: {
          term: { repo },
        },
        aggs: {
          by_language: {
            terms: { field: "language", size: 50 },
          },
          by_symbol_type: {
            terms: { field: "symbol_type", size: 20 },
          },
        },
      },
    });

    const byLanguage: Record<string, number> = {};
    const bySymbolType: Record<string, number> = {};

    const aggs = response.body.aggregations as any;
    if (aggs?.by_language?.buckets) {
      for (const bucket of aggs.by_language.buckets) {
        byLanguage[bucket.key] = bucket.doc_count;
      }
    }

    if (aggs?.by_symbol_type?.buckets) {
      for (const bucket of aggs.by_symbol_type.buckets) {
        bySymbolType[bucket.key] = bucket.doc_count;
      }
    }

    const total = response.body.hits?.total;

    return {
      total: typeof total === "number" ? total : (total?.value ?? 0),
      byLanguage,
      bySymbolType,
    };
  }

  /**
   * Lists all unique repositories in the index
   */
  async listRepositories(): Promise<string[]> {
    const response = await this.client.search({
      index: this.indexName,
      body: {
        size: 0,
        aggs: {
          repos: {
            terms: { field: "repo", size: 1000 },
          },
        },
      },
    });

    const aggs = response.body.aggregations as any;
    return (aggs?.repos?.buckets || []).map((b: { key: string }) => b.key);
  }

  /**
   * Gets all chunks for a specific file
   */
  async getFileChunks(
    repo: string,
    path: string
  ): Promise<Array<Record<string, unknown>>> {
    const response = await this.client.search({
      index: this.indexName,
      body: {
        size: 1000,
        query: {
          bool: {
            filter: [{ term: { repo } }, { term: { path } }],
          },
        },
        sort: [{ start_line: "asc" }],
        _source: {
          excludes: ["embedding"],
        },
      },
    });

    const hits = response.body.hits?.hits || [];
    return hits.map((hit: any) => hit._source);
  }

  /**
   * Deletes all chunks for a repository
   */
  async deleteRepoChunks(repo: string): Promise<number> {
    const response = await this.client.deleteByQuery({
      index: this.indexName,
      body: {
        query: {
          term: { repo },
        },
      },
      refresh: true,
    });
    return (response.body as any).deleted ?? 0;
  }

  /**
   * Close the client connection
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}

// Singleton instance
let clientInstance: OpenSearchClient | null = null;

/**
 * Gets or creates the OpenSearch client instance
 */
export function getOpenSearchClient(config: OpenSearchConfig): OpenSearchClient {
  if (!clientInstance) {
    clientInstance = new OpenSearchClient(config);
  }
  return clientInstance;
}

/**
 * Resets the client instance (for testing)
 */
export function resetOpenSearchClient(): void {
  clientInstance = null;
}
