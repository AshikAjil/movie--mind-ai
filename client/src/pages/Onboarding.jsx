import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clapperboard, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import MovieCard from '../components/MovieCard.jsx';
import { getFeaturedMovies, updatePreferences } from '../services/api.js';

const REQUIRED_SELECTIONS = 8;
const SHOW_COUNT = 30;

const GENRE_OPTIONS = [
  'Action', 'Drama', 'Thriller', 'Romance', 'Comedy',
  'Horror', 'Sci-Fi', 'Mystery', 'Biography', 'Animation',
  'Crime', 'Fantasy',
];

const LANGUAGE_OPTIONS = ['All Languages', 'English', 'Malayalam', 'Tamil'];

export default function Onboarding({ user, onPreferencesUpdated }) {
  const [step, setStep] = useState(1); // 1 = pick movies, 2 = pick genres
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [preferredLanguage, setPreferredLanguage] = useState('All Languages');
  const navigate = useNavigate();

  useEffect(() => {
    if (step === 1) {
      const load = async () => {
        setLoading(true);
        try {
          const data = await getFeaturedMovies();
          const shuffled = (data.movies || []).sort(() => Math.random() - 0.5);
          setMovies(shuffled.slice(0, SHOW_COUNT));
        } catch {
          setMovies([]);
        } finally {
          setLoading(false);
        }
      };
      load();
    }
  }, [step]);

  const handleMovieToggle = (movie) => {
    setSelectedMovies((prev) =>
      prev.find((m) => m._id === movie._id)
        ? prev.filter((m) => m._id !== movie._id)
        : prev.length < REQUIRED_SELECTIONS
        ? [...prev, movie]
        : prev
    );
  };

  const handleGenreToggle = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleFinish = async () => {
    const likedGenres = [
      ...new Set([
        ...selectedGenres,
        ...selectedMovies.flatMap((m) => m.genres || []),
      ]),
    ];
    
    setSaving(true);
    try {
      const dbSelectedMovies = selectedMovies.map(m => ({
        movieId: m._id,
        title: m.title,
        genres: m.genres,
        language: m.language,
        year: m.year,
        poster: m.poster
      }));

      const dbPreferences = {
        genres: likedGenres,
        languages: preferredLanguage === 'All Languages' ? [] : [preferredLanguage]
      };

      const res = await updatePreferences({
        selectedMovies: dbSelectedMovies,
        preferences: dbPreferences
      });
      
      onPreferencesUpdated(res.user);
      navigate('/');
    } catch (err) {
      console.error("Failed to save preferences", err);
      // Fallback navigation
      navigate('/');
    } finally {
      setSaving(false);
    }
  };

  const progress = selectedMovies.length / REQUIRED_SELECTIONS;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Clapperboard size={28} style={{ color: 'var(--accent-1)' }} />
          <span className="logo">MovieMind AI</span>
        </div>
      </header>

      {/* Step 1 — Pick Movies */}
      {step === 1 && (
        <div className="container" style={{ padding: '2rem 1.5rem', flex: 1 }}>
          <div style={{ maxWidth: '600px', margin: '0 auto 2rem', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Welcome, <span className="gradient-text">{user?.name || 'User'}</span>! 
              Pick {REQUIRED_SELECTIONS} movies you love
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              This helps us establish your personalized taste profile.
            </p>

            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              <span>{selectedMovies.length} selected</span>
              <span>{REQUIRED_SELECTIONS} required</span>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
              <Loader2 size={40} className="spinner" />
            </div>
          ) : movies.length === 0 ? (
            <div className="empty-state">
              <p>Could not load movies. Make sure the backend is running and the database is seeded.</p>
              <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={() => setStep(2)}>
                Skip this step
              </button>
            </div>
          ) : (
            <div className="onboard-grid">
              {movies.map((movie) => (
                <MovieCard
                  key={movie._id}
                  movie={movie}
                  selectable
                  selected={selectedMovies.some((m) => m._id === movie._id)}
                  onSelect={handleMovieToggle}
                  showExplain={false}
                />
              ))}
            </div>
          )}

          <div style={{ position: 'sticky', bottom: 0, background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(20px)', padding: '1rem 0', marginTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
            <button
              className="btn-primary"
              onClick={() => setStep(2)}
              disabled={selectedMovies.length < REQUIRED_SELECTIONS && movies.length > 0}
              style={{ opacity: selectedMovies.length < REQUIRED_SELECTIONS && movies.length > 0 ? 0.6 : 1 }}
            >
              Continue
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Genre & Language Preferences */}
      {step === 2 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem' }}>
          <div className="glass-card" style={{ maxWidth: '600px', width: '100%', padding: '2.5rem' }}>
            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Your <span className="gradient-text">preferences</span>
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              Select genres and your preferred language for tailored recommendations.
            </p>

            {/* Genre selection */}
            <div style={{ marginBottom: '2rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                Favorite Genres
              </p>
              <div className="filter-bar">
                {GENRE_OPTIONS.map((genre) => (
                  <button
                    key={genre}
                    className={`filter-chip ${selectedGenres.includes(genre) ? 'active' : ''}`}
                    onClick={() => handleGenreToggle(genre)}
                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                  >
                    {selectedGenres.includes(genre) && <CheckCircle2 size={12} style={{ marginRight: '0.25rem', display: 'inline' }} />}
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Language selection */}
            <div style={{ marginBottom: '2.5rem' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                Preferred Language
              </p>
              <div className="filter-bar">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang}
                    className={`filter-chip ${preferredLanguage === lang ? 'active' : ''}`}
                    onClick={() => setPreferredLanguage(lang)}
                    style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {selectedMovies.length > 0 && (
              <div style={{ background: 'rgba(124, 58, 237, 0.08)', border: '1px solid rgba(124, 58, 237, 0.2)', borderRadius: '10px', padding: '1rem', marginBottom: '2rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a78bfa', marginBottom: '0.5rem' }}>
                  🎬 Selected Movies ({selectedMovies.length})
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {selectedMovies.map((m) => (
                    <span key={m._id} style={{ fontSize: '0.75rem', background: 'rgba(124, 58, 237, 0.15)', color: '#c4b5fd', padding: '0.2rem 0.6rem', borderRadius: '20px', border: '1px solid rgba(124, 58, 237, 0.25)' }}>
                      {m.title}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-ghost" onClick={() => setStep(1)} disabled={saving}>
                ← Back
              </button>
              <button
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {saving ? 'Saving...' : 'Start Discovering'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
