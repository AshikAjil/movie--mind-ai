import { useState, useEffect, useCallback, useMemo } from 'react';
import { Film, Star, Filter, ChevronDown, Clapperboard, AlertCircle, Heart, Sparkles } from 'lucide-react';
import MovieCard from '../components/MovieCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import ChatBox from '../components/ChatBox.jsx';
import { getFeaturedMovies, searchMovies, getUserFeed, toggleLikeMovie, toggleDislikeMovie } from '../services/api.js';

const LANGUAGES = ['All', 'English', 'Malayalam', 'Tamil'];
const GENRES = [
  'All', 'Action', 'Drama', 'Thriller', 'Romance', 'Comedy',
  'Horror', 'Sci-Fi', 'Mystery', 'Biography', 'Animation',
  'Crime', 'Fantasy', 'Adventure', 'Historical', 'Musical',
];

const VISIBLE_STEP = 20;

// Tabs
const TABS = [
  { id: 'featured', label: 'Featured', icon: Star },
  { id: 'feed',     label: 'My Feed',  icon: Heart },
];

export default function Home({ preferences }) {
  const [featuredMovies, setFeaturedMovies] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [currentQuery, setCurrentQuery] = useState('');
  const [langFilter, setLangFilter] = useState('All');
  const [genreFilter, setGenreFilter] = useState('All');
  const [visibleCount, setVisibleCount] = useState(VISIBLE_STEP);
  const [activeTab, setActiveTab] = useState('featured');
  const [feedToast, setFeedToast] = useState('');
  const [serverFeed, setServerFeed] = useState({ liked: [], disliked: [] });

  const loadFeed = async () => {
    try {
      const feedData = await getUserFeed();
      setServerFeed({ liked: feedData.liked || [], disliked: feedData.disliked || [] });
    } catch(err) {
      console.error("Failed to fetch feed:", err);
    }
  };

  // Load featured movies & feed on mount
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [data] = await Promise.all([getFeaturedMovies(), loadFeed()]);
        setFeaturedMovies(data.movies || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Semantic search
  const handleSearch = useCallback(async (query) => {
    if (!query) {
      setSearchResults(null);
      setCurrentQuery('');
      setSearchError('');
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    setCurrentQuery(query);

    // Build feed signals from liked/disliked movies
    const feedSignals = {
      likedGenres: [],
      likedLanguages: [],
      dislikedGenres: [],
    };
    if (serverFeed) {
      const genreCount = {};
      const langCount = {};
      const dislikedGenres = new Set();
      for (const m of serverFeed.liked || []) {
        for (const g of m.genres || []) genreCount[g] = (genreCount[g] || 0) + 1;
        if (m.language) langCount[m.language] = (langCount[m.language] || 0) + 1;
      }
      for (const m of serverFeed.disliked || []) {
        for (const g of m.genres || []) dislikedGenres.add(g);
      }
      feedSignals.likedGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g);
      feedSignals.likedLanguages = Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([l]) => l);
      feedSignals.dislikedGenres = [...dislikedGenres];
    }

    try {
      const data = await searchMovies(query, preferences, feedSignals);
      setSearchResults(data.results || []);
    } catch (err) {
      setSearchError(err.message);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, [preferences, serverFeed]);

  // Handle like with toast
  const handleLike = useCallback(async (movie) => {
    try {
      await toggleLikeMovie(movie._id);
      await loadFeed();
      const isNowLiked = !serverFeed.liked.some((m) => m._id === movie._id);
      showFeedToast(isNowLiked ? '❤️ Saved to your feed!' : '💔 Removed from liked');
    } catch(err) {
      console.error(err);
    }
  }, [serverFeed]);

  // Handle dislike with toast
  const handleDislike = useCallback(async (movie) => {
    try {
      await toggleDislikeMovie(movie._id);
      await loadFeed();
      const isNowDisliked = !serverFeed.disliked.some((m) => m._id === movie._id);
      showFeedToast(isNowDisliked ? '👎 Noted! We\'ll adjust your recommendations' : 'Removed from disliked');
    } catch(err) {
      console.error(err);
    }
  }, [serverFeed]);

  const showFeedToast = (msg) => {
    setFeedToast(msg);
    setTimeout(() => setFeedToast(''), 2500);
  };

  // Filter featured movies
  const filteredFeatured = useMemo(() => {
    return featuredMovies.filter((m) => {
      const langOk = langFilter === 'All' || m.language === langFilter;
      const genreOk = genreFilter === 'All' || m.genres?.includes(genreFilter);
      return langOk && genreOk;
    });
  }, [featuredMovies, langFilter, genreFilter]);

  const moviesToShow = searchResults !== null ? searchResults : filteredFeatured;
  const visibleMovies = moviesToShow.slice(0, visibleCount);
  const hasMore = visibleCount < moviesToShow.length;
  const isSearchMode = searchResults !== null;

  // My Feed tab — all liked movies
  const likedMovieIds = useMemo(() => new Set((serverFeed.liked || []).map((m) => m._id)), [serverFeed.liked]);
  const dislikedMovieIds = useMemo(() => new Set((serverFeed.disliked || []).map((m) => m._id)), [serverFeed.disliked]);

  // The serverFeed already returns populated full movie objects with correct _ids and posters.
  const allLikedMovies = serverFeed.liked || [];

  return (
    <div>
      {/* Hero + Search */}
      <section className="hero">
        <div style={{ position: 'relative' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(124, 58, 237, 0.15)',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              borderRadius: '20px',
              padding: '0.35rem 1rem',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: '#a78bfa',
              marginBottom: '1.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            <Clapperboard size={14} />
            AI-Powered Movie Discovery
          </div>
        </div>

        <h1 className="hero-title">
          Find Your Next<br />
          <span className="gradient-text">Favorite Movie</span>
        </h1>
        <p className="hero-subtitle">
          Describe what you want to watch in plain language — our AI fetches your taste.
        </p>

        <SearchBar onSearch={handleSearch} loading={searchLoading} />

        {preferences?.genres?.length > 0 && (
          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            🎯 Personalized for: {preferences.genres.slice(0, 3).join(', ')}
            {likedMovieIds.size > 0 && (
              <span style={{ marginLeft: '0.75rem' }}>· ❤️ {likedMovieIds.size} liked</span>
            )}
          </p>
        )}
      </section>

      {/* Main Content */}
      <div className="container" style={{ paddingBottom: '4rem' }}>

        {/* Search Error */}
        {searchError && (
          <div
            className="glass-card"
            style={{ padding: '1.5rem', marginBottom: '2rem', borderColor: 'rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
          >
            <AlertCircle size={20} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: '0.1rem' }} />
            <div>
              <p style={{ fontWeight: '600', color: 'var(--danger)', marginBottom: '0.25rem' }}>Search Error</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{searchError}</p>
              {searchError.includes('OPENROUTER') && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  💡 Make sure your OPENROUTER_API_KEY is set in <code>server/.env</code>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Search Results Section */}
        {isSearchMode && (
          <div style={{ marginBottom: '3rem' }}>
            <div className="section-header">
              <div className="section-title">
                {searchLoading ? 'Searching...' : `Results for "${currentQuery}"`}
              </div>
              {!searchLoading && searchResults !== null && (
                <span className="section-count">{searchResults.length} found</span>
              )}
              {feedToast && <span className="feed-status-pill"><Sparkles size={12} /> Taste profile active</span>}
              <button
                className="btn-ghost"
                onClick={() => { setSearchResults(null); setCurrentQuery(''); }}
                style={{ marginLeft: 'auto', fontSize: '0.8rem' }}
              >
                ← Back to Featured
              </button>
            </div>

            {searchLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '1rem' }}>
                <div className="spinner" style={{ width: '50px', height: '50px' }} />
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Loading movies...</p>
              </div>
            ) : searchResults?.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>No matches found</h3>
                <p>Try different keywords or a broader description</p>
              </div>
            ) : (
              <div className="movies-grid">
                {visibleMovies.map((movie, i) => (
                  <div
                    key={movie._id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${Math.min(i * 40, 400)}ms`, animationFillMode: 'both' }}
                  >
                    <MovieCard
                      movie={movie}
                      preferences={preferences}
                      feed={serverFeed}
                      isLiked={likedMovieIds.has(movie._id)}
                      isDisliked={dislikedMovieIds.has(movie._id)}
                      onLike={handleLike}
                      onDislike={handleDislike}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab + Featured / My Feed */}
        {!isSearchMode && (
          <div>
            {/* Tab switcher */}
            <div className="feed-tabs" style={{ marginBottom: '1.5rem' }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  id={`tab-${id}`}
                  className={`feed-tab-btn ${activeTab === id ? 'active' : ''}`}
                  onClick={() => { setActiveTab(id); setVisibleCount(VISIBLE_STEP); }}
                >
                  <Icon size={15} />
                  {label}
                  {id === 'feed' && likedMovieIds.size > 0 && (
                    <span className="tab-badge">{likedMovieIds.size}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── Featured Tab ── */}
            {activeTab === 'featured' && (
              <div>
                {/* Filters */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Language</span>
                  </div>
                  <div className="filter-bar">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        id={`filter-lang-${lang}`}
                        className={`filter-chip ${langFilter === lang ? 'active' : ''}`}
                        onClick={() => { setLangFilter(lang); setVisibleCount(VISIBLE_STEP); }}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.75rem 0' }}>
                    <Filter size={14} style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Genre</span>
                  </div>
                  <div className="filter-bar">
                    {GENRES.map((genre) => (
                      <button
                        key={genre}
                        id={`filter-genre-${genre}`}
                        className={`filter-chip ${genreFilter === genre ? 'active' : ''}`}
                        onClick={() => { setGenreFilter(genre); setVisibleCount(VISIBLE_STEP); }}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section header */}
                <div className="section-header">
                  <Star size={20} style={{ color: '#f59e0b' }} />
                  <h2 className="section-title">
                    {langFilter === 'All' && genreFilter === 'All'
                      ? 'Featured Movies'
                      : `${langFilter !== 'All' ? langFilter + ' ' : ''}${genreFilter !== 'All' ? genreFilter + ' ' : ''}Movies`}
                  </h2>
                  <span className="section-count">{filteredFeatured.length}</span>
                </div>

                {/* Movie Grid */}
                {loading ? (
                  <div className="movies-grid">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="movie-card">
                        <div className="skeleton" style={{ aspectRatio: '2/3', width: '100%' }} />
                        <div className="movie-info">
                          <div className="skeleton" style={{ height: '1rem', marginBottom: '0.5rem', borderRadius: '4px' }} />
                          <div className="skeleton" style={{ height: '0.75rem', width: '60%', borderRadius: '4px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : error ? (
                  <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                    <AlertCircle size={40} style={{ color: 'var(--danger)', margin: '0 auto 1rem' }} />
                    <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Failed to load movies</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{error}</p>
                    {error.includes('connect') && (
                      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Troubleshooting:</p>
                        <p>1. Start the backend: <code>cd server && npm run dev</code></p>
                        <p>2. Seed the database: POST <code>/api/movies/seed</code></p>
                        <p>3. Check your <code>MONGO_URI</code> in <code>server/.env</code></p>
                      </div>
                    )}
                  </div>
                ) : filteredFeatured.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🎬</div>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>No movies found</h3>
                    <p>Try a different filter combination</p>
                  </div>
                ) : (
                  <>
                    <div className="movies-grid">
                      {visibleMovies.map((movie, i) => (
                        <div
                          key={movie._id}
                          className="animate-fade-in"
                          style={{ animationDelay: `${Math.min(i * 30, 300)}ms`, animationFillMode: 'both' }}
                        >
                          <MovieCard
                            movie={movie}
                            preferences={preferences}
                            feed={serverFeed}
                            isLiked={likedMovieIds.has(movie._id)}
                            isDisliked={dislikedMovieIds.has(movie._id)}
                            onLike={handleLike}
                            onDislike={handleDislike}
                          />
                        </div>
                      ))}
                    </div>

                    {hasMore && (
                      <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                        <button
                          id="load-more-btn"
                          className="btn-secondary"
                          onClick={() => setVisibleCount((c) => c + VISIBLE_STEP)}
                        >
                          <ChevronDown size={16} />
                          Show More ({moviesToShow.length - visibleCount} remaining)
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── My Feed Tab ── */}
            {activeTab === 'feed' && (
              <div>
                <div className="section-header">
                  <Heart size={20} style={{ color: '#ec4899' }} />
                  <h2 className="section-title">My Liked Movies</h2>
                  <span className="section-count">{allLikedMovies.length}</span>
                </div>

                {allLikedMovies.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">💝</div>
                    <h3 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, marginBottom: '0.5rem' }}>No liked movies yet</h3>
                    <p>Hit the <strong>👍 Like</strong> button on any movie card to save it here and train your AI recommendations!</p>
                    <button
                      className="btn-primary"
                      style={{ marginTop: '1.5rem' }}
                      onClick={() => setActiveTab('featured')}
                    >
                      Browse Movies
                    </button>
                  </div>
                ) : (
                  <div className="movies-grid">
                    {allLikedMovies.map((movie, i) => (
                      <div
                        key={movie._id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${Math.min(i * 40, 400)}ms`, animationFillMode: 'both' }}
                      >
                        <MovieCard
                          movie={movie}
                          preferences={preferences}
                          feed={serverFeed}
                          isLiked={true}
                          isDisliked={false}
                          onLike={handleLike}
                          onDislike={handleDislike}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feed interaction toast */}
      {feedToast && (
        <div className="toast feed-toast">
          {feedToast}
        </div>
      )}
      <ChatBox />
    </div>
  );
}
