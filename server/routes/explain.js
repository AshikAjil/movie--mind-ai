import express from 'express';
import axios from 'axios';
import Movie from '../models/Movie.js';
import AICache from '../models/AICache.js';
import jwt from 'jsonwebtoken';


const router = express.Router();

const MODEL = 'meta-llama/llama-3-8b-invalid'; // Primary Model
const FALLBACK_MODEL = 'openchat/openchat-3.5'; // Fast Fallback
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
    
    // Try primary, then fallback
    const modelsToTry = [MODEL, FALLBACK_MODEL];
    let response;
    let lastError;

    for (const testModel of modelsToTry) {
        try {
            console.log(`[DEBUG] Attempting with model: ${testModel}`);
            response = await axios.post(
                OPENROUTER_URL,
                {
                    model: testModel,
                    messages: [{ role: "user", content: "Say hello in one word." }]
                },
                {
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://movie-mind-ai-system.vercel.app',
                        'X-Title': 'MovieMind AI'
                    },
                    timeout: 15000
                }
            );
            break; // Success
        } catch (err) {
            lastError = err;
            if (err.response?.status === 404) {
                console.error(`[DEBUG] Invalid model selected: ${testModel}`);
            }
            console.warn(`[DEBUG] Model ${testModel} failed, trying next...`);
        }
    }

    if (!response) throw lastError;

    res.json({
      status: "SUCCESS",
      key_detected: !!key,
      key_preview: maskedKey,
      model: response.data?.model || MODEL,
      ai_response: response.data?.choices?.[0]?.message?.content
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
      movie = await Movie.findById(movieId).select('title genres overview language'); // Only essential fields
    } else {
      movie = await Movie.findOne({
        title: { $regex: movieTitle, $options: 'i' },
      }).select('title genres overview language'); // Only essential fields
    }

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found in database' });
    }

    // Build user taste profile from minimal data
    const profileParts = [];
    if (preferences.genres?.length > 0) profileParts.push(`Liked genres: ${preferences.genres.join(', ')}`);
    if (preferences.likedMovies?.length > 0) profileParts.push(`Liked movies: ${preferences.likedMovies.join(', ')}`);
    if (preferences.dislikedMovies?.length > 0) profileParts.push(`Disliked movies: ${preferences.dislikedMovies.join(', ')}`);
    if (feedSignals.likedGenres?.length > 0) profileParts.push(`Recently played genres: ${feedSignals.likedGenres.join(', ')}`);
    const userProfile = profileParts.length > 0 ? profileParts.join('. ') : 'General enthusiast';

    // Optimize Prompt: Reduce input size, avoid long descriptions
    const desc = (movie.overview || 'No description').substring(0, 300);
    const prompt = `Write a conversational, personalized, and detailed movie review based on the User Profile.
Do NOT use any headings, bold text, bullet points, asterisks, or labels. 

Write EXACTLY 5 cohesive paragraphs separated by blank lines, following this sequence:
1. An engaging hook to draw the reader in.
2. A detailed story summary spanning a few sentences (no spoilers).
3. Relate it deeply to the user's liked genres and movies. Explain thoroughly why it matches their taste, or politely warn them if it's a mismatch.
4. Highlight lead actors and discuss standout performances in detail.
5. Final verdict with a clear, detailed recommendation to watch or maybe skip.

Tone: Conversational, human-like, slightly persuasive but honest, no generic AI tone.

Movie: ${movie.title}
Genres: ${(movie.genres || []).join(', ')}
Language: ${movie.language || 'Unknown'}
Overview: ${desc}

User Profile: ${userProfile}

Review:`;

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

      // Fallback model logic
      const modelsToTry = [MODEL, FALLBACK_MODEL];
      let response;
      let lastError;

      for (const currentModel of modelsToTry) {
        try {
          console.log(`[EXPLAIN] Attempting with model: ${currentModel}`);
          response = await axios.post(
            OPENROUTER_URL,
            {
              model: currentModel,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.6,
              max_tokens: 350,
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
          break; // Success
        } catch (err) {
          lastError = err;
          if (err.response?.status === 404) {
            console.error(`[EXPLAIN] Invalid model selected: ${currentModel}`);
          }
          console.warn(`[EXPLAIN] Model ${currentModel} failed, trying next fallback...`);
          // Continue to next model
        }
      }

      if (!response) {
        throw lastError;
      }

      console.log(`[EXPLAIN] OpenRouter responded: ${response.status} (Model: ${response.data?.model || MODEL})`);

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
