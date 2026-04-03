import 'dotenv/config';
import mongoose from 'mongoose';
import Movie from './models/Movie.js';

async function listBroken() {
  await mongoose.connect(process.env.MONGO_URI);
  const movies = await Movie.find({});
  const broken = movies.filter(m => {
    if (m.title.includes('Cinema Classic Part') || 
        m.title.includes('Blockbuster Part') || 
        m.title.includes('Action Part')) return false;
    return !m.poster || m.poster.includes('placehold') || m.poster === '';
  });
  console.log("BROKEN COUNT:", broken.length);
  broken.forEach(m => console.log(`${m.title} | ${m.language} | ${m.year}`));
  process.exit(0);
}
listBroken();
