import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

async function checkNNM() {
  await mongoose.connect(process.env.MONGO_URI);
  const m = await Movie.findOne({ title: /Nanpakal Nerathu Mayakkam/i });
  if (m) {
    console.log("Title in DB:", m.title);
    console.log("Poster in DB:", m.poster);
  } else {
    console.log("Movie not found in DB.");
  }
  process.exit(0);
}

checkNNM();
