export interface CodeChunk {
  id: string;
  repo: string;
  branch: string;
  commit: string;
  path: string;
  language: string;
  symbol_type: string;
  symbol_name: string;
  signature?: string;
  docstring?: string;
  source: string;
  start_line: number;
  end_line: number;
  parent_symbols: string[];
  imports: string[];
  indexed_at: string;
}

export interface SearchResult {
  id: string;
  score: number;
  repo: string;
  branch?: string;
  commit?: string;
  path: string;
  language: string;
  symbol_type: string;
  symbol_name: string;
  signature?: string;
  docstring?: string;
  text: string;
  start_line: number;
  end_line: number;
  parent_symbols?: string[];
  imports?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  took: number;
}

export interface SearchFilters {
  repo?: string;
  language?: string;
  symbol_type?: string;
  path?: string;
}

export interface SearchParams {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  min_score?: number;
}
