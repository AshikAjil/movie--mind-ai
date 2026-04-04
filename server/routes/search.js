import express from 'express';
import Movie from '../models/Movie.js';
import { getEmbedding } from '../utils/embedding.js';
import { cosineSimilarity, similarityToPercentage } from '../utils/similarity.js';

const router = express.Router();

// POST /api/search — Semantic search using embeddings + feed signal boosting
router.post('/', async (req, res) => {
  try {
    const { query, preferences = {}, feedSignals = {} } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const trimmedQuery = query.trim();

    // Build enriched query with user preferences + liked genres if available
    let enrichedQuery = trimmedQuery;
    if (preferences.genres?.length > 0) {
      enrichedQuery += `. Preferred genres: ${preferences.genres.join(', ')}`;
    }
    if (preferences.language) {
      enrichedQuery += `. Preferred language: ${preferences.language}`;
    }
    if (feedSignals.likedGenres?.length > 0) {
      enrichedQuery += `. User has liked movies in: ${feedSignals.likedGenres.join(', ')}`;
    }

    // Get embedding for the search query
    let queryEmbedding;
    try {
      queryEmbedding = await getEmbedding(enrichedQuery);
    } catch (embErr) {
      console.error('Embedding error:', embErr.message);
      return res.status(503).json({
        error: 'Embedding service unavailable. Please check OPENROUTER_API_KEY.',
        details: embErr.message,
      });
    }

    // Fetch all movies WITH embeddings for comparison
    const movies = await Movie.find({ embedding: { $exists: true, $not: { $size: 0 } } })
      .select('embedding _id title poster year language genres tmdbId isFeatured')
      .lean();

    if (movies.length === 0) {
      return res.json({
        results: [],
        message: 'No movies with embeddings found. Please run /api/movies/seed first.',
      });
    }

    // Build boost/penalty sets from feed signals
    const likedGenreSet = new Set(feedSignals.likedGenres || []);
    const likedLangSet = new Set(feedSignals.likedLanguages || []);
    const dislikedGenreSet = new Set(feedSignals.dislikedGenres || []);

    const THRESHOLD = 0.2;

    const scoredMovies = movies.map((movie) => {
      let score = cosineSimilarity(queryEmbedding, movie.embedding);

      // Apply feed-based boost/penalty
      if (likedGenreSet.size > 0 || dislikedGenreSet.size > 0 || likedLangSet.size > 0) {
        const movieGenres = movie.genres || [];
        const movieLang = movie.language;

        // Boost if any genre matches liked genres
        const likedGenreMatches = movieGenres.filter((g) => likedGenreSet.has(g)).length;
        if (likedGenreMatches > 0) {
          score *= 1 + likedGenreMatches * 0.08; // +8% per matching genre
        }

        // Boost if language matches liked languages
        if (likedLangSet.has(movieLang)) {
          score *= 1.05; // +5% for matching language
        }

        // Penalise if all genres are disliked
        const dislikedGenreMatches = movieGenres.filter((g) => dislikedGenreSet.has(g)).length;
        const allDisliked = dislikedGenreMatches === movieGenres.length && movieGenres.length > 0;
        if (allDisliked) {
          score *= 0.75; // -25% penalty only when every genre is disliked
        }
      }

      return {
        ...movie,
        embedding: undefined,
        similarityScore: score,
        matchPercentage: similarityToPercentage(score),
      };
    });

    // Deduplication logic
    const uniqueMovies = [];
    const seenIndices = new Set();
    const seenTitles = new Set();
    const seenTmdbIds = new Set();

    // Sort by score first to keep the best match for each movie
    const sortedAll = [...scoredMovies].sort((a, b) => b.similarityScore - a.similarityScore);

    for (const m of sortedAll) {
      if (m.similarityScore < THRESHOLD) continue;

      const normTitle = m.title.toLowerCase().trim();
      const hasTmdbId = m.tmdbId !== undefined && m.tmdbId !== null;

      const isDuplicate =
        (hasTmdbId && seenTmdbIds.has(m.tmdbId)) ||
        seenTitles.has(normTitle);

      if (!isDuplicate) {
        uniqueMovies.push(m);
        seenTitles.add(normTitle);
        if (hasTmdbId) seenTmdbIds.add(m.tmdbId);
      }

      if (uniqueMovies.length >= 20) break;
    }

    res.json({
      results: uniqueMovies,
      query: trimmedQuery,
      count: uniqueMovies.length,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
