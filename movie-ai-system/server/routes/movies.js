import express from 'express';
import Movie from '../models/Movie.js';
import { generateMovies } from '../utils/datasetGenerator.js';
import { getMovieEmbedding } from '../utils/embedding.js';

const router = express.Router();

// POST /api/movies/seed — Delete existing and seed 500 movies with embeddings
router.post('/seed', async (req, res) => {
  try {
    console.log('🗑️  Deleting existing movies...');
    await Movie.deleteMany({});

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

      const docs = await Movie.insertMany(resolved);
      savedMovies.push(...docs);

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
      Movie.find(filter).select('-embedding').skip(skip).limit(parseInt(limit)).sort({ year: -1 }),
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

// GET /api/movies/featured — Returns featured movies
router.get('/featured', async (req, res) => {
  try {
    const movies = await Movie.find({ isFeatured: true })
      .select('-embedding')
      .limit(100)
      .sort({ year: -1 });

    res.json({ movies, count: movies.length });
  } catch (error) {
    console.error('Get featured error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/movies/:id — Get single movie by ID
router.get('/:id', async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id).select('-embedding');
    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }
    res.json({ movie });
  } catch (error) {
    console.error('Get movie error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
