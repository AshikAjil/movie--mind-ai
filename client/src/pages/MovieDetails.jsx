import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Sparkles, 
  Volume2, 
  Square, 
  Loader2, 
  Clock, 
  Globe, 
  Tags 
} from 'lucide-react';
import { getMovieDetails, getSimilarMovies, explainMovie, getUserFeed } from '../services/api.js';
import MovieCard from '../components/MovieCard.jsx';
import { speakText, stopSpeech } from '../utils/speech.js';
import { deriveFeedSignals } from '../utils/feedUtils.js';

export default function MovieDetails({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [movie, setMovie] = useState(location.state?.movie || null);
  const [similar, setSimilar] = useState([]);
  const [explanation, setExplanation] = useState('');
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(!location.state?.movie);
  const [explaining, setExplaining] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchData = async () => {
      // If we don't have movie data from state, show loader
      if (!movie) setLoading(true);
      
      try {
        const [movieRes, feedData] = await Promise.all([
          getMovieDetails(id),
          getUserFeed().catch(() => ({ liked: [], disliked: [] }))
        ]);
        
        const movieData = movieRes.movie || movieRes;
        if (!movieData) throw new Error("Movie not found");
        
        setMovie(movieData);
        setFeed(feedData);
        
        try {
          const similarRes = await getSimilarMovies(id).catch(() => ({ results: [] }));
          setSimilar(similarRes.results || []);
        } catch (secErr) {
          console.warn("Secondary data load failed:", secErr);
        }

      } catch (err) {
        console.error('Fetch details error:', err);
        if (!movie) setMovie(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Pre-generate explanation in background
  useEffect(() => {
    if (movie && user && feed && !explanation) {
      // Quiet background fetch to cache the explanation
      const feedSignals = deriveFeedSignals(feed);
      explainMovie(movie._id, movie.title, user.preferences, feedSignals)
        .catch(err => console.log('Preload explanation error:', err))
        .finally(() => console.log('Preload explanation finished'));
    }
  }, [movie, user, feed]);

  const handleExplain = async () => {
    if (explanation || !movie || !user) return;
    setExplaining(true);
    try {
      const feedSignals = deriveFeedSignals(feed);
      const data = await explainMovie(movie._id, movie.title, user.preferences, feedSignals);
      setExplanation(data.explanation);
    } catch (err) {
      console.error(err);
    } finally {
      setExplaining(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <Loader2 className="spinner" size={40} />
      </div>
    );
  }

  if (!movie) return <div className="container">Movie not found</div>;

  const matchColor = movie.matchPercentage >= 80 ? 'var(--success)' : 
                    movie.matchPercentage >= 60 ? '#eab308' : '#64748b';

  return (
    <div className="fade-in" style={{ paddingBottom: '4rem' }}>
      {/* Hero Section */}
      <div className="detail-hero" style={{ position: 'relative', minHeight: '60vh', display: 'flex', alignItems: 'flex-end' }}>
        <div 
          style={{ 
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundImage: `linear-gradient(to top, var(--bg) 10%, transparent 90%), url(${movie.poster})`,
            backgroundSize: 'cover', backgroundPosition: 'center 20%', opacity: 0.3, zIndex: -1
          }} 
        />
        
        <div className="container" style={{ paddingBottom: '2rem' }}>
          <button onClick={() => navigate(-1)} className="btn-ghost" style={{ marginBottom: '2rem', gap: '0.4rem' }}>
            <ArrowLeft size={16} /> Back
          </button>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <img 
              src={movie.poster} 
              alt={movie.title} 
              style={{ width: '280px', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', border: '1px solid var(--border)' }} 
            />
            
            <div style={{ flex: 1, minWidth: '300px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, margin: 0 }}>{movie.title}</h1>
                <div style={{ 
                  padding: '4px 12px', borderRadius: '20px', background: matchColor, 
                  fontSize: '0.9rem', fontWeight: 700, color: '#fff' 
                }}>
                  🎯 {movie.matchPercentage}% Match
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-muted)', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14}/> {movie.year}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Globe size={14}/> {movie.language || 'Unknown'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Tags size={14}/> {movie.genres?.join(', ') || 'Various'}</span>
              </div>

              <p style={{ fontSize: '1.1rem', lineHeight: 1.7, opacity: 0.9, marginBottom: '2rem', maxWidth: '800px' }}>
                {movie.description || movie.overview}
              </p>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" onClick={handleExplain} disabled={explaining}>
                  {explaining ? <Loader2 size={18} className="spinner" /> : <Sparkles size={18} />}
                  Why should I watch?
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* AI Analysis Section */}
        {explanation && (
          <div className="explanation-box-large fade-in" style={{ marginTop: '2rem', background: 'var(--bg-card)', padding: '2rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem', color: 'var(--accent-1)' }}>
              <Sparkles size={20} /> AI Personalized Analysis
            </h3>
            <p style={{ fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>{explanation}</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-ghost" onClick={() => speakText(explanation)}>
                <Volume2 size={16} /> Listen
              </button>
              <button className="btn-ghost" onClick={() => stopSpeech()}>
                <Square size={16} /> Stop
              </button>
            </div>
          </div>
        )}


        {/* Similar Movies Section */}
        <div style={{ marginTop: '4rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>More Like This</h2>
          <div className="hide-scrollbar" style={{ display: 'flex', gap: '1.5rem', overflowX: 'auto', paddingBottom: '1rem' }}>
            {similar && similar.length > 0 ? similar.map(m => (
              <div key={m._id} style={{ minWidth: '220px', maxWidth: '220px' }}>
                <MovieCard movie={m} showExplain={false} />
              </div>
            )) : (
              <p style={{ color: 'var(--text-muted)' }}>No similar movies found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
