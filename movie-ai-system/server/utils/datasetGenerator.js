import axios from 'axios';

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const FALLBACK_POSTER = 'https://via.placeholder.com/300x450?text=No+Image';

/**
 * Fetches the genre mapping from TMDB
 * @returns {Promise<Object>} - genreId: genreName mapping
 */
const getGenreMap = async () => {
  try {
    const res = await axios.get(`${TMDB_BASE_URL}/genre/movie/list`, {
      params: { api_key: TMDB_API_KEY, language: 'en-US' },
    });
    const map = {};
    res.data.genres.forEach((g) => {
      map[g.id] = g.name;
    });
    return map;
  } catch (err) {
    console.error('⚠️  Failed to fetch TMDB genres:', err.message);
    return {};
  }
};

/**
 * Fetches movies from TMDB for a specific language
 * @param {string} langCode - 'en', 'ml', 'ta'
 * @param {number} targetCount - approximate target number of movies
 * @param {Object} genreMap - mapping of genre IDs to names
 * @returns {Promise<Array>} - processed movie objects
 */
const fetchMoviesByLanguage = async (originalLang, targetCount, genreMap) => {
  const languageMapping = {
    en: 'English',
    ml: 'Malayalam',
    ta: 'Tamil',
  };

  const results = [];
  let page = 1;

  console.log(`🎬  Fetching ${languageMapping[originalLang]} movies from TMDB...`);

  while (results.length < targetCount && page <= 20) {
    try {
      const res = await axios.get(`${TMDB_BASE_URL}/discover/movie`, {
        params: {
          api_key: TMDB_API_KEY,
          with_original_language: originalLang,
          sort_by: 'popularity.desc',
          page: page,
          'vote_count.gte': originalLang === 'en' ? 1000 : 50, // Higher threshold for popular English movies
          region: originalLang === 'ml' || originalLang === 'ta' ? 'IN' : undefined,
        },
      });

      if (!res.data.results || res.data.results.length === 0) break;

      const processed = res.data.results
        .filter(m => m.overview && m.overview.length > 20) // Only movies with summaries
        .map((m) => {
          const yearRaw = m.release_date ? parseInt(m.release_date.split('-')[0]) : 0;
          return {
            tmdbId: m.id,
            title: m.title,
            genres: m.genre_ids.map((id) => genreMap[id] || 'Other'),
            overview: m.overview,
            description: m.overview, // Sync for backward compatibility
            language: languageMapping[originalLang],
            release_date: m.release_date || 'Unknown',
            year: yearRaw > 0 ? yearRaw : 2000,
            poster: m.poster_path ? `${POSTER_BASE_URL}${m.poster_path}` : FALLBACK_POSTER,
            popularity: m.popularity, // Used for featured flag sorting
          };
        });

      results.push(...processed);
      page++;

      // Small delay between pages
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`❌ Error fetching page ${page} for ${originalLang}:`, err.message);
      break;
    }
  }

  return results;
};

/**
 * Main generator function (now ASYNC)
 * @returns {Promise<Array>} - 500 processed movies
 */
export const generateMovies = async () => {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB_API_KEY is not set in environment variables');
  }

  const genreMap = await getGenreMap();

  const [english, malayalam, tamil] = await Promise.all([
    fetchMoviesByLanguage('en', 200, genreMap),
    fetchMoviesByLanguage('ml', 150, genreMap),
    fetchMoviesByLanguage('ta', 150, genreMap),
  ]);

  // Merge and deduplicate just in case
  const allMoviesMap = new Map();
  [...english, ...malayalam, ...tamil].forEach((m) => {
    allMoviesMap.set(m.tmdbId, m);
  });

  const allMoviesList = Array.from(allMoviesMap.values());
  console.log(`📦  Aggregated ${allMoviesList.length} unique TMDB movies.`);

  // Pick top 100 most popular as featured
  const sortedByPopularity = [...allMoviesList].sort((a, b) => b.popularity - a.popularity);
  const featuredIds = new Set(sortedByPopularity.slice(0, 100).map((m) => m.tmdbId));

  allMoviesList.forEach((m) => {
    m.isFeatured = featuredIds.has(m.tmdbId);
    delete m.popularity; // Clean up before returning
  });

  // Limit to target 500 or whatever we fetched
  return allMoviesList.slice(0, 550); // Fetch a few more than 500 to be safe
};
