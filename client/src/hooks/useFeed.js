import { useState, useCallback } from 'react';

const FEED_KEY = 'movieai_feed';

function loadFeed() {
  try {
    const raw = localStorage.getItem(FEED_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return { liked: [], disliked: [] };
}

function saveFeed(feed) {
  localStorage.setItem(FEED_KEY, JSON.stringify(feed));
}

/**
 * useFeed — manages a user's like/dislike history in localStorage.
 *
 * Feed shape:
 * {
 *   liked:    [{ movieId, title, genres, language, year }]
 *   disliked: [{ movieId, title, genres, language }]
 * }
 */
export function useFeed() {
  const [feed, setFeed] = useState(() => loadFeed());

  const updateFeed = useCallback((updater) => {
    setFeed((prev) => {
      const next = updater(prev);
      saveFeed(next);
      return next;
    });
  }, []);

  /** Add to liked, remove from disliked. Toggling an already-liked movie removes it. */
  const like = useCallback((movie) => {
    updateFeed((prev) => {
      const entry = {
        movieId: movie._id,
        title: movie.title,
        genres: movie.genres || [],
        language: movie.language,
        year: movie.year,
        poster: movie.poster,
      };
      const alreadyLiked = prev.liked.some((m) => m.movieId === movie._id);
      return {
        liked: alreadyLiked
          ? prev.liked.filter((m) => m.movieId !== movie._id)
          : [...prev.liked, entry],
        disliked: prev.disliked.filter((m) => m.movieId !== movie._id),
      };
    });
  }, [updateFeed]);

  /** Add to disliked, remove from liked. Toggling an already-disliked movie removes it. */
  const dislike = useCallback((movie) => {
    updateFeed((prev) => {
      const entry = {
        movieId: movie._id,
        title: movie.title,
        genres: movie.genres || [],
        language: movie.language,
      };
      const alreadyDisliked = prev.disliked.some((m) => m.movieId === movie._id);
      return {
        disliked: alreadyDisliked
          ? prev.disliked.filter((m) => m.movieId !== movie._id)
          : [...prev.disliked, entry],
        liked: prev.liked.filter((m) => m.movieId !== movie._id),
      };
    });
  }, [updateFeed]);

  /**
   * Returns genre/language boost signals to pass to the search backend.
   * likedGenres: genres that appear most in liked movies (top 5 by count)
   * dislikedGenres: genres from disliked movies
   * likedLanguages: languages from liked movies
   */
  const getFeedSignals = useCallback(() => {
    const genreCount = {};
    const languageCount = {};
    const dislikedGenres = new Set();

    for (const m of feed.liked) {
      for (const g of m.genres || []) {
        genreCount[g] = (genreCount[g] || 0) + 1;
      }
      if (m.language) {
        languageCount[m.language] = (languageCount[m.language] || 0) + 1;
      }
    }

    for (const m of feed.disliked) {
      for (const g of m.genres || []) {
        dislikedGenres.add(g);
      }
    }

    const likedGenres = Object.entries(genreCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([g]) => g);

    const likedLanguages = Object.entries(languageCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([l]) => l);

    return {
      likedGenres,
      likedLanguages,
      dislikedGenres: [...dislikedGenres],
    };
  }, [feed]);

  return { feed, like, dislike, getFeedSignals };
}
