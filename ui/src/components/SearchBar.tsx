import { useState, FormEvent } from 'react';
import type { SearchFilters } from '../types';

interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
  loading: boolean;
}

export function SearchBar({ onSearch, loading }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      const activeFilters: SearchFilters = {};
      if (filters.repo?.trim()) activeFilters.repo = filters.repo.trim();
      if (filters.language?.trim()) activeFilters.language = filters.language.trim();
      if (filters.symbol_type?.trim()) activeFilters.symbol_type = filters.symbol_type.trim();
      if (filters.path?.trim()) activeFilters.path = filters.path.trim();

      onSearch(query, Object.keys(activeFilters).length > 0 ? activeFilters : undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-bar">
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code... (e.g., 'function to parse JSON', 'authentication middleware')"
          className="search-input"
          disabled={loading}
        />
        <button type="submit" className="search-button" disabled={loading || !query.trim()}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <button
        type="button"
        className="filter-toggle"
        onClick={() => setShowFilters(!showFilters)}
      >
        {showFilters ? '▼ Hide Filters' : '▶ Show Filters'}
      </button>

      {showFilters && (
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="repo">Repository</label>
            <input
              id="repo"
              type="text"
              value={filters.repo || ''}
              onChange={(e) => setFilters({ ...filters, repo: e.target.value })}
              placeholder="e.g., my-project"
            />
          </div>
          <div className="filter-group">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              value={filters.language || ''}
              onChange={(e) => setFilters({ ...filters, language: e.target.value })}
            >
              <option value="">All Languages</option>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="sql">SQL</option>
              <option value="yaml">YAML</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="symbol_type">Symbol Type</label>
            <select
              id="symbol_type"
              value={filters.symbol_type || ''}
              onChange={(e) => setFilters({ ...filters, symbol_type: e.target.value })}
            >
              <option value="">All Types</option>
              <option value="function">Function</option>
              <option value="method">Method</option>
              <option value="class">Class</option>
              <option value="interface">Interface</option>
              <option value="enum">Enum</option>
              <option value="type">Type</option>
              <option value="query">Query</option>
              <option value="table">Table</option>
            </select>
          </div>
          <div className="filter-group">
            <label htmlFor="path">Path contains</label>
            <input
              id="path"
              type="text"
              value={filters.path || ''}
              onChange={(e) => setFilters({ ...filters, path: e.target.value })}
              placeholder="e.g., src/components"
            />
          </div>
        </div>
      )}
    </form>
  );
}
