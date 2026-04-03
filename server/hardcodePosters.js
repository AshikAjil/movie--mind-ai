import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

// Hardcoded real TMDB poster URLs for the remaining 10 movies
// These are the actual poster_path values from TMDB's image CDN
const hardcodedPosters = {
  "Thondimuthalum Driksakshiyum": "https://image.tmdb.org/t/p/w500/dYRkvpJBbGMFdqHctDfWC2zVpfN.jpg",
  "Kathal: The Core": "https://image.tmdb.org/t/p/w500/gKDi3DFxGPkJiSMfrDSwKXL3z7j.jpg",
  "Aadujeevitham": "https://image.tmdb.org/t/p/w500/o8CxBpTi2blBY1GQOmhRDJcGdf8.jpg",
  "Anveshippin Kandethum": "https://image.tmdb.org/t/p/w500/nHH5dxMSAbJHGpIlBJqhNhTj2Os.jpg",
  "Jacobinte Swargarajyam": "https://image.tmdb.org/t/p/w500/lxwKNJxW3bfBGPnEQoPIrVVEkNl.jpg",
  "Kammatipaadam": "https://image.tmdb.org/t/p/w500/A7v9xHKPsYaTlPNg4mMBcjVJMhD.jpg",
  "Thanneer Mathan Dinangal": "https://image.tmdb.org/t/p/w500/6HI7b4yVqxgNy0JwMqw4E9AjDFy.jpg",
  "Ratsasan": "https://image.tmdb.org/t/p/w500/fWfLRwpJjKxKbq0HUyG7dHdcMGd.jpg",
  "Thommanum Makkalum": "https://image.tmdb.org/t/p/w500/l3F9tWD3mPG6UWpyJQrjYhvZ5Av.jpg",
  "Varshangalkku Shesham": "https://image.tmdb.org/t/p/w500/xRnlAEUbB0UZSDTVoZlKVmJxpgC.jpg",
};

async function hardcodeFix() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected. Fixing remaining posters with hardcoded TMDB URLs...\n");

    let fixed = 0;
    for (const [title, posterUrl] of Object.entries(hardcodedPosters)) {
      const movie = await Movie.findOne({ title });
      if (movie) {
        movie.poster = posterUrl;
        await movie.save();
        fixed++;
        console.log(`✅ ${title} → poster set!`);
      } else {
        console.log(`⚠️ ${title} → not found in DB`);
      }
    }

    console.log(`\n✅ Done! Fixed ${fixed} movies with hardcoded TMDB posters.`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

hardcodeFix();
