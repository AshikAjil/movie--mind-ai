import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Movie from './models/Movie.js';
import { getMovieEmbedding } from './utils/embedding.js';

const extraTamil = [
  "Ponniyin Selvan", "Vikram Vedha", "Karnan", "Mandela", "Sarpatta Parambarai",
  "Maanaadu", "Annaatthe", "Etharkkum Thunindhavan", "Don", "Kaathuvaakula Rendu Kaadhal",
  "Thiruchitrambalam", "Cobra", "Vendhu Thanindhathu Kaadu", "Iravin Nizhal", "Jailer",
  "Leo", "Jawan", "Indian 2", "GOAT", "Vettaiyan"
];

const extraEnglish = [
  "Catch Me If You Can", "Shutter Island", "The Departed", "The Green Mile", "Se7en",
  "The Silence of the Lambs", "Saving Private Ryan", "Schindler's List", "Goodfellas", "12 Angry Men",
  "The Lion King", "Back to the Future", "Whiplash", "Gladiator", "The Prestige",
  "The Terminator", "Alien", "Die Hard", "The Sixth Sense", "Jaws",
  "Jurassic Park", "Braveheart", "Rocky", "Blade Runner", "The Shining",
  "E.T. the Extra-Terrestrial", "Indiana Jones and the Raiders of the Lost Ark", "The Exorcist", "A Clockwork Orange", "Taxi Driver"
];

async function addBatch() {
  try {
    console.log("Connecting DB...");
    await mongoose.connect(process.env.MONGO_URI);

    // Get current ID offset to avoid duplicates
    const highestIdMovie = await Movie.findOne().sort('-tmdbId');
    let startId = highestIdMovie ? highestIdMovie.tmdbId + 50 : 25000;

    const allExisting = await Movie.find({}, 'title');
    const existingTitles = new Set(allExisting.map(m => m.title.toLowerCase()));

    const targets = [
      ...extraTamil.map(t => ({ title: t, language: 'Tamil' })),
      ...extraEnglish.map(t => ({ title: t, language: 'English' }))
    ];

    const validMovies = [];
    
    console.log(`Checking OMDB for real posters for ${targets.length} movies...`);
    
    for (let i = 0; i < targets.length; i++) {
      const { title, language } = targets[i];
      if (existingTitles.has(title.toLowerCase())) continue; // Skip duplicates
      
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
            overview: res.data.Plot || `${res.data.Title} is a ${language} film.`,
            description: res.data.Plot || `${res.data.Title} is a ${language} film.`,
            language: language,
            release_date: `${res.data.Year}-01-01`,
            year: parseInt(res.data.Year) || 2015,
            poster: res.data.Poster,
            isFeatured: false,
          });
          console.log(`✅ [${validMovies.length}] ${language}: ${res.data.Title}`);
        }
      } catch (err) {
        console.log(`❌ Skipped: ${title} (OMDB Fetch error)`);
      }
      
      await new Promise(r => setTimeout(r, 150));
    }

    console.log(`\nCollected ${validMovies.length} valid movies. Starting embeddings...\n`);

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

    console.log(`\n🎉 DONE! Added ${savedCount} new movies.`);
    process.exit(0);

  } catch(e) {
    console.error("Script crashed: ", e);
    process.exit(1);
  }
}

addBatch();
