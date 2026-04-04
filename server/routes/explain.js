import express from 'express';
import axios from 'axios';
import Movie from '../models/Movie.js';
import AICache from '../models/AICache.js';
import jwt from 'jsonwebtoken';


const router = express.Router();

const MODEL = 'mistralai/mistral-7b-instruct:free'; // Fast model (Free Tier)
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

console.log("[EXPLAIN] Route loaded successfully.");

// Map to track active explanation requests to prevent duplicate OpenRouter calls
const activeRequests = new Map();

// --- Info endpoint: GET /api/explain ---
router.get('/', (req, res) => {
  res.json({ 
    message: "Movie AI Explanation endpoint is active.", 
    usage: "Send a POST request with movieId or movieTitle to get an AI-generated explanation.",
    endpoints: {
      post_explain: "POST /api/explain",
      get_debug: "GET /api/explain/debug"
    }
  });
});

// --- Debug endpoint: GET /api/explain/debug ---
router.get('/debug', async (req, res) => {
  try {
    const key = (process.env.OPENROUTER_API_KEY || "").trim();
    const maskedKey = key ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : "MISSING";
    
    console.log(`[DEBUG] Testing OpenRouter connectivity with key: ${maskedKey}`);
    
    const testCall = await axios.post(
      OPENROUTER_URL,
      {
        model: MODEL,
        messages: [{ role: "user", content: "Say hello in one word." }]
      },
      {
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://movie-mind-ai-system.vercel.app', // Using a more generic one if not sure
          'X-Title': 'MovieMind AI'
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
    const key = (process.env.OPENROUTER_API_KEY || "").trim();
    const maskedKey = key ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}` : "MISSING";
    
    const errorDetails = err.response?.data || err.message;
    console.error("[EXPLAIN DEBUG ERROR]", errorDetails);
    
    res.status(err.response?.status || 500).json({
      status: "FAILED",
      key_detected: !!key,
      key_preview: maskedKey,
      error: err.message,
      openrouter_response: errorDetails
    });
  }
});

// --- Main endpoint: POST /api/explain ---
router.post('/', async (req, res) => {
  try {
    const { movieId, movieTitle, preferences = {}, feedSignals = {}, query = '' } = req.body;

    if (!movieId && !movieTitle) {
      return res.status(400).json({ error: 'movieId or movieTitle is required' });
    }

    let userId = 'anonymous';
    const token = req.header('Authorization')?.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretfallbackkey123');
        userId = decoded.userId;
      } catch (err) {
        // Ignore token errors for caching
      }
    }

    // Improve Caching: Use cache key: movieId + userId + query
    const cacheKeyForDb = { movieId: movieId || String(movieTitle), userId, query };
    const requestKey = `${cacheKeyForDb.movieId}_${userId}_${query}`;

    // 1. Check if an identical request is already running (Prevent duplicate calls)
    if (activeRequests.has(requestKey)) {
      console.log(`[EXPLAIN] Joined existing active request for: ${requestKey}`);
      try {
        const explanation = await activeRequests.get(requestKey);
        return res.json({
          movie: { id: cacheKeyForDb.movieId, title: movieTitle || 'Movie' },
          explanation
        });
      } catch (err) {
        // If the shared request fails, fall through to try again
      }
    }

    // 2. Check DB Cache
    const cached = await AICache.findOne(cacheKeyForDb);
    if (cached) {
      console.log(`[EXPLAIN] Cache hit for key: ${requestKey}`);
      return res.json({
        movie: { id: cacheKeyForDb.movieId, title: movieTitle || 'Movie' },
        explanation: cached.explanation
      });
    }

    // Fetch the movie from DB
    let movie;
    if (movieId) {
      movie = await Movie.findById(movieId).select('title genres description overview'); // Only essential fields
    } else {
      movie = await Movie.findOne({
        title: { $regex: movieTitle, $options: 'i' },
      }).select('title genres description overview'); // Only essential fields
    }

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found in database' });
    }

    // Build user taste profile from minimal data
    const profileParts = [];
    if (preferences.genres?.length > 0) profileParts.push(`Likes: ${preferences.genres.join(', ')}.`);
    if (feedSignals.likedGenres?.length > 0) profileParts.push(`Plays: ${feedSignals.likedGenres.join(', ')}.`);
    const userProfile = profileParts.length > 0 ? profileParts.join(' ') : 'General enthusiast.';

    // Optimize Prompt: Reduce input size, avoid long descriptions
    const desc = (movie.description || movie.overview || 'No description').substring(0, 100);
    const prompt = `You are a personalized movie recommendation assistant. Explain in 1-2 short sentences why the user would or wouldn't like this movie. Be honest.
Movie: ${movie.title} (${(movie.genres || []).join(', ')})
Desc: ${desc}
User: ${userProfile}

Explanation:`;

    // Get fresh API key
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) {
      console.error("[EXPLAIN] API KEY IS MISSING");
      return res.status(503).json({ error: 'OPENROUTER_API_KEY is not configured' });
    }

    console.log(`[EXPLAIN] Calling OpenRouter for "${movie.title}"...`);

    // Define the async fetch operation
    const fetchExplanation = async () => {
      const trimmedKey = (process.env.OPENROUTER_API_KEY || "").trim();
      if (!trimmedKey) {
        throw new Error('OPENROUTER_API_KEY is missing or empty');
      }

      const response = await axios.post(
        OPENROUTER_URL,
        {
          model: MODEL,
          messages: [{ role: 'user', content: prompt }], // Note: Some models prefer role 'user' over 'system' for instructions in free tier
          temperature: 0.6,
          max_tokens: 150, 
        },
        {
          headers: {
            'Authorization': `Bearer ${trimmedKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://movie-mind-ai-system.vercel.app', 
            'X-Title': 'MovieMind AI'
          },
          timeout: 25000,
        }
      );

      console.log(`[EXPLAIN] OpenRouter responded: ${response.status}`);

      const explanation = response.data?.choices?.[0]?.message?.content;
      if (!explanation) {
        throw new Error('No explanation received from AI model');
      }

      // Save to cache before resolving
      try {
        await AICache.create({
          movieId: cacheKeyForDb.movieId,
          userId,
          query,
          explanation: explanation.trim()
        });
      } catch (cacheErr) {
        console.error('[EXPLAIN] Failed to save to cache:', cacheErr.message);
      }

      return explanation.trim();
    };

    // Store promise in active requests to prevent duplicate calls
    const explanationPromise = fetchExplanation();
    activeRequests.set(requestKey, explanationPromise);

    let finalExplanation;
    try {
      finalExplanation = await explanationPromise;
    } finally {
      // Clean up the active request once fulfilled or rejected
      activeRequests.delete(requestKey);
    }

    res.json({
      movie: { id: movie._id, title: movie.title },
      explanation: finalExplanation
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
