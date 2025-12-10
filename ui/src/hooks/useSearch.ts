import { useState, useCallback } from 'react';
import type { SearchResponse, SearchParams, SearchFilters } from '../types';

interface UseSearchResult {
  results: SearchResponse | null;
  loading: boolean;
  error: string | null;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  clear: () => void;
}

export function useSearch(): UseSearchResult {
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, filters?: SearchFilters) => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params: SearchParams = {
        query: query.trim(),
        limit: 20,
        min_score: 0.5,
      };

      if (filters) {
        params.filters = {};
        if (filters.repo) params.filters.repo = filters.repo;
        if (filters.language) params.filters.language = filters.language;
        if (filters.symbol_type) params.filters.symbol_type = filters.symbol_type;
        if (filters.path) params.filters.path = filters.path;
      }

      const response = await fetch('/api/search-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return { results, loading, error, search, clear };
}
