import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Movie from './models/Movie.js';
import { getMovieEmbedding } from './utils/embedding.js';

// ─── Configuration ───────────────────────────────────────────────
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = 'https://api.themoviedb.org/3';
const POSTER_BASE = 'https://image.tmdb.org/t/p/w500';

// Using proxy to bypass TMDB DNS blocking
const PROXY_BASE = 'https://api.codetabs.com/v1/proxy?quest=';

const LANGUAGES = [
  { code: 'ta', name: 'Tamil' },
  { code: 'hi', name: 'Hindi' },
];

// Genres: 35 (Comedy), 10749 (Romance)
// Comma-separated means OR in TMDB API.
const GENRES_TO_FETCH = '35,10749'; 
const PAGES_PER_LANGUAGE = 15; // 15 pages * 20 results = 300 per language (to easily get 200+)

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
const randomDelay = () => delay(200 + Math.random() * 100);

function mapGenres(genreIds) {
  return (genreIds || [])
    .map((id) => GENRE_MAP[id])
    .filter(Boolean);
}

// ─── Fetch one page from TMDB discover/movie ─────────────────────
async function fetchPage(langCode, page) {
  try {
    const tmdbUrl = `${TMDB_BASE}/discover/movie?api_key=${TMDB_API_KEY}&with_original_language=${langCode}&with_genres=${GENRES_TO_FETCH}&sort_by=popularity.desc&page=${page}&include_adult=false`;
    const proxyUrl = `${PROXY_BASE}${encodeURIComponent(tmdbUrl)}`;
    
    const res = await axios.get(proxyUrl, {
      timeout: 20000, 
    });
    return res.data.results || [];
  } catch (err) {
    console.error(`  ⚠ Failed to fetch page ${page} for "${langCode}": ${err.message}`);
    return [];
  }
}

// ─── Main ────────────────────────────────────────────────────────
async function seedComedyRomance() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║  💕🎭 TMDB Seeder: Comedy & Romance Movies      ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');

  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env — aborting.');
    process.exit(1);
  }

  console.log('⏳ Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log('✅ MongoDB connected.\n');

  const existing = await Movie.find({ tmdbId: { $exists: true } }, 'tmdbId').lean();
  const existingIds = new Set(existing.map((m) => m.tmdbId));
  console.log(`📦 ${existingIds.size} movies already in database.\n`);

  const collected = []; 
  const seenIds = new Set([...existingIds]);

  for (const lang of LANGUAGES) {
    console.log(`\n🌐 Fetching ${lang.name} (${lang.code}) Comedy/Romance — pages 1–${PAGES_PER_LANGUAGE}...`);
    let langCount = 0;

    for (let page = 1; page <= PAGES_PER_LANGUAGE; page++) {
      const results = await fetchPage(lang.code, page);

      for (const movie of results) {
        if (seenIds.has(movie.id)) continue;
        if (!movie.poster_path || !movie.overview) continue;

        const genres = mapGenres(movie.genre_ids);
        // Fallback or guarantee it has comedy/romance mapped just in case
        if (genres.length === 0) genres.push('Comedy');

        const year = movie.release_date
          ? parseInt(movie.release_date.split('-')[0])
          : null;
        if (!year) continue;

        collected.push({
          tmdbId: movie.id,
          title: movie.title,
          overview: movie.overview,
          description: movie.overview,
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

    console.log(`  ✅ ${lang.name}: ${langCount} new Comedy/Romance movies collected.           `);
  }

  console.log(`\n🎯 Total specific movies collected: ${collected.length}\n`);

  if (collected.length === 0) {
    console.log('Nothing new to add — your database is already up to date!');
    await mongoose.disconnect();
    process.exit(0);
  }

  const BATCH_SIZE = 5; 
  let savedTotal = 0;
  let failedEmbeddings = 0;
  let skippedDuplicates = 0;

  console.log('⚙️  Generating embeddings & saving to MongoDB...\n');

  for (let i = 0; i < collected.length; i += BATCH_SIZE) {
    const batch = collected.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(collected.length / BATCH_SIZE);

    process.stdout.write(
      `  🔄 Batch ${batchNum}/${totalBatches} (${savedTotal} saved, ${failedEmbeddings} errors)...\r`
    );

    const embeddedResults = await Promise.allSettled(
      batch.map(async (movie) => {
        try {
          const embedding = await getMovieEmbedding(movie);
          return { ...movie, embedding };
        } catch (err) {
          failedEmbeddings++;
          return { ...movie, embedding: [] };
        }
      })
    );

    const moviesToSave = embeddedResults
      .filter((r) => r.status === 'fulfilled')
      .map((r) => r.value);

    for (const movie of moviesToSave) {
      try {
        await Movie.create(movie);
        savedTotal++;
      } catch (err) {
        if (err.code === 11000) {
          skippedDuplicates++;
        } else {
          console.error(`\n  ❌ Failed to save "${movie.title}": ${err.message}`);
        }
      }
    }

    await delay(300);
  }

  console.log('\n\n╔═══════════════════════════════════════════════════╗');
  console.log('║                  📊 SEED SUMMARY                  ║');
  console.log('╠═══════════════════════════════════════════════════╣');
  console.log(`║  🎬 Movies saved:        ${String(savedTotal).padStart(6)}                ║`);
  console.log(`║  ⏭️  Skipped (duplicate): ${String(skippedDuplicates).padStart(6)}                ║`);
  console.log(`║  ⚠️  Embedding failures:  ${String(failedEmbeddings).padStart(6)}                ║`);
  console.log('╚═══════════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  console.log('✅ Done! Database disconnected.');
  process.exit(0);
}

seedComedyRomance().catch((err) => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
