/**
 * Derives feedSignals (likedGenres, likedLanguages, dislikedGenres) from a user feed object.
 */
export function deriveFeedSignals(feed) {
  if (!feed) return { likedGenres: [], likedLanguages: [], dislikedGenres: [] };

  const genreCount = {};
  const langCount = {};
  const dislikedGenresSet = new Set();

  const liked = feed.liked || [];
  const disliked = feed.disliked || [];

  liked.forEach((m) => {
    if (m.genres) {
      m.genres.forEach((g) => {
        genreCount[g] = (genreCount[g] || 0) + 1;
      });
    }
    if (m.language) {
      langCount[m.language] = (langCount[m.language] || 0) + 1;
    }
  });

  disliked.forEach((m) => {
    if (m.genres) {
      m.genres.forEach((g) => dislikedGenresSet.add(g));
    }
  });

  const likedGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => g);

  const likedLanguages = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([l]) => l);

  const dislikedGenres = [...dislikedGenresSet];

  return { likedGenres, likedLanguages, dislikedGenres };
}
