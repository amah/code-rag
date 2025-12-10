import type { SearchResponse } from '../types';
import { CodeBlock } from './CodeBlock';

interface SearchResultsProps {
  results: SearchResponse | null;
  loading: boolean;
  error: string | null;
}

export function SearchResults({ results, loading, error }: SearchResultsProps) {
  if (loading) {
    return (
      <div className="results-status">
        <div className="spinner"></div>
        <p>Searching...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="results-status error">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="results-status placeholder">
        <p>Enter a search query to find code snippets</p>
        <p className="hint">Try searching for function names, concepts, or descriptions</p>
      </div>
    );
  }

  if (results.results.length === 0) {
    return (
      <div className="results-status">
        <p>No results found</p>
        <p className="hint">Try different keywords or remove some filters</p>
      </div>
    );
  }

  return (
    <div className="search-results">
      <div className="results-header">
        <span className="results-count">
          Found {results.total} result{results.total !== 1 ? 's' : ''} in {results.took}ms
        </span>
      </div>
      <div className="results-list">
        {results.results.map((result) => (
          <CodeBlock
            key={result.id}
            result={result}
          />
        ))}
      </div>
    </div>
  );
}
