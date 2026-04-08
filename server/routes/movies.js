import express from 'express';
import Movie from '../models/Movie.js';
import User from '../models/User.js';
import axios from 'axios';
import { generateMovies } from '../utils/datasetGenerator.js';
import { getMovieEmbedding } from '../utils/embedding.js';
import { authMiddleware } from './auth.js';
import { calculateMatchScore } from '../utils/matchScore.js';

const router = express.Router();

// POST /api/movies/seed — Delete existing and seed 500 movies with embeddings
router.post('/seed', async (req, res) => {
  try {
    // Move deletion to optional query param if needed, or keeping it for full reset
    // but the user asked for "skip if duplicate found" logic.
    if (req.query.reset === 'true') {
      console.log('🗑️  Performing full reset (deleting existing movies)...');
      await Movie.deleteMany({});
    }

    const movies = await generateMovies();
    console.log(`📦  Generated ${movies.length} movies. Starting embedding...`);

    const batchSize = 10;
    const savedMovies = [];

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);

      const embeddedBatch = await Promise.allSettled(
        batch.map(async (movie) => {
          try {
            const embedding = await getMovieEmbedding(movie);
            return { ...movie, embedding };
          } catch (err) {
            console.warn(`⚠️  Embedding failed for "${movie.title}": ${err.message}`);
            return { ...movie, embedding: [] };
          }
        })
      );

      const resolved = embeddedBatch
        .filter((r) => r.status === 'fulfilled')
        .map((r) => r.value);

      // Robust duplicate prevention before insertion
      const toInsert = [];
      for (const movieData of resolved) {
        const query = {
          $or: [
            { tmdbId: movieData.tmdbId },
            { 
              title: { $regex: new RegExp(`^${movieData.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }, 
              release_date: movieData.release_date 
            }
          ]
        };

        const exists = await Movie.findOne(query);
        if (!exists) {
          toInsert.push(movieData);
        } else {
          console.log(`⏩ Skipping duplicate: ${movieData.title}`);
        }
      }

      if (toInsert.length > 0) {
        const docs = await Movie.insertMany(toInsert, { ordered: false });
        savedMovies.push(...docs);
      }

      const progress = Math.min(i + batchSize, movies.length);
      console.log(`✅  Progress: ${progress}/${movies.length} movies saved`);

      // Small delay to avoid rate limiting
      if (i + batchSize < movies.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    res.json({
      success: true,
      message: `Successfully seeded ${savedMovies.length} movies`,
      count: savedMovies.length,
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/movies — Returns all movies (without embedding field)
router.get('/', async (req, res) => {
  try {
    const { language, genre, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (language) filter.language = language;
    if (genre) filter.genres = { $in: [genre] };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [movies, total] = await Promise.all([
      Movie.find(filter).select('_id title poster year language genres matchPercentage isFeatured').sort({ year: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Movie.countDocuments(filter),
    ]);

    res.json({
      movies,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error('Get movies error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/movies/featured — Returns featured movies with match percentage
router.get('/featured', authMiddleware, async (req, res) => {
  try {
    // 1. Fetch movies separately for each language in parallel
    const [ml, ta, hi, en] = await Promise.all([
      Movie.find({ language: 'Malayalam' }).select('_id title poster year language genres matchPercentage isFeatured').limit(10).lean(),
      Movie.find({ language: 'Tamil' }).select('_id title poster year language genres matchPercentage isFeatured').limit(10).lean(),
      Movie.find({ language: 'Hindi' }).select('_id title poster year language genres matchPercentage isFeatured').limit(10).lean(),
      Movie.find({ language: 'English' }).select('_id title poster year language genres matchPercentage isFeatured').limit(10).lean(),
    ]);

    // 2. Combine all arrays
    let results = [...ml, ...ta, ...hi, ...en];

    // Personalization logic: match percentage & consistency
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        results = results.map(m => {
          const doc = m.toObject ? m.toObject() : m;
          return {
            ...doc,
            matchPercentage: calculateMatchScore(doc, user.preferences)
          };
        });
        // Sort descending by matchPercentage
        results.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));
      }
    } else {
      // Ensure consistency: No randomness, sort by year descending if no user
      results.sort((a, b) => b.year - a.year);
    }

    // Return top 40 movies after sorting
    results = results.slice(0, 40);

    res.json({ movies: results, count: results.length });
  } catch (error) {
    console.error('Get featured error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/movies/:id — Get single movie by ID with match percentage
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).select('-embedding').lean();
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    // Calculate match percentage if user is authenticated
    let matchPercentage = 0;
    if (req.user) {
      const user = await User.findById(req.user.userId);
      if (user) {
        matchPercentage = calculateMatchScore(movie, user.preferences);
      }
    }

    res.json({ movie: { ...movie, matchPercentage } });
  } catch (error) {
    console.error('Get movie error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/movies/similar/:id
 * Logic: Match based on same genres or same language.
 * Sort by year/popularity or just return matches.
 */
router.get('/similar/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    if (!movie) return res.status(404).json({ error: 'Movie not found' });

    const similar = await Movie.find({
      _id: { $ne: movie._id },
      $or: [
        { genres: { $in: movie.genres } },
        { language: movie.language }
      ]
    })
    .select('_id title poster year language genres matchPercentage isFeatured')
    .limit(10)
    .lean();

    res.json({ results: similar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/movies/:tmdbId/trailer
 * Proxy to TMDB to fetch YouTube key
 */
router.get('/:tmdbId/trailer', async (req, res) => {
  const { tmdbId } = req.params;
  const apiKey = process.env.TMDB_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'TMDB API key missing on server' });
  }

  const url = `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${apiKey}`;
  try {
    const response = await axios.get(url, { timeout: 15000 });
    
    const videos = response.data.results || [];
    const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
                    videos.find(v => v.site === 'YouTube' && v.type === 'Teaser') ||
                    videos.find(v => v.site === 'YouTube' && v.type === 'Clip') ||
                    videos.find(v => v.site === 'YouTube');

    if (!trailer) {
      return res.status(404).json({ message: 'No trailer found on TMDB' });
    }

    res.json({ key: trailer.key });
  } catch (err) {
    console.error('TMDB API Error:', err.message);
    const status = err.response ? err.response.status : 502;
    return res.status(status).json({ 
      error: 'TMDB API unreachable or error', 
      details: err.message,
      tip: 'Check your internet connection and TMDB API key.'
    });
  }
});

export default router;
