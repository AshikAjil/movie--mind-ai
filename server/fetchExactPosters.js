import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Movie from './models/Movie.js';

// Hardcoded year hints for accurate OMDB matching
const yearHints = {
  "Drishyam": 2013, "Premam": 2015, "Bangalore Days": 2014, "Kumbalangi Nights": 2019,
  "Manichitrathazhu": 1993, "Lucifer": 2019, "Pulimurugan": 2016, "Charlie": 2015,
  "Maheshinte Prathikaaram": 2016, "Ustad Hotel": 2012, "Kireedam": 1989,
  "Thondimuthalum Driksakshiyum": 2017, "Ennu Ninte Moideen": 2015,
  "Sudani from Nigeria": 2018, "Angamaly Diaries": 2017,
  "Oru Vadakkan Veeragatha": 1989, "Spadikam": 1995, "Nadodikattu": 1987,
  "Sandesam": 1991, "Take Off": 2017, "Njan Prakashan": 2018, "Trance": 2020,
  "Android Kunjappan Version 5.25": 2019, "Ayyappanum Koshiyum": 2020, "Kappela": 2020,
  "Helen": 2019, "Joji": 2021, "The Great Indian Kitchen": 2021, "Nayattu": 2021,
  "Minnal Murali": 2021, "C U Soon": 2020, "Bheeshma Parvam": 2022,
  "Jana Gana Mana": 2022, "Hridayam": 2022, "Thallumaala": 2022,
  "Rorschach": 2022, "Nna Thaan Case Kodu": 2022, "Mukundan Unni Associates": 2022,
  "Romancham": 2023, "2018": 2023, "RDX": 2023, "Kannur Squad": 2023,
  "Kathal: The Core": 2023, "Kaathal": 2023, "Manjummel Boys": 2024,
  "Aavesham": 2024, "Bramayugam": 2024, "Premalu": 2024, "Aadujeevitham": 2024,
  "Anveshippin Kandethum": 2024, "Varshangalkku Shesham": 2024, "Turbo": 2024,
  "Vasanthi": 2023, "Kuttavum Shikshayum": 2022, "Churuli": 2021,
  "Super Sharanya": 2022, "Bhoothakaalam": 2022, "Meppadiyan": 2022,
  "Jo and Jo": 2022, "Kaduva": 2022, "Kalyanaraman": 2002, "CID Moosa": 2003,
  "Punjabi House": 1998, "Thommanum Makkalum": 2006, "Chathikkatha Chanthu": 2004,
  "Twenty:20": 2008, "Christian Brothers": 2011, "Pokkiri Raja": 2010,
  "Rajamanikyam": 2005, "Hallo": 2007, "Naran": 2005,
  "Chinthavishtayaya Shyamala": 1998, "Ente Veedu Appuvinteyum": 2003,
  "Udayananu Tharam": 2005, "Traffic": 2011, "Salt N' Pepper": 2011,
  "22 Female Kottayam": 2012, "Diamond Necklace": 2012, "Annayum Rasoolum": 2013,
  "Amen": 2013, "Shutter": 2012, "Vikramadithyan": 2014,
  "Ohm Shanthi Oshaana": 2014, "1983": 2014, "Munnariyippu": 2014,
  "Iyobinte Pusthakam": 2014, "Action Hero Biju": 2016,
  "Jacobinte Swargarajyam": 2016, "Kammatipaadam": 2016, "Guppy": 2016,
  "Oru Mexican Aparatha": 2017, "Godha": 2017, "Mayanadhi": 2017,
  "Joseph": 2018, "Virus": 2019, "Unda": 2019,
  "Thanneer Mathan Dinangal": 2019, "Operation Java": 2021,
  "Home": 2021, "Kurup": 2021, "Palthu Janwar": 2022,
  // English
  "Inception": 2010, "Interstellar": 2014, "The Dark Knight": 2008,
  "The Matrix": 1999, "Pulp Fiction": 1994, "Fight Club": 1999,
  "Forrest Gump": 1994, "The Shawshank Redemption": 1994,
  "The Godfather": 1972, "Gladiator": 2000,
  // Tamil
  "Vikram": 2022, "Kaithi": 2019, "Asuran": 2019, "Vada Chennai": 2018,
  "Master": 2021, "Super Deluxe": 2019, "96": 2018, "Ratsasan": 2018,
  "Theri": 2016, "Mersal": 2017
};

async function fetchExactPosters() {
  try {
    console.log("Connecting DB...");
    await mongoose.connect(process.env.MONGO_URI);
    
    console.log("Fetching all movies...");
    const movies = await Movie.find({});
    console.log(`Found ${movies.length} movies. Fetching real posters from OMDB with year...`);

    let updatedCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < movies.length; i++) {
      const movie = movies[i];
      
      // Skip padded/generic titles
      if (movie.title.includes("Cinema Classic Part") || 
          movie.title.includes("Blockbuster Part") || 
          movie.title.includes("Action Part")) {
        continue;
      }
      
      const year = yearHints[movie.title];
      
      try {
        const params = { t: movie.title, apikey: 'thewdb' };
        if (year) params.y = year;
        
        const res = await axios.get('http://www.omdbapi.com/', {
          params,
          timeout: 5000
        });

        if (res.data && res.data.Poster && res.data.Poster !== "N/A") {
          movie.poster = res.data.Poster;
          await movie.save();
          updatedCount++;
          console.log(`✅ [${i}] ${movie.title} (${year || '?'}) → poster found`);
        } else {
          failedCount++;
          console.log(`⚠️ [${i}] ${movie.title} (${year || '?'}) → no poster in OMDB`);
        }
      } catch (err) {
        failedCount++;
        console.warn(`❌ [${i}] ${movie.title}: ${err.message}`);
      }
      
      // Small delay to respect rate limits
      await new Promise(r => setTimeout(r, 200));
      
      if (i > 0 && i % 50 === 0) {
        console.log(`\n--- Progress: ${i}/${movies.length} processed, ${updatedCount} posters found ---\n`);
      }
    }

    console.log(`\n✅ Done! Updated ${updatedCount} movies with real posters. ${failedCount} failed.`);
    process.exit(0);
  } catch(e) {
    console.error("Script crashed: ", e);
    process.exit(1);
  }
}

fetchExactPosters();
