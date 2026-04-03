import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

async function fixNNMPoster() {
  await mongoose.connect(process.env.MONGO_URI);
  const m = await Movie.findOne({ title: /Nanpakal Nerathu Mayakkam/i });
  if (m) {
    // Overwrite the dead Amazon CDN link with a clean custom placeholder
    m.poster = "https://placehold.co/300x450/2E0854/FFF?text=Nanpakal+Nerathu+Mayakkam";
    await m.save();
    console.log("Successfully fixed the poster for Nanpakal Nerathu Mayakkam!");
  }
  process.exit(0);
}

fixNNMPoster();
