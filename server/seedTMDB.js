import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Movie from './models/Movie.js';
import { getMovieEmbedding } from './utils/embedding.js';

// ─── Configuration ───────────────────────────────────────────────
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

// Using a proxy to bypass TMDB DNS/Network blocking on this machine
const PROXY_BASE = 'https://api.codetabs.com/v1/proxy?quest=';

// Languages: TMDB ISO 639-1 code → display name
const LANGUAGES = [
  { code: 'ml', name: 'Malayalam' },
  { code: 'ta', name: 'Tamil' },
  { code: 'hi', name: 'Hindi' },
  { code: 'en', name: 'English' },
];

const PAGES_PER_LANGUAGE = 20; // 20 results per page × 20 pages = up to 400 per language

// ─── TMDB Genre Map ──────────────────────────────────────────────
const GENRE_MAP = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

// ─── Helpers ─────────────────────────────────────────────────────
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const randomDelay = () => delay(200 + Math.random() * 100); // 200–300ms

function mapGenres(genreIds) {
  return (genreIds || [])
    .map((id) => GENRE_MAP[id])
    .filter(Boolean);
}

// ─── Fetch one page from TMDB discover/movie ─────────────────────
async function fetchPage(langCode, page) {
  try {
    const tmdbUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${langCode}&sort_by=popularity.desc&page=${page}&include_adult=false`;
    const proxyUrl = `${PROXY_BASE}${encodeURIComponent(tmdbUrl)}`;
    
    const res = await axios.get(proxyUrl, {
      timeout: 20000, // Slightly longer timeout to account for proxy overhead
    });
    return res.data.results || [];
  } catch (err) {
    console.error(`  ⚠ Failed to fetch page ${page} for "${langCode}": ${err.message}`);
    return [];
  }
}

// ─── Main ────────────────────────────────────────────────────────
async function seedFromTMDB() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   🎬  TMDB Mass Seeder — 2000+ Real Movies      ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env — aborting.');
    process.exit(1);
  }

  // Connect to MongoDB
  console.log('⏳ Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log('✅ MongoDB connected.\n');

  // Collect all existing tmdbIds so we can skip duplicates in-memory
  const existing = await Movie.find({ tmdbId: { $exists: true } }, 'tmdbId').lean();
  const existingIds = new Set(existing.map((m) => m.tmdbId));
  console.log(`📦 ${existingIds.size} movies already in database.\n`);

  // ── Phase 1: Fetch all movies from TMDB ────────────────────────
  const collected = []; // { tmdbId, title, description, genres, language, year, release_date, poster }
  const seenIds = new Set([...existingIds]);

  for (const lang of LANGUAGES) {
    console.log(`\n🌐 Fetching ${lang.name} (${lang.code}) — pages 1–${PAGES_PER_LANGUAGE}...`);
    let langCount = 0;

    for (let page = 1; page <= PAGES_PER_LANGUAGE; page++) {
      const results = await fetchPage(lang.code, page);

      for (const movie of results) {
        // Skip duplicates
        if (seenIds.has(movie.id)) continue;

        // Skip movies without poster or overview
        if (!movie.poster_path || !movie.overview) continue;

        const genres = mapGenres(movie.genre_ids);
        if (genres.length === 0) genres.push('Drama'); // fallback genre

        const year = movie.release_date
          ? parseInt(movie.release_date.split('-')[0])
          : null;
        if (!year) continue; // skip movies with no valid year

        collected.push({
          tmdbId: movie.id,
          title: movie.title,
          overview: movie.overview,
          description: movie.overview, // mapping overview to description
          genres,
          language: lang.name,
          release_date: movie.release_date,
          year,
          poster: `${POSTER_BASE}${movie.poster_path}`,
          isFeatured: false,
        });

        seenIds.add(movie.id);
        langCount++;
      }

      process.stdout.write(`  📄 Page ${page}/${PAGES_PER_LANGUAGE} → ${langCount} new movies so far\r`);
      await randomDelay();
    }

    console.log(`  ✅ ${lang.name}: ${langCount} new movies collected.           `);
  }

  console.log(`\n🎯 Total collected: ${collected.length} new movies.\n`);

  if (collected.length === 0) {
    console.log('Nothing new to add — your database is already up to date!');
    await mongoose.disconnect();
    process.exit(0);
  }

  // ── Phase 2: Generate embeddings & save in batches ─────────────
  const BATCH_SIZE = 5; // small batches to be gentle on the embedding API
  let savedTotal = 0;
  let failedEmbeddings = 0;
  let skippedDuplicates = 0;

  console.log('⚙️  Generating embeddings & saving to MongoDB...\n');

  for (let i = 0; i < collected.length; i += BATCH_SIZE) {
    const batch = collected.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(collected.length / BATCH_SIZE);

    process.stdout.write(
      `  🔄 Batch ${batchNum}/${totalBatches} (${savedTotal} saved, ${failedEmbeddings} embed-failures)...\r`
    );

    // Generate embeddings for the batch concurrently
    const embeddedResults = await Promise.allSettled(
      batch.map(async (movie) => {
        try {
          const embedding = await getMovieEmbedding(movie);
          return { ...movie, embedding };
        } catch (err) {
          failedEmbeddings++;
          // Still save the movie, just without an embedding
          return { ...movie, embedding: [] };
        }
      })
    );

    const moviesToSave = embeddedResults
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    // Save one-by-one to gracefully handle duplicate-key errors
    for (const movie of moviesToSave) {
      try {
        await Movie.create(movie);
        savedTotal++;
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate tmdbId — already exists
          skippedDuplicates++;
        } else {
          console.error(`\n  ❌ Failed to save "${movie.title}": ${err.message}`);
        }
      }
    }

    // Small delay between embedding batches
    await delay(300);
  }

  // ── Summary ────────────────────────────────────────────────────
  console.log('\n\n╔═══════════════════════════════════════════════════╗');
  console.log('║                  📊 SEED SUMMARY                  ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  🎬 Movies saved:        ${String(savedTotal).padStart(6)}                ║`);
  console.log(`║  ⏭️  Skipped (duplicate): ${String(skippedDuplicates).padStart(6)}                ║`);
  console.log(`║  ⚠️  Embedding failures:  ${String(failedEmbeddings).padStart(6)}                ║`);
  console.log(`║  📦 Already existed:      ${String(existingIds.size).padStart(6)}                ║`);
  console.log('╚═══════════════════════════════════════════════════╝\n');

  // Final count
  const totalInDb = await Movie.countDocuments();
  console.log(`🗄️  Total movies now in database: ${totalInDb}\n`);

  await mongoose.disconnect();
  console.log('✅ Done! Database disconnected.');
  process.exit(0);
}

seedFromTMDB().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
