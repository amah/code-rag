import type { SymbolType } from "./types.js";

/**
 * CodeChunk represents a semantically coherent piece of code
 * stored in OpenSearch for retrieval.
 */
export interface CodeChunk {
  /** Unique identifier (hash of repo+path+symbol+start_line) */
  id: string;

  /** Repository name */
  repo: string;

  /** Branch name */
  branch: string;

  /** Commit hash */
  commit: string;

  /** File path relative to repo root */
  path: string;

  /** Language identifier */
  language: string;

  /** Microservice/module name if applicable */
  microservice?: string;

  /** Symbol type */
  symbol_type: SymbolType;

  /** Symbol name (class name, method name, etc.) */
  symbol_name?: string;

  /** Textual signature if applicable */
  signature?: string;

  /** Starting line number (1-indexed) */
  start_line: number;

  /** Ending line number (1-indexed) */
  end_line: number;

  /** Code chunk content (code + comments + context) */
  text: string;

  /** Vector embedding */
  embedding?: number[];

  // Optional metadata

  /** Package/module name */
  package?: string;

  /** List of imported modules/symbols */
  imports?: string[];

  /** List of called functions/methods */
  calls?: string[];

  /** DDD aggregate or domain concept */
  aggregate?: string;

  /** Free-form tags */
  tags?: string[];
}

/**
 * CodeChunk without embedding (before embedding generation)
 */
export type CodeChunkWithoutEmbedding = Omit<CodeChunk, "embedding">;

/**
 * Creates a deterministic ID for a code chunk
 */
export function createChunkId(
  repo: string,
  path: string,
  symbolName: string | undefined,
  startLine: number,
  commit: string
): string {
  const input = `${repo}:${path}:${symbolName ?? ""}:${startLine}:${commit}`;
  return Bun.hash(input).toString(16);
}

/**
 * Creates a CodeChunk from parsed data
 */
export function createCodeChunk(params: {
  repo: string;
  branch: string;
  commit: string;
  path: string;
  language: string;
  microservice?: string;
  symbol_type: SymbolType;
  symbol_name?: string;
  signature?: string;
  start_line: number;
  end_line: number;
  text: string;
  package?: string;
  imports?: string[];
  calls?: string[];
  aggregate?: string;
  tags?: string[];
}): CodeChunkWithoutEmbedding {
  const id = createChunkId(
    params.repo,
    params.path,
    params.symbol_name,
    params.start_line,
    params.commit
  );

  return {
    id,
    ...params,
  };
}
