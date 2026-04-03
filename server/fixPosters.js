import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

async function fixPosters() {
  try {
    console.log("Connecting DB...");
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("Fetching all movies...");
    const movies = await Movie.find({});
    console.log(`Found ${movies.length} movies. Updating posters...`);

    let updatedCount = 0;
    for (const movie of movies) {
      // Use placehold.co with a lovely purple background
      // Format text properly by replacing spaces with +
      let cleanTitle = movie.title.substring(0, 25).trim().replace(/\s+/g, '+');
      const newPosterURL = `https://placehold.co/300x450/4B0082/FFF?text=${cleanTitle}`;

      if (movie.poster !== newPosterURL) {
        movie.poster = newPosterURL;
        await movie.save();
        updatedCount++;
      }
    }

    console.log(`✅ Successfully updated ${updatedCount} movie posters!`);
    process.exit(0);
  } catch(e) {
    console.error("Script crashed: ", e);
    process.exit(1);
  }
}

fixPosters();
