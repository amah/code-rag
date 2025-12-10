import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { useSearch } from './hooks/useSearch';

export function App() {
  const { results, loading, error, search } = useSearch();

  return (
    <div className="app">
      <header className="header">
        <h1>Code RAG</h1>
        <p>Semantic search for your source code</p>
      </header>

      <main className="main">
        <SearchBar onSearch={search} loading={loading} />
        <SearchResults results={results} loading={loading} error={error} />
      </main>

      <footer className="footer">
        <p>Powered by OpenSearch k-NN vector search</p>
      </footer>
    </div>
  );
}
