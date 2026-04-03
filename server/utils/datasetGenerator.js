import mongoose from 'mongoose';

const malayalamTitles = [
  "Drishyam", "Premam", "Bangalore Days", "Kumbalangi Nights", "Manichitrathazhu",
  "Lucifer", "Pulimurugan", "Charlie", "Maheshinte Prathikaaram", "Ustad Hotel",
  "Kireedam", "Thondimuthalum Driksakshiyum", "Ennu Ninte Moideen", "Sudani from Nigeria", "Angamaly Diaries",
  "Oru Vadakkan Veeragatha", "Spadikam", "Nadodikattu", "Sandesam", "Take Off",
  "Njan Prakashan", "Trance", "Android Kunjappan Version 5.25", "Ayyappanum Koshiyum", "Kappela",
  "Helen", "Joji", "The Great Indian Kitchen", "Nayattu", "Minnal Murali",
  "C U Soon", "Bheeshma Parvam", "Jana Gana Mana", "Hridayam", "Thallumaala",
  "Rorschach", "Nna Thaan Case Kodu", "Mukundan Unni Associates", "Romancham", "2018",
  "RDX", "Kannur Squad", "Kaathal: The Core", "Manjummel Boys",
  "Aavesham", "Bramayugam", "Premalu", "Aadujeevitham", "Anveshippin Kandethum",
  "Varshangalkku Shesham", "Turbo", "Vasanthi", "Kuttavum Shikshayum", "Churuli",
  "Super Sharanya", "Bhoothakaalam", "Meppadiyan", "Jo and Jo", "Kaduva",
  "Kalyanaraman", "CID Moosa", "Punjabi House", "Thommanum Makkalum", "Chathikkatha Chanthu",
  "Twenty:20", "Christian Brothers", "Pokkiri Raja", "Rajamanikyam", "Hallo",
  "Naran", "Chinthavishtayaya Shyamala", "Ente Veedu Appuvinteyum", "Udayananu Tharam", "Traffic",
  "Salt N' Pepper", "22 Female Kottayam", "Diamond Necklace", "Annayum Rasoolum", "Amen",
  "Shutter", "Vikramadithyan", "Ohm Shanthi Oshaana", "1983", "Munnariyippu",
  "Iyobinte Pusthakam", "Action Hero Biju", "Jacobinte Swargarajyam",
  "Kammatipaadam", "Guppy", "Oru Mexican Aparatha", "Godha", "Mayanadhi",
  "Joseph", "Virus", "Unda",
  "Thanneer Mathan Dinangal", "Operation Java",
  "Home", "Kurup", "Palthu Janwar" 
];

// Pad to 300 Malayalam
for(let i=malayalamTitles.length + 1; i<=300; i++) {
  malayalamTitles.push(`Malayalam Cinema Classic Part ${i}`);
}

const englishTitles = [
  "Inception", "Interstellar", "The Dark Knight", "The Matrix", "Pulp Fiction",
  "Fight Club", "Forrest Gump", "The Shawshank Redemption", "The Godfather", "Gladiator"
];
// Pad to 100 English
for(let i=11; i<=100; i++) {
  englishTitles.push(`Hollywood Blockbuster Part ${i}`);
}

const tamilTitles = [
  "Vikram", "Kaithi", "Asuran", "Vada Chennai", "Master",
  "Super Deluxe", "96", "Ratsasan", "Theri", "Mersal"
];
// Pad to 100 Tamil
for(let i=11; i<=100; i++) {
  tamilTitles.push(`Kollywood Action Part ${i}`);
}

const generateMockDataset = (titles, language, startId, featuredCount) => {
  return titles.map((title, i) => {
    let genre = ["Drama"];
    if (i % 2 === 0) genre.push("Action");
    if (i % 3 === 0) genre.push("Romance");
    if (i % 5 === 0) genre.push("Comedy");

    return {
      tmdbId: startId + i,
      title: title,
      genres: genre,
      overview: `A fantastic ${language} story. ${title} is a critically acclaimed piece of cinema that captured the hearts of audiences. Experience the thrill, the drama, and the profound storytelling of this legendary movie.`,
      description: `A fantastic ${language} story. ${title} is a critically acclaimed piece of cinema that captured the hearts of audiences. Experience the thrill, the drama, and the profound storytelling of this legendary movie.`,
      language: language,
      release_date: `20${(10 + (i % 14))}-05-15`, 
      year: 2010 + (i % 14),
      poster: `https://via.placeholder.com/300x450?text=${encodeURIComponent(title.substring(0, 20))}`,
      isFeatured: i < featuredCount 
    };
  });
}

export const generateMovies = async () => {
  console.log("⚠️ Using Local Fallback Dataset Generator because TMDB API is unreachable.");
  
  // 300 ML, 100 EN, 100 TA = 500 Total
  // Featured breakdown: 60 ML + 20 EN + 20 TA = 100 featured in UI
  const mlu = generateMockDataset(malayalamTitles, 'Malayalam', 1000, 60);
  const eng = generateMockDataset(englishTitles, 'English', 5000, 20);
  const tam = generateMockDataset(tamilTitles, 'Tamil', 8000, 20);

  const allMoviesList = [...mlu, ...eng, ...tam];
  console.log(`📦 Aggregated ${allMoviesList.length} local fallback movies.`);
  
  return allMoviesList;
};
