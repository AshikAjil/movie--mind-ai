export function calculateMatchScore(movie, preferences) {
  if (!preferences) return 0;
  
  const { genres: prefGenres = [], languages: prefLangs = [] } = preferences;
  
  // If no preferences set at all, return 0 (Personalizing state)
  if (prefGenres.length === 0 && prefLangs.length === 0) return 0;

  const movieGenres = movie.genres || [];

  // IMPLEMENT GENRE MATCH:
  // Count how many genres of the movie match user preferred genres
  const genreMatches = movieGenres.filter(g => prefGenres.includes(g)).length;
  let genreScore = 0;
  if (movieGenres.length > 0) {
    genreScore = (genreMatches / movieGenres.length) * 60;
  }

  // IMPLEMENT LANGUAGE MATCH:
  const languageScore = prefLangs.includes(movie.language) ? 20 : 0;

  // USER HISTORY SIMILARITY:
  // If user liked movies with similar genres:
  const historyScore = prefGenres.some(g => movieGenres.includes(g)) ? 20 : 0;

  // FINAL SCORE:
  const totalScore = Math.round(genreScore + languageScore + historyScore);

  // NORMALIZATION:
  // Ensure score is between 10 and 100
  const finalScore = Math.min(100, Math.max(10, totalScore));

  return finalScore;
}
