import { useState, useRef, useEffect } from 'react';
import { useRagChat } from '../hooks/useRagChat';

export function RagChat() {
  const { messages, loading, error, sendMessage, clearChat } = useRagChat();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="rag-chat">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-placeholder">
            <p>Ask questions about your code</p>
            <p className="hint">Examples:</p>
            <ul>
              <li>"How does the request handling work?"</li>
              <li>"What functions are available for sending responses?"</li>
              <li>"Explain the middleware pattern used"</li>
            </ul>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={`chat-message ${message.role}`}>
              <div className="message-header">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </div>
              <div className="message-content">
                {message.content || (loading && index === messages.length - 1 ? (
                  <span className="typing-indicator">Thinking...</span>
                ) : null)}
              </div>
              {message.sources && message.sources.length > 0 && (
                <div className="message-sources">
                  <div className="sources-header">Sources:</div>
                  <div className="sources-list">
                    {message.sources.map((source, i) => (
                      <div key={i} className="source-item">
                        <span className="source-repo">{source.repo}</span>
                        <span className="source-path">{source.path}</span>
                        <span className="source-lines">L{source.lines}</span>
                        {source.symbol && (
                          <span className="source-symbol">{source.symbol}</span>
                        )}
                        <span className="source-score">{Math.round(source.score * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          <p>{error}</p>
        </div>
      )}

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your code..."
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="chat-submit">
          {loading ? 'Sending...' : 'Send'}
        </button>
        {messages.length > 0 && (
          <button type="button" onClick={clearChat} className="chat-clear">
            Clear
          </button>
        )}
      </form>
    </div>
  );
}
