import 'dotenv/config';
import mongoose from 'mongoose';
import axios from 'axios';
import Movie from './models/Movie.js';
import { getMovieEmbedding } from './utils/embedding.js';

// ============ MASSIVE REAL MOVIE LISTS ============

const malayalamMovies = [
  // Classics & All-time Greats
  { title: "Drishyam", year: 2013 }, { title: "Premam", year: 2015 },
  { title: "Bangalore Days", year: 2014 }, { title: "Kumbalangi Nights", year: 2019 },
  { title: "Charlie", year: 2015 }, { title: "Ustad Hotel", year: 2012 },
  { title: "Lucifer", year: 2019 }, { title: "Pulimurugan", year: 2016 },
  { title: "Maheshinte Prathikaaram", year: 2016 },
  { title: "Angamaly Diaries", year: 2017 }, { title: "Take Off", year: 2017 },
  { title: "Trance", year: 2020 }, { title: "Ayyappanum Koshiyum", year: 2020 },
  { title: "Joji", year: 2021 }, { title: "The Great Indian Kitchen", year: 2021 },
  { title: "Nayattu", year: 2021 }, { title: "Minnal Murali", year: 2021 },
  { title: "Bheeshma Parvam", year: 2022 }, { title: "Hridayam", year: 2022 },
  { title: "Jana Gana Mana", year: 2022 }, { title: "Thallumaala", year: 2022 },
  { title: "Romancham", year: 2023 }, { title: "Manjummel Boys", year: 2024 },
  { title: "Aavesham", year: 2024 }, { title: "Bramayugam", year: 2024 },
  { title: "Premalu", year: 2024 }, { title: "Virus", year: 2019 },
  { title: "Helen", year: 2019 }, { title: "Kappela", year: 2020 },
  { title: "Joseph", year: 2018 }, { title: "Njan Prakashan", year: 2018 },
  { title: "Unda", year: 2019 }, { title: "Kurup", year: 2021 },
  { title: "Kaduva", year: 2022 }, { title: "Salt N Pepper", year: 2011 },
  { title: "Traffic", year: 2011 }, { title: "Vikramadithyan", year: 2014 },
  { title: "Ohm Shanthi Oshaana", year: 2014 }, { title: "1983", year: 2014 },
  { title: "Action Hero Biju", year: 2016 }, { title: "Guppy", year: 2016 },
  { title: "Godha", year: 2017 }, { title: "C U Soon", year: 2020 },
  { title: "Operation Java", year: 2021 }, { title: "Home", year: 2021 },
  { title: "Rorschach", year: 2022 }, { title: "RDX", year: 2023 },
  { title: "Kannur Squad", year: 2023 }, { title: "2018", year: 2023 },
  { title: "Turbo", year: 2024 }, { title: "Churuli", year: 2021 },
  { title: "Drishyam 2", year: 2021 }, { title: "Malik", year: 2021 },
  { title: "Dulquer Salmaan", year: 2012 }, { title: "Bangalore Days", year: 2014 },
  { title: "Amen", year: 2013 }, { title: "Shutter", year: 2012 },
  { title: "Diamond Necklace", year: 2012 }, { title: "22 Female Kottayam", year: 2012 },
  { title: "Annayum Rasoolum", year: 2013 },
  { title: "Munnariyippu", year: 2014 },
  { title: "Oru Mexican Aparatha", year: 2017 },
  // More popular Malayalam
  { title: "Varathan", year: 2018 }, { title: "Koode", year: 2018 },
  { title: "Kumbalangi Nights", year: 2019 }, { title: "Uyare", year: 2019 },
  { title: "Jallikattu", year: 2019 }, { title: "Moothon", year: 2019 },
  { title: "Kunjeldho", year: 2023 }, { title: "Kaathal The Core", year: 2023 },
  { title: "Nanpakal Nerathu Mayakkam", year: 2023 },
  { title: "Pachuvum Athbutha Vilakkum", year: 2023 },
  { title: "Thankam", year: 2023 }, { title: "Iratta", year: 2023 },
  { title: "Bro Daddy", year: 2022 }, { title: "Puzhu", year: 2022 },
  { title: "Pada", year: 2022 }, { title: "Ariyippu", year: 2022 },
  { title: "Saudi Vellakka", year: 2022 },
  { title: "Super Sharanya", year: 2022 }, { title: "Nna Thaan Case Kodu", year: 2022 },
  { title: "Mukundan Unni Associates", year: 2022 },
  { title: "Palthu Janwar", year: 2022 },
  { title: "Bhoothakaalam", year: 2022 },
  { title: "Meppadiyan", year: 2022 },
  { title: "Jo and Jo", year: 2022 },
  { title: "Forensic", year: 2020 },
  { title: "Maniyarayile Ashokan", year: 2020 },
  { title: "Halal Love Story", year: 2020 },
  { title: "Irul", year: 2021 },
  { title: "Cold Case", year: 2021 },
  { title: "Star", year: 2024 },
  { title: "Guruvayoor Ambalanadayil", year: 2024 },
  { title: "Kishkindha Kaandam", year: 2024 },
  { title: "The Goat Life", year: 2024 },
  { title: "Marco", year: 2024 },
  { title: "Ajayante Randam Moshanam", year: 2024 },
  { title: "Nunakuzhi", year: 2024 },
  { title: "Meiyazhagan", year: 2024 },
  { title: "Abraham Ozler", year: 2023 },
  { title: "Vaazha", year: 2024 },
  { title: "Level Cross", year: 2024 },
  { title: "Empuraan", year: 2025 },
  { title: "Ennu Ninte Moideen", year: 2015 },
  // Old classics
  { title: "CID Moosa", year: 2003 }, { title: "Kireedam", year: 1989 },
  { title: "Spadikam", year: 1995 }, { title: "Sandesam", year: 1991 },
  { title: "Nadodikattu", year: 1987 }, { title: "Punjabi House", year: 1998 },
  { title: "Rajamanikyam", year: 2005 }, { title: "Naran", year: 2005 },
  { title: "Pokkiri Raja", year: 2010 }, { title: "Christian Brothers", year: 2011 },
  { title: "Twenty 20", year: 2008 }, { title: "Hallo", year: 2007 },
  { title: "Manichitrathazhu", year: 1993 },
];

const englishMovies = [
  { title: "Inception", year: 2010 }, { title: "Interstellar", year: 2014 },
  { title: "The Dark Knight", year: 2008 }, { title: "The Matrix", year: 1999 },
  { title: "Pulp Fiction", year: 1994 }, { title: "Fight Club", year: 1999 },
  { title: "Forrest Gump", year: 1994 }, { title: "The Shawshank Redemption", year: 1994 },
  { title: "The Godfather", year: 1972 }, { title: "Gladiator", year: 2000 },
  { title: "Avengers Endgame", year: 2019 }, { title: "Spider-Man No Way Home", year: 2021 },
  { title: "Oppenheimer", year: 2023 }, { title: "Barbie", year: 2023 },
  { title: "Dune Part Two", year: 2024 }, { title: "The Batman", year: 2022 },
  { title: "Top Gun Maverick", year: 2022 }, { title: "Everything Everywhere All at Once", year: 2022 },
  { title: "Parasite", year: 2019 }, { title: "Joker", year: 2019 },
  { title: "John Wick Chapter 4", year: 2023 }, { title: "Guardians of the Galaxy Vol 3", year: 2023 },
  { title: "The Super Mario Bros Movie", year: 2023 }, { title: "Mission Impossible Dead Reckoning", year: 2023 },
  { title: "Killers of the Flower Moon", year: 2023 },
  { title: "Poor Things", year: 2023 }, { title: "Wonka", year: 2023 },
  { title: "Tenet", year: 2020 }, { title: "1917", year: 2019 },
  { title: "Knives Out", year: 2019 }, { title: "Once Upon a Time in Hollywood", year: 2019 },
  { title: "Whiplash", year: 2014 }, { title: "Mad Max Fury Road", year: 2015 },
  { title: "The Revenant", year: 2015 }, { title: "La La Land", year: 2016 },
  { title: "Get Out", year: 2017 }, { title: "Dunkirk", year: 2017 },
  { title: "A Quiet Place", year: 2018 }, { title: "Black Panther", year: 2018 },
  { title: "Bohemian Rhapsody", year: 2018 },
  { title: "Avengers Infinity War", year: 2018 },
  { title: "The Social Network", year: 2010 }, { title: "Gone Girl", year: 2014 },
  { title: "The Wolf of Wall Street", year: 2013 },
  { title: "Django Unchained", year: 2012 },
  { title: "Gravity", year: 2013 }, { title: "The Grand Budapest Hotel", year: 2014 },
  { title: "Fury", year: 2014 }, { title: "Sicario", year: 2015 },
  { title: "Deadpool", year: 2016 }, { title: "Doctor Strange", year: 2016 },
  { title: "Logan", year: 2017 }, { title: "Blade Runner 2049", year: 2017 },
  { title: "Ready Player One", year: 2018 }, { title: "Venom", year: 2018 },
  { title: "Us", year: 2019 }, { title: "Ford v Ferrari", year: 2019 },
  { title: "Jojo Rabbit", year: 2019 }, { title: "Uncut Gems", year: 2019 },
  { title: "Soul", year: 2020 }, { title: "The Invisible Man", year: 2020 },
  { title: "Free Guy", year: 2021 }, { title: "Dune", year: 2021 },
  { title: "No Time to Die", year: 2021 }, { title: "Shang-Chi", year: 2021 },
  { title: "The French Dispatch", year: 2021 }, { title: "Eternals", year: 2021 },
  { title: "Nope", year: 2022 }, { title: "The Menu", year: 2022 },
  { title: "Glass Onion", year: 2022 }, { title: "Black Adam", year: 2022 },
  { title: "Avatar The Way of Water", year: 2022 },
  { title: "Ant-Man and the Wasp Quantumania", year: 2023 },
  { title: "The Flash", year: 2023 }, { title: "Elemental", year: 2023 },
  { title: "Saw X", year: 2023 }, { title: "Napoleon", year: 2023 },
  { title: "Civil War", year: 2024 }, { title: "Deadpool and Wolverine", year: 2024 },
  { title: "Inside Out 2", year: 2024 }, { title: "Furiosa", year: 2024 },
  { title: "Alien Romulus", year: 2024 }, { title: "Gladiator II", year: 2024 },
  { title: "The Wild Robot", year: 2024 }, { title: "Wicked", year: 2024 },
  { title: "Moana 2", year: 2024 },
];

const tamilMovies = [
  { title: "Vikram", year: 2022 }, { title: "Kaithi", year: 2019 },
  { title: "Asuran", year: 2019 }, { title: "Vada Chennai", year: 2018 },
  { title: "Master", year: 2021 }, { title: "Super Deluxe", year: 2019 },
  { title: "96", year: 2018 }, { title: "Ratsasan", year: 2018 },
  { title: "Theri", year: 2016 }, { title: "Mersal", year: 2017 },
  { title: "Soorarai Pottru", year: 2020 }, { title: "Jai Bhim", year: 2021 },
  { title: "Doctor", year: 2021 }, { title: "Beast", year: 2022 },
  { title: "Ponniyin Selvan", year: 2022 }, { title: "Vikram Vedha", year: 2017 },
  { title: "Karnan", year: 2021 }, { title: "Mandela", year: 2021 },
  { title: "Sarpatta Parambarai", year: 2021 }, { title: "Maanaadu", year: 2021 },
  { title: "Annaatthe", year: 2021 }, { title: "Etharkkum Thunindhavan", year: 2022 },
  { title: "Don", year: 2022 }, { title: "Kaathuvaakula Rendu Kaadhal", year: 2022 },
  { title: "Thiruchitrambalam", year: 2022 }, { title: "Cobra", year: 2022 },
  { title: "Vendhu Thanindhathu Kaadu", year: 2022 },
  { title: "Iravin Nizhal", year: 2022 }, { title: "Jailer", year: 2023 },
  { title: "Leo", year: 2023 }, { title: "Jawan", year: 2023 },
  { title: "Indian 2", year: 2024 }, { title: "GOAT", year: 2024 },
  { title: "Vettaiyan", year: 2024 }, { title: "Amaran", year: 2024 },
  { title: "Kanguva", year: 2024 }, { title: "Viduthalai", year: 2023 },
  { title: "Merry Christmas", year: 2024 }, { title: "Lal Salaam", year: 2024 },
  { title: "Aranmanai 4", year: 2024 },
];

const genreGuess = (title, lang) => {
  const t = title.toLowerCase();
  const genres = [];
  if (t.includes('love') || t.includes('romance') || t.includes('heart') || t.includes('kadhal')) genres.push('Romance');
  if (t.includes('war') || t.includes('fight') || t.includes('fury') || t.includes('action') || t.includes('squad')) genres.push('Action');
  if (t.includes('comedy') || t.includes('fun') || t.includes('funny')) genres.push('Comedy');
  if (genres.length === 0) genres.push('Drama');
  if (lang === 'English' && !genres.includes('Action')) genres.push('Action');
  return genres;
};

async function rebuildDatabase() {
  try {
    console.log("Connecting DB...");
    await mongoose.connect(process.env.MONGO_URI);

    // Step 1: Delete ALL existing movies
    console.log("🗑️ Deleting ALL existing movies...");
    await Movie.deleteMany({});
    console.log("Deleted.\n");

    // Step 2: Fetch from OMDB and only keep movies WITH posters
    const allLists = [
      ...malayalamMovies.map(m => ({ ...m, language: 'Malayalam' })),
      ...englishMovies.map(m => ({ ...m, language: 'English' })),
      ...tamilMovies.map(m => ({ ...m, language: 'Tamil' })),
    ];

    // Deduplicate by title
    const seen = new Set();
    const uniqueList = allLists.filter(m => {
      const key = m.title.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`📋 Total unique titles to check: ${uniqueList.length}\n`);

    const validMovies = [];

    for (let i = 0; i < uniqueList.length; i++) {
      const { title, year, language } = uniqueList[i];
      try {
        const params = { t: title, apikey: 'thewdb' };
        if (year) params.y = year;

        const res = await axios.get('http://www.omdbapi.com/', { params, timeout: 5000 });

        if (res.data && res.data.Response === "True" && res.data.Poster && res.data.Poster !== "N/A") {
          const omdbGenres = res.data.Genre ? res.data.Genre.split(', ') : genreGuess(title, language);
          const omdbYear = parseInt(res.data.Year) || year;
          
          validMovies.push({
            tmdbId: 10000 + i,
            title: res.data.Title || title,
            genres: omdbGenres,
            overview: res.data.Plot || `${title} is a ${language} film.`,
            description: res.data.Plot || `${title} is a ${language} film.`,
            language: language,
            release_date: `${omdbYear}-01-01`,
            year: omdbYear,
            poster: res.data.Poster,
            isFeatured: validMovies.length < 100,
          });
          console.log(`✅ [${i}] ${title} → ${res.data.Title} (${res.data.Year}) POSTER FOUND`);
        } else {
          // Try without year
          const res2 = await axios.get('http://www.omdbapi.com/', { 
            params: { t: title, apikey: 'thewdb' }, timeout: 5000 
          });
          if (res2.data && res2.data.Response === "True" && res2.data.Poster && res2.data.Poster !== "N/A") {
            const omdbGenres = res2.data.Genre ? res2.data.Genre.split(', ') : genreGuess(title, language);
            const omdbYear = parseInt(res2.data.Year) || year;
            
            validMovies.push({
              tmdbId: 10000 + i,
              title: res2.data.Title || title,
              genres: omdbGenres,
              overview: res2.data.Plot || `${title} is a ${language} film.`,
              description: res2.data.Plot || `${title} is a ${language} film.`,
              language: language,
              release_date: `${omdbYear}-01-01`,
              year: omdbYear,
              poster: res2.data.Poster,
              isFeatured: validMovies.length < 100,
            });
            console.log(`✅ [${i}] ${title} → ${res2.data.Title} (no year) POSTER FOUND`);
          } else {
            console.log(`❌ [${i}] ${title} → SKIPPED (no poster)`);
          }
        }
      } catch (err) {
        console.log(`❌ [${i}] ${title} → ERROR: ${err.message}`);
      }

      await new Promise(r => setTimeout(r, 200));

      if (i > 0 && i % 50 === 0) {
        console.log(`\n--- Progress: ${i}/${uniqueList.length} checked, ${validMovies.length} with posters ---\n`);
      }
    }

    console.log(`\n📦 Total valid movies with OMDB posters: ${validMovies.length}`);
    console.log(`Starting embedding generation...\n`);

    // Step 3: Generate embeddings and insert
    const batchSize = 10;
    let savedCount = 0;

    for (let i = 0; i < validMovies.length; i += batchSize) {
      const batch = validMovies.slice(i, i + batchSize);
      console.log(`Embedding batch ${Math.floor(i/batchSize)+1} of ${Math.ceil(validMovies.length/batchSize)}...`);

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
      console.log(`✅ Saved ${savedCount}/${validMovies.length} movies`);
    }

    console.log(`\n🎉 DONE! Database rebuilt with ${savedCount} movies, ALL with real OMDB posters!`);
    process.exit(0);
  } catch(e) {
    console.error("Script crashed:", e);
    process.exit(1);
  }
}

rebuildDatabase();
