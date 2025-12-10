/**
 * Supported programming languages
 */
export type Language =
  | "java"
  | "typescript"
  | "javascript"
  | "python"
  | "sql"
  | "yaml"
  | "json"
  | "config"
  | "unknown";

/**
 * Symbol types that can be extracted from code
 */
export type SymbolType =
  | "file"
  | "class"
  | "interface"
  | "enum"
  | "function"
  | "method"
  | "block";

/**
 * Repository information
 */
export interface Repository {
  /** Repository name (folder name) */
  name: string;
  /** Absolute path to repo folder */
  path: string;
  /** Current git branch */
  branch: string;
  /** Current commit hash */
  commit: string;
  /** Microservice name from config override */
  microservice?: string;
  /** Tags from config override */
  tags?: string[];
}

/**
 * File information for processing
 */
export interface FileInfo {
  /** Absolute path to the file */
  absolutePath: string;
  /** Path relative to repo root */
  relativePath: string;
  /** Detected language */
  language: Language;
  /** File extension */
  extension: string;
}

/**
 * Parsed symbol from code
 */
export interface ParsedSymbol {
  /** Symbol type */
  type: SymbolType;
  /** Symbol name (e.g., class name, method name) */
  name?: string;
  /** Full signature if applicable */
  signature?: string;
  /** Start line number (1-indexed) */
  startLine: number;
  /** End line number (1-indexed) */
  endLine: number;
  /** Full text content of the symbol */
  text: string;
  /** Doc comment if present */
  docComment?: string;
  /** Parent symbol name (e.g., class name for methods) */
  parent?: string;
  /** Package/module name */
  package?: string;
  /** Imported modules/symbols */
  imports?: string[];
  /** Called functions/methods */
  calls?: string[];
}

/**
 * Search request parameters
 */
export interface SearchRequest {
  /** Natural language or code-like query */
  query: string;
  /** Number of results to return */
  top_k?: number;
  /** Optional filters */
  filters?: {
    repo?: string;
    language?: string;
    microservice?: string;
    symbol_type?: SymbolType;
  };
}

/**
 * Single search result
 */
export interface SearchResult {
  id: string;
  score: number;
  repo: string;
  path: string;
  language: string;
  microservice?: string;
  symbol_type: SymbolType;
  symbol_name?: string;
  signature?: string;
  start_line: number;
  end_line: number;
  text: string;
}

/**
 * Search response
 */
export interface SearchResponse {
  results: SearchResult[];
  total: number;
  took_ms: number;
}

/**
 * Repository statistics
 */
export interface RepositoryStats {
  repo: string;
  total_chunks: number;
  by_language: Record<string, number>;
  by_symbol_type: Record<string, number>;
  last_indexed_commit?: string;
}
