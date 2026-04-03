import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

async function deleteSpecific() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const titlesToRemove = ["Kunjeldho", "Home", "Operation Java"];
    
    console.log(`Searching for: ${titlesToRemove.join(", ")}`);
    
    let deletedCount = 0;
    
    for (const exactTitle of titlesToRemove) {
      // Find the movie (case-insensitive just in case)
      const movie = await Movie.findOne({ title: new RegExp(`^${exactTitle}$`, 'i') });
      
      if (movie) {
        console.log(`🗑️ Found & Deleting: ${movie.title}`);
        await Movie.findByIdAndDelete(movie._id);
        deletedCount++;
      } else {
        console.log(`⚠️ Movie not found in DB: ${exactTitle}`);
      }
    }
    
    console.log(`✅ Successfully removed ${deletedCount} specific movies from the database!`);
    process.exit(0);

  } catch(e) {
    console.error("Script crashed: ", e);
    process.exit(1);
  }
}

deleteSpecific();
