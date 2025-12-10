import type { SearchResult } from '../types';

interface CodeBlockProps {
  result: SearchResult;
}

export function CodeBlock({ result }: CodeBlockProps) {
  const scorePercentage = Math.round(result.score * 100);
  const scoreColor = result.score >= 0.8 ? '#22c55e' : result.score >= 0.6 ? '#eab308' : '#ef4444';

  return (
    <div className="code-block">
      <div className="code-header">
        <div className="code-meta">
          <span className="code-repo">{result.repo}</span>
          <span className="code-path">{result.path}</span>
          <span className="code-lines">L{result.start_line}-{result.end_line}</span>
        </div>
        <div className="code-badges">
          <span className="badge badge-language">{result.language}</span>
          <span className="badge badge-type">{result.symbol_type}</span>
          <span
            className="badge badge-score"
            style={{ backgroundColor: scoreColor }}
          >
            {scorePercentage}%
          </span>
        </div>
      </div>

      <div className="code-info">
        <span className="symbol-name">{result.symbol_name}</span>
        {result.signature && (
          <code className="signature">{result.signature}</code>
        )}
      </div>

      {result.docstring && (
        <div className="docstring">{result.docstring}</div>
      )}

      <pre className="code-content">
        <code>{result.text}</code>
      </pre>

      {(result.branch || result.commit) && (
        <div className="code-footer">
          {result.branch && (
            <span className="branch">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"></path>
              </svg>
              {result.branch}
            </span>
          )}
          {result.commit && (
            <span className="commit" title={result.commit}>
              {result.commit.substring(0, 7)}
            </span>
          )}
          {result.parent_symbols && result.parent_symbols.length > 0 && (
            <span className="parents">
              in: {result.parent_symbols.join(' → ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
