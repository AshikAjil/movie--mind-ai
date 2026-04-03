import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';
import { generateMovies } from './utils/datasetGenerator.js';
import { getMovieEmbedding } from './utils/embedding.js';

async function runSeeder() {
  try {
    console.log("Connecting DB...");
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log('🗑️  Deleting existing movies...');
    await Movie.deleteMany({});

    const movies = await generateMovies();
    console.log(`📦  Generated ${movies.length} movies. Starting embedding (this may take a few mins)...`);

    const batchSize = 10;
    const savedMovies = [];

    for (let i = 0; i < movies.length; i += batchSize) {
      const batch = movies.slice(i, i + batchSize);
      console.log(`Processing batch ${i/batchSize + 1} of ${Math.ceil(movies.length/batchSize)}`);

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
      
      console.log(`✅  Progress: ${savedMovies.length}/${movies.length} movies saved`);
    }

    console.log(`Successfully seeded ${savedMovies.length} movies!`);
    process.exit(0);
  } catch(e) {
    console.error("Seeder script crashed: ", e);
    process.exit(1);
  }
}

runSeeder();
