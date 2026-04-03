import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Movie from './models/Movie.js';
import { getMovieEmbedding } from './utils/embedding.js';

const moreEnglishMovies = [
  "Avatar", "Titanic", "Star Wars: Episode IV - A New Hope", "Jurassic Park",
  "The Lord of the Rings: The Fellowship of the Ring", "Harry Potter and the Sorcerer's Stone",
  "The Avengers", "Black Panther", "The Lion King", "Frozen",
  "The Dark Knight Rises", "Toy Story", "Finding Nemo", "The Incredibles",
  "Up", "Wall-E", "Spider-Man: Into the Spider-Verse", "Iron Man",
  "Captain America: The Winter Soldier", "Thor: Ragnarok", "Guardians of the Galaxy",
  "Wonder Woman", "Aquaman", "The Batman", "Joker",
  "Deadpool", "Logan", "X-Men: Days of Future Past", "Mad Max: Fury Road",
  "Blade Runner 2049", "The Martian", "Interstellar", "Inception",
  "The Prestige", "Memento", "Dunkirk", "Tenet",
  "The Truman Show", "Eternal Sunshine of the Spotless Mind", "Her",
  "Ex Machina", "Arrival", "Gravity", "A Quiet Place",
  "Get Out", "Us", "Nope", "Parasite",
  "Knives Out", "Glass Onion", "The Grand Budapest Hotel", "The Shape of Water",
  "Spotlight", "Moonlight", "Birdman", "12 Years a Slave",
  "Argo", "The King's Speech", "Slumdog Millionaire", "No Country for Old Men",
  "The Departed", "Crash", "Million Dollar Baby", "The Lord of the Rings: The Return of the King",
  "Chicago", "A Beautiful Mind", "Gladiator", "American Beauty"
];

async function add50English() {
  try {
    console.log("Connecting DB...");
    await mongoose.connect(process.env.MONGO_URI);

    // Get current ID offset to avoid duplicates
    const highestIdMovie = await Movie.findOne().sort('-tmdbId');
    let startId = highestIdMovie ? highestIdMovie.tmdbId + 50 : 20000;

    const validMovies = [];
    
    console.log("Checking OMDB for real posters...");
    
    // Check OMDB until we collect exactly 50 valid ones
    for (let i = 0; i < moreEnglishMovies.length; i++) {
      if (validMovies.length >= 50) break;
      
      const title = moreEnglishMovies[i];
      try {
        const res = await axios.get('http://www.omdbapi.com/', { 
          params: { t: title, apikey: 'thewdb' }, 
          timeout: 4000 
        });

        if (res.data && res.data.Response === "True" && res.data.Poster && res.data.Poster !== "N/A") {
          
          validMovies.push({
            tmdbId: startId + i,
            title: res.data.Title,
            genres: res.data.Genre ? res.data.Genre.split(', ') : ["Drama"],
            overview: res.data.Plot || `${res.data.Title} is an English film.`,
            description: res.data.Plot || `${res.data.Title} is an English film.`,
            language: 'English',
            release_date: `${res.data.Year}-01-01`,
            year: parseInt(res.data.Year) || 2010,
            poster: res.data.Poster,
            isFeatured: false, // Don't crowd the featured feed too much
          });
          console.log(`✅ [${validMovies.length}/50] ${res.data.Title} poster found.`);
        } else {
          console.log(`❌ Skipped: ${title} (No OMDB poster)`);
        }
      } catch (err) {
        console.log(`❌ Skipped: ${title} (OMDB Fetch error)`);
      }
      
      // Sleep to prevent rate-limiting
      await new Promise(r => setTimeout(r, 150));
    }

    console.log(`\nCollected ${validMovies.length} valid English movies. Starting embeddings...\n`);

    const batchSize = 10;
    let savedCount = 0;

    for (let i = 0; i < validMovies.length; i += batchSize) {
      const batch = validMovies.slice(i, i + batchSize);
      console.log(`Embedding batch ${Math.floor(i/batchSize)+1}...`);

      const embeddedBatch = await Promise.allSettled(
        batch.map(async (movie) => {
          try {
            const embedding = await getMovieEmbedding(movie);
            return { ...movie, embedding };
          } catch (err) {
            return { ...movie, embedding: [] };
          }
        })
      );

      const resolved = embeddedBatch.filter(r => r.status === 'fulfilled').map(r => r.value);
      const docs = await Movie.insertMany(resolved);
      savedCount += docs.length;
      console.log(`✅ Saved ${savedCount}/${validMovies.length} movies to MongoDB.`);
    }

    console.log(`\n🎉 DONE! Added ${savedCount} new English movies with verified OMDB posters to your database.`);
    process.exit(0);

  } catch(e) {
    console.error("Script crashed: ", e);
    process.exit(1);
  }
}

add50English();
