import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

async function cleanupBrokenMovies() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find all movies that either:
    // 1. Have no poster
    // 2. Have a placehold.co or placeholder.com link
    // 3. Have "N/A"
    const moviesToDelete = await Movie.find({
      $or: [
        { poster: null },
        { poster: '' },
        { poster: 'N/A' },
        { poster: { $regex: /placehold/i } }
      ]
    });

    if (moviesToDelete.length === 0) {
      console.log("No movies found with broken/placeholder posters.");
    } else {
      console.log(`Found ${moviesToDelete.length} movies with placeholder/broken posters. Deleting them now...`);
      
      let deletedCount = 0;
      for (const movie of moviesToDelete) {
        console.log(`🗑️ Deleting: ${movie.title} (${movie.language}, ${movie.year})`);
        await Movie.findByIdAndDelete(movie._id);
        deletedCount++;
      }
      
      console.log(`✅ Successfully removed ${deletedCount} movies from the database!`);
    }

    process.exit(0);
  } catch(e) {
    console.error("Script crashed: ", e);
    process.exit(1);
  }
}

cleanupBrokenMovies();
