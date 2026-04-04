import React, { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FALLBACK_COLORS = [
  'from-purple-900 to-indigo-900',
  'from-blue-900 to-cyan-900',
  'from-rose-900 to-purple-900',
  'from-amber-900 to-orange-900',
  'from-emerald-900 to-teal-900',
];

const MovieCard = ({
  movie,
  selectable = false,
  selected = false,
  onSelect,
  // Feed props
  isLiked = false,
  isDisliked = false,
  onLike,
  onDislike,
}) => {
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [feedToast, setFeedToast] = useState('');
  const [bounceBtn, setBounceBtn] = useState(null); // 'like' | 'dislike'

  useEffect(() => {
    // console.log('Movie Card Data:', movie);
  }, [movie]);

  const posterSrc = imgError
    ? 'https://via.placeholder.com/300x450?text=No+Image'
    : movie.poster || 'https://via.placeholder.com/300x450?text=No+Image';

  const fallbackIndex = movie.title.charCodeAt(0) % FALLBACK_COLORS.length;
  const emoji = getGenreEmoji(movie.genres?.[0]);

  const handleClick = () => {
    if (selectable && onSelect) {
      onSelect(movie);
    } else if (!selectable) {
      navigate(`/movie/${movie._id}`, { state: { movie } });
    }
  };

  const handleLike = (e) => {
    e.stopPropagation();
    if (!onLike) return;
    onLike(movie);
    setBounceBtn('like');
    setTimeout(() => setBounceBtn(null), 400);
    setFeedToast(isLiked ? 'Removed from liked' : '👍 Liked!');
    setTimeout(() => setFeedToast(''), 1500);
  };

  const handleDislike = (e) => {
    e.stopPropagation();
    if (!onDislike) return;
    onDislike(movie);
    setBounceBtn('dislike');
    setTimeout(() => setBounceBtn(null), 400);
    setFeedToast(isDisliked ? 'Removed from disliked' : '👎 Disliked');
    setTimeout(() => setFeedToast(''), 1500);
  };

  return (
    <div
      className={`movie-card ${selectable ? 'onboard-card' : ''} ${selected ? 'selected' : ''}`}
      onClick={handleClick}
      role={selectable ? 'button' : undefined}
      aria-pressed={selectable ? selected : undefined}
      id={`movie-card-${movie._id}`}
    >
      {/* Poster */}
      <div style={{ position: 'relative' }}>
        {!imgLoaded && !imgError && (
          <div className="movie-poster-fallback skeleton">
            <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>{emoji}</span>
          </div>
        )}

        <img
          src={posterSrc}
          alt={movie.title}
          className="movie-poster"
          style={{ opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Match badge */}
        {movie.matchPercentage !== undefined && (
          <div 
            className="match-badge"
            style={{ 
              background: movie.matchPercentage >= 80 ? 'var(--success)' : 
                          movie.matchPercentage >= 60 ? '#eab308' : '#64748b' 
            }}
          >
            🎯 {movie.matchPercentage}% Match
          </div>
        )}

        {/* Feed reaction badge (shown when liked/disliked) */}
        {(isLiked || isDisliked) && (
          <div className={`feed-reaction-badge ${isLiked ? 'feed-liked' : 'feed-disliked'}`}>
            {isLiked ? '❤️' : '💔'}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="movie-info">
        <h3 className="movie-title" title={movie.title}>
          {movie.title}
        </h3>

        <div className="movie-year">
          <span className={`lang-badge lang-${movie.language?.replace(' ', '')}`}>
            {movie.language}
          </span>
          {' '}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {movie.year}
          </span>
        </div>

        <div>
          {movie.genres?.slice(0, 2).map((g) => (
            <span key={g} className={`genre-badge genre-${g.replace(/[^a-zA-Z]/g, '')}`}>
              {g}
            </span>
          ))}
        </div>

        {/* Like / Dislike Bar */}
        {!selectable && (
          <div className="like-dislike-bar">
            <button
              id={`like-btn-${movie._id}`}
              className={`feed-btn like-btn ${isLiked ? 'active' : ''} ${bounceBtn === 'like' ? 'bounce' : ''}`}
              onClick={handleLike}
              title={isLiked ? 'Unlike this movie' : 'Like this movie'}
              aria-label={isLiked ? 'Unlike' : 'Like'}
            >
              <ThumbsUp size={14} />
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>

            <button
              id={`dislike-btn-${movie._id}`}
              className={`feed-btn dislike-btn ${isDisliked ? 'active' : ''} ${bounceBtn === 'dislike' ? 'bounce' : ''}`}
              onClick={handleDislike}
              title={isDisliked ? 'Remove dislike' : 'Dislike this movie'}
              aria-label={isDisliked ? 'Remove dislike' : 'Dislike'}
            >
              <ThumbsDown size={14} />
              <span>{isDisliked ? 'Disliked' : 'Dislike'}</span>
            </button>

            {/* Inline toast */}
            {feedToast && (
              <span className="feed-inline-toast">{feedToast}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getGenreEmoji(genre) {
  const map = {
    Action: '💥', Drama: '🎭', Thriller: '🔍', Romance: '💕',
    Comedy: '😄', Horror: '👻', 'Sci-Fi': '🚀', Mystery: '🕵️',
    Biography: '📖', Animation: '🎨', Crime: '🔫', Fantasy: '🧙',
    Adventure: '🗺️', Historical: '🏛️', Musical: '🎵',
  };
  return map[genre] || '🎬';
}

export default React.memo(MovieCard);
