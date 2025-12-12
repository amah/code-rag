import { useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { SearchResults } from './components/SearchResults';
import { RagChat } from './components/RagChat';
import { useSearch } from './hooks/useSearch';

type Tab = 'search' | 'ask';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const { results, loading, error, search } = useSearch();

  return (
    <div className="app">
      <header className="header">
        <h1>Code RAG</h1>
        <p>Semantic search for your source code</p>
      </header>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          onClick={() => setActiveTab('search')}
        >
          Search
        </button>
        <button
          className={`tab ${activeTab === 'ask' ? 'active' : ''}`}
          onClick={() => setActiveTab('ask')}
        >
          Ask AI
        </button>
      </div>

      <main className="main">
        {activeTab === 'search' ? (
          <>
            <SearchBar onSearch={search} loading={loading} />
            <SearchResults results={results} loading={loading} error={error} />
          </>
        ) : (
          <RagChat />
        )}
      </main>

      <footer className="footer">
        <p>Powered by OpenSearch k-NN vector search + AI</p>
      </footer>
    </div>
  );
}
