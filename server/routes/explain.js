import express from 'express';
import axios from 'axios';
import Movie from '../models/Movie.js';

const router = express.Router();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
console.log("[BACKEND-EXPLAIN] API KEY LOADED:", !!process.env.OPENROUTER_API_KEY);

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';
const CHAT_MODEL = 'google/gemini-2.0-flash-001';

/**
 * Compute how well a movie matches the user's feed signals.
 * Returns: { tasteScore, likedMatches, dislikedMatches, langMismatch }
 */
function computeTastefit(movie, feedSignals = {}) {
  const movieGenres = movie.genres || [];
  const likedGenreSet = new Set(feedSignals.likedGenres || []);
  const dislikedGenreSet = new Set(feedSignals.dislikedGenres || []);
  const likedLangSet = new Set(feedSignals.likedLanguages || []);

  const likedMatches = movieGenres.filter((g) => likedGenreSet.has(g));
  const dislikedMatches = movieGenres.filter((g) => dislikedGenreSet.has(g));

  const allGenresDisliked =
    dislikedMatches.length === movieGenres.length && movieGenres.length > 0;
  const langMismatch =
    likedLangSet.size > 0 && !likedLangSet.has(movie.language);

  // Simple score: +1 per liked genre match, -1.5 per disliked genre match, -0.5 for lang mismatch
  const tasteScore =
    likedMatches.length * 1 -
    dislikedMatches.length * 1.5 -
    (langMismatch ? 0.5 : 0);

  const isMismatch =
    allGenresDisliked || (tasteScore < -1 && dislikedMatches.length > 0);

  return { tasteScore, likedMatches, dislikedMatches, langMismatch, isMismatch };
}

// POST /api/explain — Generate AI explanation or honest warning
router.post('/', async (req, res) => {
  try {
    const { movieId, movieTitle, preferences = {}, feedSignals = {} } = req.body;

    if (!movieId && !movieTitle) {
      return res.status(400).json({ error: 'movieId or movieTitle is required' });
    }

    // Fetch the movie from DB
    let movie;
    if (movieId) {
      movie = await Movie.findById(movieId).select('-embedding');
    } else {
      movie = await Movie.findOne({
        title: { $regex: movieTitle, $options: 'i' },
      }).select('-embedding');
    }

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found in database' });
    }

    // Compute taste fit
    const { likedMatches, dislikedMatches, langMismatch, isMismatch } =
      computeTastefit(movie, feedSignals);

    // Build movie context
    const movieContext = `
Movie Title: ${movie.title}
Genres: ${movie.genres.join(', ')}
Language: ${movie.language}
Year: ${movie.year}
Description: ${movie.description}
    `.trim();

    // Build user taste context
    const userContext = preferences.likedMovies?.length > 0
      ? `The user has previously enjoyed: ${preferences.likedMovies.slice(0, 5).join(', ')}.`
      : '';
    const preferenceContext = preferences.genres?.length > 0
      ? `The user generally prefers these genres: ${preferences.genres.join(', ')}.`
      : '';
    const languageContext = preferences.language
      ? `The user prefers ${preferences.language} films.`
      : '';

    // Feed-based taste context
    const likedFeedContext = feedSignals.likedGenres?.length > 0
      ? `From their activity, the user has liked movies in: ${feedSignals.likedGenres.join(', ')}.`
      : '';
    const dislikedFeedContext = feedSignals.dislikedGenres?.length > 0
      ? `The user has disliked movies in: ${feedSignals.dislikedGenres.join(', ')}.`
      : '';

    const userProfile = [
      userContext,
      preferenceContext,
      languageContext,
      likedFeedContext,
      dislikedFeedContext,
    ].filter(Boolean).join('\n') || 'General movie enthusiast.';

    // Choose prompt direction based on taste fit
    let systemPrompt, userMessage;

    if (isMismatch) {
      // Honest warning mode
      systemPrompt = `You are an honest, friendly movie recommendation assistant. 
Your role is to give the user an HONEST assessment of whether they should watch a movie, 
based on their taste profile and the movie's data.
If the movie does NOT match the user's taste, clearly but kindly discourage them from watching it,
explaining specifically why it clashes with their preferences.
Keep it to 2-3 sentences. Be direct but not harsh. Never make up facts about the movie.`;

      const dislikedNote = dislikedMatches.length > 0
        ? `Note: This movie's genres (${dislikedMatches.join(', ')}) are ones the user has previously disliked.`
        : '';
      const langNote = langMismatch
        ? `Note: This movie is in ${movie.language}, which differs from the user's preferred language.`
        : '';

      userMessage = `
${movieContext}

User Profile:
${userProfile}

${[dislikedNote, langNote].filter(Boolean).join('\n')}

Based on this user's taste profile, honestly tell them in 2-3 sentences whether they should watch "${movie.title}".
Since this movie appears to conflict with their taste, gently but clearly explain why it may NOT be a great fit for them.
`;
    } else {
      // Standard recommendation mode — mention any mild caveats if partially mismatching
      const caveatNote =
        dislikedMatches.length > 0 && likedMatches.length > 0
          ? `Optionally mention that while some genres (${dislikedMatches.join(', ')}) are not usually their preference, the film still has strengths they'd enjoy.`
          : '';

      systemPrompt = `You are a personalized movie recommendation assistant. 
Your role is to explain WHY a specific user would enjoy a specific movie, 
based solely on the provided movie data and user preferences.
Keep the explanation engaging, concise (2-3 sentences), and personalized.
Never make up facts about the movie — only use the data provided.`;

      userMessage = `
${movieContext}

User Profile:
${userProfile}

Based on this movie and user profile, explain in 2-3 engaging sentences why this user would love watching "${movie.title}".
${caveatNote}
`;
    }

    if (!OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'OPENROUTER_API_KEY is not configured' });
    }

    const response = await axios.post(
      OPENROUTER_CHAT_URL,
      {
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'Movie AI Recommender',
        },
        timeout: 30000,
      }
    );

    const explanation = response.data?.choices?.[0]?.message?.content;

    if (!explanation) {
      throw new Error('No explanation received from AI model');
    }

    res.json({
      movie: {
        id: movie._id,
        title: movie.title,
        genres: movie.genres,
        language: movie.language,
        year: movie.year,
      },
      explanation: explanation.trim(),
      isMismatch,
      tasteDetails: {
        likedMatches,
        dislikedMatches,
        langMismatch,
      },
    });
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      console.error('[OPENROUTER ERROR]:', data || status);
      return res.status(status).json({
        error: `AI API Error ${status}`,
        details: data?.error?.message || JSON.stringify(data),
      });
    }
    console.error('Explain error:', error.response?.data || error.message);
    res.status(500).json({ error: "AI service failed" });
  }
});

export default router;
