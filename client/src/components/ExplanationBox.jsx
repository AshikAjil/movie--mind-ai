import { useState, useEffect } from 'react';
import { Sparkles, Loader2, AlertTriangle, ThumbsUp } from 'lucide-react';
import { explainMovie } from '../services/api.js';
import { speakText, stopSpeech } from '../utils/speech.js';

function useTypewriter(text, speed = 15) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return displayedText;
}

/**
 * Derives feedSignals from the current feed state.
 * Mirrors the logic in useFeed.getFeedSignals().
 */
function deriveFeedSignals(feed) {
  if (!feed) return {};
  const genreCount = {};
  const langCount = {};
  const dislikedGenres = new Set();

  for (const m of feed.liked || []) {
    for (const g of m.genres || []) genreCount[g] = (genreCount[g] || 0) + 1;
    if (m.language) langCount[m.language] = (langCount[m.language] || 0) + 1;
  }
  for (const m of feed.disliked || []) {
    for (const g of m.genres || []) dislikedGenres.add(g);
  }

  return {
    likedGenres: Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g]) => g),
    likedLanguages: Object.entries(langCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([l]) => l),
    dislikedGenres: [...dislikedGenres],
  };
}

export default function ExplanationBox({ movie, preferences, feed }) {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [isMismatch, setIsMismatch] = useState(false);
  const [tasteDetails, setTasteDetails] = useState(null);

  const handleExplain = async (e) => {
    e.stopPropagation();

    if (visible) {
      setVisible(false);
      setExplanation('');
      setError('');
      setIsMismatch(false);
      setTasteDetails(null);
      return;
    }

    setLoading(true);
    setError('');
    setVisible(true);

    try {
      const feedSignals = deriveFeedSignals(feed);
      const data = await explainMovie(movie._id, movie.title, preferences, feedSignals);
      setExplanation(data.explanation);
      setIsMismatch(data.isMismatch || false);
      setTasteDetails(data.tasteDetails || null);
    } catch (err) {
      setError(err.message || 'Could not generate explanation. Check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const typedExplanation = useTypewriter(explanation, 20);
  const isTyping = explanation && typedExplanation.length < explanation.length;

  // Decide button appearance based on known taste mismatch
  const buttonLabel = visible && explanation
    ? 'Hide Analysis'
    : 'Should I watch this?';

  return (
    <div>
      <button
        className={`btn-primary btn-sm w-full mt-2 ${isMismatch && visible ? 'explain-btn-warn' : ''}`}
        onClick={handleExplain}
        disabled={loading}
        style={{ justifyContent: 'center' }}
        id={`explain-btn-${movie._id}`}
      >
        {loading ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Analyzing taste...
          </>
        ) : (
          <>
            {isMismatch && visible ? (
              <AlertTriangle size={14} />
            ) : (
              <Sparkles size={14} />
            )}
            {buttonLabel}
          </>
        )}
      </button>

      {visible && (
        <div className={`explanation-box ${isMismatch ? 'explanation-box-warn' : ''}`}>
          {/* Header */}
          <div className={`explanation-header ${isMismatch ? 'explanation-header-warn' : ''}`}>
            {isMismatch ? (
              <>
                <AlertTriangle size={12} />
                Taste Mismatch Warning
              </>
            ) : (
              <>
                <ThumbsUp size={12} />
                AI Recommendation
              </>
            )}
          </div>

          {/* Taste mismatch details pills */}
          {isMismatch && tasteDetails && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {tasteDetails.dislikedMatches?.map((g) => (
                <span key={g} className="taste-pill taste-pill-bad">
                  👎 {g}
                </span>
              ))}
              {tasteDetails.langMismatch && (
                <span className="taste-pill taste-pill-bad">
                  🌐 Lang mismatch
                </span>
              )}
            </div>
          )}

          {/* Liked genre match pills for recommendations */}
          {!isMismatch && tasteDetails?.likedMatches?.length > 0 && (
            <div style={{ marginBottom: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
              {tasteDetails.likedMatches.map((g) => (
                <span key={g} className="taste-pill taste-pill-good">
                  ❤️ {g}
                </span>
              ))}
            </div>
          )}

          {/* Loading spinner */}
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}>
              <div className="spinner" style={{ width: '24px', height: '24px', borderWidth: '2px' }} />
            </div>
          )}

          {/* Error */}
          {error && (
            <p style={{ fontSize: '0.8rem', color: 'var(--danger)', lineHeight: 1.5 }}>
              ⚠️ {error}
            </p>
          )}

          {/* Explanation text */}
          {explanation && !loading && (
            <>
              <p className={`explanation-text ${isMismatch ? 'explanation-text-warn' : ''}`}>
                {typedExplanation}
                {isTyping && <span className="typing-cursor" style={{ marginLeft: '2px', opacity: 0.7 }}>▋</span>}
              </p>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem' }}>
                <button
                  className="btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    speakText(explanation, movie.language);
                  }}
                >
                  🔊 Listen
                </button>
                <button
                  className="btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    stopSpeech();
                  }}
                >
                  ⛔ Stop
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
