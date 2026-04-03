import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

async function clearGhostFeeds() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Resetting all old user feeds since the movie DB was wiped and IDs changed...");
  
  await User.updateMany({}, {
    $set: {
      selectedMovies: [],
      preferences: { genres: [], languages: [] }
    }
  });

  console.log("Done! Users will do a quick onboarding to pick new valid movies.");
  process.exit(0);
}
clearGhostFeeds();
