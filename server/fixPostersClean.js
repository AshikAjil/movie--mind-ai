import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

async function fixPostersClean() {
  try {
    console.log("Connecting DB...");
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("Fetching all movies...");
    const movies = await Movie.find({});
    console.log(`Found ${movies.length} movies. Restoring clean placeholders...`);

    let updatedCount = 0;
    
    for (const movie of movies) {
      // Split the title and wrap it if it's too long nicely
      const cleanTitle = encodeURIComponent(movie.title);
      // Let's use a nice dark gradient color or simple dark background
      // 141122 is a nice dark violet/black. Text is white.
      let newPosterURL = `https://placehold.co/300x450/1c1829/c4b5fd?text=${cleanTitle}`;
      
      // If it's English movies, use slightly different tint
      if (movie.language === 'English') {
        newPosterURL = `https://placehold.co/300x450/111827/93c5fd?text=${cleanTitle}`;
      } else if (movie.language === 'Tamil') {
        newPosterURL = `https://placehold.co/300x450/271c19/fdba74?text=${cleanTitle}`;
      }

      if (movie.poster !== newPosterURL) {
        movie.poster = newPosterURL;
        await movie.save();
        updatedCount++;
      }
    }

    console.log(`✅ Finished! Restored ${updatedCount} cleanly formatted placeholders!`);
    process.exit(0);
  } catch(e) {
    console.error("Script crashed: ", e);
    process.exit(1);
  }
}

fixPostersClean();
