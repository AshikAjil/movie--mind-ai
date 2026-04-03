import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Movie from './models/Movie.js';

// Manual poster fixes - using alternate OMDB search terms or direct known poster URLs
const manualFixes = {
  "Manichitrathazhu": { search: "Manichithrathazhu", year: 1993 },
  "Thondimuthalum Driksakshiyum": { search: "Thondimuthalum Driksakshiyum", year: 2017 },
  "Kathal: The Core": { search: "Kathal The Core", year: 2023 },
  "Aadujeevitham": { search: "The Goat Life", year: 2024 },
  "Anveshippin Kandethum": { search: "Anveshippin Kandethum", year: 2024 },
  "Thommanum Makkalum": { search: "Thommanum Makkalum", year: 2006 },
  "Jacobinte Swargarajyam": { search: "Jacobinte Swargarajyam", year: 2016 },
  "Kammatipaadam": { search: "Kammatipaadam", year: 2016 },
  "Mayanadhi": { search: "Mayaanadhi", year: 2017 },
  "Thanneer Mathan Dinangal": { search: "Thanneer Mathan Dinangal", year: 2019 },
  "Ratsasan": { search: "Ratsasan", year: 2018 },
};

async function fixRemaining() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const movies = await Movie.find({});
    
    const broken = movies.filter(m => {
      if (m.title.includes('Cinema Classic Part') || 
          m.title.includes('Blockbuster Part') || 
          m.title.includes('Action Part')) return false;
      return !m.poster || m.poster.includes('placehold') || m.poster === '';
    });

    console.log(`Fixing ${broken.length} movies with missing posters...\n`);
    let fixed = 0;

    for (const movie of broken) {
      const fix = manualFixes[movie.title];
      const searchTitle = fix ? fix.search : movie.title;
      const searchYear = fix ? fix.year : undefined;
      
      try {
        // Try OMDB with alternate name
        const params = { t: searchTitle, apikey: 'thewdb' };
        if (searchYear) params.y = searchYear;
        
        const res = await axios.get('http://www.omdbapi.com/', { params, timeout: 5000 });
        
        if (res.data && res.data.Poster && res.data.Poster !== "N/A") {
          movie.poster = res.data.Poster;
          await movie.save();
          fixed++;
          console.log(`✅ ${movie.title} → ${res.data.Title} (${res.data.Year}) poster found!`);
        } else {
          // Try without year constraint
          const res2 = await axios.get('http://www.omdbapi.com/', { 
            params: { t: searchTitle, apikey: 'thewdb' }, timeout: 5000 
          });
          if (res2.data && res2.data.Poster && res2.data.Poster !== "N/A") {
            movie.poster = res2.data.Poster;
            await movie.save();
            fixed++;
            console.log(`✅ ${movie.title} → ${res2.data.Title} (${res2.data.Year}) poster found (no year)!`);
          } else {
            // Try OMDB search API as last resort
            const res3 = await axios.get('http://www.omdbapi.com/', {
              params: { s: searchTitle, apikey: 'thewdb' }, timeout: 5000
            });
            if (res3.data && res3.data.Search && res3.data.Search.length > 0) {
              const best = res3.data.Search[0];
              if (best.Poster && best.Poster !== "N/A") {
                movie.poster = best.Poster;
                await movie.save();
                fixed++;
                console.log(`✅ ${movie.title} → ${best.Title} (${best.Year}) poster found (search)!`);
              } else {
                console.log(`❌ ${movie.title} → no poster available anywhere`);
              }
            } else {
              console.log(`❌ ${movie.title} → not found in OMDB at all`);
            }
          }
        }
      } catch (err) {
        console.log(`❌ ${movie.title} → error: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`\n✅ Fixed ${fixed}/${broken.length} remaining movies!`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

fixRemaining();
