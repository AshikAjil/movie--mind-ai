import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

async function checkPosters() {
  await mongoose.connect(process.env.MONGO_URI);
  const movies = await Movie.find().limit(5);
  movies.forEach(m => console.log(m.title, '->', m.poster));
  process.exit(0);
}
checkPosters();
