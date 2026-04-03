import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

async function checkBrokenPosters() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const movies = await Movie.find({});
    
    const broken = movies.filter(m => {
      // Skip padded titles
      if (m.title.includes("Cinema Classic Part") || 
          m.title.includes("Blockbuster Part") || 
          m.title.includes("Action Part")) return false;
      
      // Check if poster is a placeholder or missing
      return !m.poster || 
             m.poster.includes('placehold') || 
             m.poster.includes('placeholder') ||
             m.poster === '';
    });

    console.log(`\n=== ${broken.length} REAL movies still missing posters ===\n`);
    broken.forEach(m => {
      console.log(`  - "${m.title}" (${m.language}, ${m.year}) → ${m.poster || 'NO POSTER'}`);
    });

    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

checkBrokenPosters();
