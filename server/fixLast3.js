import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

const lastFixes = {
  "Oru Vadakkan Veeragatha": "https://image.tmdb.org/t/p/w500/rD1KqrZxVMjLHkJC7B7eBrDCZB8.jpg",
  "Nadodikattu": "https://image.tmdb.org/t/p/w500/vKGUkwx3itRajyFDBqLO8z0LRWX.jpg",
  "Android Kunjappan Version 5.25": "https://image.tmdb.org/t/p/w500/6bCapxGlmnpDuMQhvBhJyEKuiiP.jpg",
};

async function fixLast() {
  await mongoose.connect(process.env.MONGO_URI);
  let fixed = 0;
  for (const [title, posterUrl] of Object.entries(lastFixes)) {
    const movie = await Movie.findOne({ title });
    if (movie) {
      movie.poster = posterUrl;
      await movie.save();
      fixed++;
      console.log(`✅ ${title} → poster set!`);
    }
  }
  console.log(`\nDone! Fixed ${fixed} movies.`);
  process.exit(0);
}
fixLast();
