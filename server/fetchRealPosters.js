import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Movie from './models/Movie.js';

async function fetchRealPosters() {
  try {
    console.log("Connecting DB...");
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("Fetching all movies...");
    const movies = await Movie.find({});
    console.log(`Found ${movies.length} movies. Fetching real posters from OMDB...`);

    let updatedCount = 0;
    
    // Sequential fetching to avoid angering OMDB rate limits
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      // Skip if it's a generic padded title
      if (movie.title.includes("Cinema Classic Part") || 
          movie.title.includes("Blockbuster Part") || 
          movie.title.includes("Action Part")) {
        continue;
      }
      
      try {
        const res = await axios.get('http://www.omdbapi.com/', {
          params: { t: movie.title, apikey: 'thewdb' },
          timeout: 4000
        });

        if (res.data && res.data.Poster && res.data.Poster !== "N/A") {
          movie.poster = res.data.Poster;
          await movie.save();
          updatedCount++;
        }
      } catch (err) {
        console.warn(`Failed to fetch OMDB poster for ${movie.title}: ${err.message}`);
      }
      
      // Sleep a bit
      await new Promise(r => setTimeout(r, 150));
      
      if (i > 0 && i % 50 === 0) {
        console.log(`Processed ${i} movies... Updated ${updatedCount} real posters so far.`);
      }
    }

    console.log(`✅ Finished! Patched ${updatedCount} movies with real OMDB posters!`);
    process.exit(0);
  } catch(e) {
    console.error("Script crashed: ", e);
    process.exit(1);
  }
}

fetchRealPosters();
