import type { AppConfig } from "../config/schema.js";
import { RepoScanner } from "../scanner/repo-scanner.js";
import { FileEnumerator } from "../scanner/file-enumerator.js";
import { Chunker } from "../parser/chunker.js";
import { OpenSearchClient } from "../indexer/opensearch-client.js";
import { EmbeddingService } from "../embeddings/embedding-service.js";
import { BulkIndexer, type IndexingProgress } from "../indexer/bulk-indexer.js";
import type { Repository, FileInfo } from "../models/types.js";
import type { CodeChunkWithoutEmbedding } from "../models/code-chunk.js";

export interface IngestionOptions {
  /** Specific repository to ingest (if not provided, all repos are ingested) */
  repo?: string;
  /** Dry run - don't actually index */
  dryRun?: boolean;
  /** Progress callback */
  onProgress?: (status: IngestionStatus) => void;
}

export interface IngestionStatus {
  phase: "scanning" | "parsing" | "embedding" | "indexing" | "done";
  repo?: string;
  file?: string;
  filesProcessed?: number;
  totalFiles?: number;
  chunksCreated?: number;
  chunksIndexed?: number;
}

export interface IngestionResult {
  repositories: number;
  files: number;
  chunks: number;
  indexed: number;
  failed: number;
  errors: string[];
}

/**
 * Orchestrates the full ingestion pipeline
 */
export class IngestionPipeline {
  private config: AppConfig;
  private repoScanner: RepoScanner;
  private fileEnumerator: FileEnumerator;
  private chunker: Chunker;
  private osClient: OpenSearchClient;
  private embeddingService: EmbeddingService | null = null;
  private bulkIndexer: BulkIndexer | null = null;

  constructor(config: AppConfig) {
    this.config = config;
    this.repoScanner = new RepoScanner(config.repositories);
    this.fileEnumerator = new FileEnumerator(config.files);
    this.chunker = new Chunker(config.chunking);
    this.osClient = new OpenSearchClient(config.opensearch);
  }

  /**
   * Initialize services
   */
  private async initialize(): Promise<void> {
    // Check OpenSearch connection
    const isConnected = await this.osClient.ping();
    if (!isConnected) {
      throw new Error("Failed to connect to OpenSearch");
    }

    // Check if index exists
    const indexExists = await this.osClient.indexExists();
    if (!indexExists) {
      throw new Error(
        `Index '${this.osClient.getIndexName()}' does not exist. Run 'bun run setup-index' first.`
      );
    }

    // Initialize embedding service
    this.embeddingService = await EmbeddingService.create(this.config.embedding);
    this.bulkIndexer = new BulkIndexer(this.osClient, this.embeddingService);
  }

  /**
   * Run the ingestion pipeline
   */
  async run(options: IngestionOptions = {}): Promise<IngestionResult> {
    const { repo: targetRepo, dryRun = false, onProgress } = options;

    await this.initialize();

    const result: IngestionResult = {
      repositories: 0,
      files: 0,
      chunks: 0,
      indexed: 0,
      failed: 0,
      errors: [],
    };

    // Discover repositories
    onProgress?.({ phase: "scanning" });
    console.log("\nScanning for repositories...");

    let repos: Repository[];

    if (targetRepo) {
      const repo = await this.repoScanner.getRepository(targetRepo);
      if (!repo) {
        throw new Error(`Repository '${targetRepo}' not found`);
      }
      repos = [repo];
    } else {
      repos = await this.repoScanner.discoverRepositories();
    }

    console.log(`Found ${repos.length} repositories`);
    result.repositories = repos.length;

    // Process each repository
    for (const repo of repos) {
      console.log(`\n--- Processing: ${repo.name} ---`);
      console.log(`  Branch: ${repo.branch}`);
      console.log(`  Commit: ${repo.commit.slice(0, 8)}`);

      try {
        const repoResult = await this.processRepository(repo, dryRun, onProgress);
        result.files += repoResult.files;
        result.chunks += repoResult.chunks;
        result.indexed += repoResult.indexed;
        result.failed += repoResult.failed;
        result.errors.push(...repoResult.errors);
      } catch (error) {
        const msg = `Failed to process ${repo.name}: ${error instanceof Error ? error.message : error}`;
        console.error(msg);
        result.errors.push(msg);
      }
    }

    onProgress?.({ phase: "done" });
    return result;
  }

  /**
   * Process a single repository
   */
  private async processRepository(
    repo: Repository,
    dryRun: boolean,
    onProgress?: (status: IngestionStatus) => void
  ): Promise<{
    files: number;
    chunks: number;
    indexed: number;
    failed: number;
    errors: string[];
  }> {
    // Enumerate files
    onProgress?.({ phase: "scanning", repo: repo.name });
    const files = await this.fileEnumerator.enumerateFiles(repo.path);
    console.log(`  Found ${files.length} files to process`);

    if (files.length === 0) {
      return { files: 0, chunks: 0, indexed: 0, failed: 0, errors: [] };
    }

    // Parse and chunk files
    onProgress?.({ phase: "parsing", repo: repo.name, totalFiles: files.length });
    const allChunks: CodeChunkWithoutEmbedding[] = [];
    let filesProcessed = 0;

    for (const file of files) {
      try {
        onProgress?.({
          phase: "parsing",
          repo: repo.name,
          file: file.relativePath,
          filesProcessed,
          totalFiles: files.length,
        });

        const chunks = await this.chunker.chunkFile(file, repo);
        allChunks.push(...chunks);
        filesProcessed++;
      } catch (error) {
        console.warn(
          `  Warning: Failed to chunk ${file.relativePath}: ${error instanceof Error ? error.message : error}`
        );
      }
    }

    console.log(`  Created ${allChunks.length} chunks from ${filesProcessed} files`);

    if (dryRun) {
      console.log("  [DRY RUN] Skipping indexing");
      return {
        files: filesProcessed,
        chunks: allChunks.length,
        indexed: 0,
        failed: 0,
        errors: [],
      };
    }

    // Index chunks
    onProgress?.({
      phase: "embedding",
      repo: repo.name,
      chunksCreated: allChunks.length,
    });

    const indexResult = await this.bulkIndexer!.reindexRepository(
      repo.name,
      allChunks,
      (progress: IndexingProgress) => {
        onProgress?.({
          phase: progress.phase,
          repo: repo.name,
          chunksCreated: allChunks.length,
          chunksIndexed: progress.completed,
        });
      }
    );

    console.log(
      `  Indexed: ${indexResult.successful}, Failed: ${indexResult.failed}`
    );

    return {
      files: filesProcessed,
      chunks: allChunks.length,
      indexed: indexResult.successful,
      failed: indexResult.failed,
      errors: indexResult.errors,
    };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.embeddingService) {
      await this.embeddingService.dispose();
    }
    await this.osClient.close();
  }
}
