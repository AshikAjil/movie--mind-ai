import express from 'express';
import axios from 'axios';
import Movie from '../models/Movie.js';

const router = express.Router();

const MODEL = 'openrouter/free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

console.log("[EXPLAIN] Route loaded successfully.");

// --- Debug endpoint: GET /api/explain/debug ---
router.get('/debug', async (req, res) => {
  try {
    const key = process.env.OPENROUTER_API_KEY || "";
    const maskedKey = key ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : "MISSING";

    const testCall = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [{ role: "user", content: "Say hello in one word." }]
      },
      {
        headers: {
          Authorization: `Bearer ${key.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://movie-mind-ai-five.vercel.app",
          "X-Title": "MovieMind AI"
        },
        timeout: 15000
      }
    );

    res.json({
      status: "SUCCESS",
      key_detected: !!key,
      key_preview: maskedKey,
      model: MODEL,
      ai_response: testCall.data?.choices?.[0]?.message?.content
    });
  } catch (err) {
    const key = process.env.OPENROUTER_API_KEY || "";
    const maskedKey = key ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : "MISSING";
    console.error("[EXPLAIN DEBUG ERROR]", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      status: "FAILED",
      key_detected: !!key,
      key_preview: maskedKey,
      error: err.message,
      openrouter_response: err.response?.data
    });
  }
});

// --- Main endpoint: POST /api/explain ---
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

    // Build user taste profile from all available data
    const profileParts = [];
    if (preferences.likedMovies?.length > 0) {
      profileParts.push(`Previously enjoyed: ${preferences.likedMovies.slice(0, 5).join(', ')}.`);
    }
    if (preferences.genres?.length > 0) {
      profileParts.push(`Preferred genres: ${preferences.genres.join(', ')}.`);
    }
    if (preferences.language) {
      profileParts.push(`Preferred language: ${preferences.language}.`);
    }
    if (feedSignals.likedGenres?.length > 0) {
      profileParts.push(`Liked genres from activity: ${feedSignals.likedGenres.join(', ')}.`);
    }
    if (feedSignals.dislikedGenres?.length > 0) {
      profileParts.push(`Disliked genres: ${feedSignals.dislikedGenres.join(', ')}.`);
    }
    const userProfile = profileParts.length > 0 ? profileParts.join('\n') : 'General movie enthusiast.';

    // Build the single unified prompt
    const prompt = `You are a personalized movie recommendation assistant.
Your goal is to explain to a specific user why they would (or would not) enjoy a specific movie.
Be HONEST. If the movie conflicts with their preferences, politely warn them.
Keep the tone friendly and engaging. Limit your response to 2-3 concise sentences.
NEVER make up facts — only use the provided movie info.

--- MOVIE DATA ---
Title: ${movie.title}
Genres: ${(movie.genres || []).join(', ') || 'N/A'}
Language: ${movie.language || 'N/A'}
Year: ${movie.year || 'N/A'}
Description: ${(movie.description || movie.overview || 'No description available').substring(0, 500)}

--- USER TASTE PROFILE ---
${userProfile}

Based on the above, provide an honest, personalized 2-3 sentence explanation of whether this user should watch "${movie.title}".`;

    // Get fresh API key
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) {
      console.error("[EXPLAIN] API KEY IS MISSING");
      return res.status(503).json({ error: 'OPENROUTER_API_KEY is not configured' });
    }

    console.log(`[EXPLAIN] Calling OpenRouter for "${movie.title}"...`);

    const response = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://movie-mind-ai-five.vercel.app",
          "X-Title": "MovieMind AI"
        },
        timeout: 25000,
      }
    );

    console.log(`[EXPLAIN] OpenRouter responded: ${response.status}`);

    const explanation = response.data?.choices?.[0]?.message?.content;
    if (!explanation) {
      throw new Error('No explanation received from AI model');
    }

    res.json({
      movie: { id: movie._id, title: movie.title },
      explanation: explanation.trim()
    });

  } catch (error) {
    console.error("[EXPLAIN] Error:", error.response?.data || error.message);
    if (error.response) {
      return res.status(error.response.status).json({
        error: `AI API Error ${error.response.status}`,
        details: error.response.data?.error?.message || JSON.stringify(error.response.data),
      });
    }
    res.status(500).json({ error: error.message || "AI service failed" });
  }
});

export default router;
