import { useState, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';

export default function SearchBar({ onSearch, loading = false, initialValue = '' }) {
  const [query, setQuery] = useState(initialValue);
  const inputRef = useRef(null);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      const trimmed = query.trim();
      if (trimmed && !loading) {
        onSearch(trimmed);
      }
    },
    [query, loading, onSearch]
  );

  const handleClear = () => {
    setQuery('');
    onSearch('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <div className="search-container">
      {/* Icon */}
      <div className="search-icon" style={{ zIndex: 1 }}>
        {loading ? (
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--accent-1)' }} />
        ) : (
          <Search size={20} />
        )}
      </div>

      {/* Input */}
      <input
        ref={inputRef}
        id="search-input"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search by genre, mood, or description..."
        className="search-input"
        disabled={loading}
        autoComplete="off"
        aria-label="Search movies"
      />

      {/* Clear button */}
      {query && (
        <button
          className="btn-ghost search-btn"
          onClick={handleClear}
          style={{ marginRight: '0.4rem', padding: '0.4rem' }}
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}

      {/* Search button */}
      <button
        id="search-submit-btn"
        className="btn-primary search-btn"
        onClick={handleSubmit}
        disabled={loading || !query.trim()}
      >
        {loading ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
}
