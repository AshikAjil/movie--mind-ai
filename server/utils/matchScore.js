export function calculateMatchScore(movie, preferences) {
  if (!preferences) return 0;
  
  const { genres: prefGenres = [], languages: prefLangs = [] } = preferences;
  
  // If no preferences set at all, return 0 (Personalizing state)
  if (prefGenres.length === 0 && prefLangs.length === 0) return 0;

  let genreScore = 0;
  if (prefGenres.length > 0) {
    const movieGenres = movie.genres || [];
    const matchedGenres = movieGenres.filter(g => prefGenres.includes(g));
    
    if (matchedGenres.length > 0) {
      // Scale: 1 match = 60%, 2 matches = 85%, 3+ = 100%
      const ratio = matchedGenres.length;
      genreScore = ratio >= 3 ? 100 : ratio === 2 ? 85 : 60;
      
      // Penalty if the user has too many genres selected (diluted taste)
      if (prefGenres.length > 10) {
        genreScore *= 0.8;
      }
    }
  }

  let langScore = 0;
  if (prefLangs.length > 0) {
    if (prefLangs.includes(movie.language)) {
      langScore = 100;
    }
  } else {
    // If user hasn't specified languages, we don't give a free 100%
    // but maybe a 50% neutral score so it's not penalized for missing info
    langScore = 50; 
  }

  const finalScore = Math.round((genreScore * 0.7) + (langScore * 0.3));
  return Math.min(100, finalScore);
}
