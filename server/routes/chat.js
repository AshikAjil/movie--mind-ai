import express from 'express';
import axios from 'axios';
import Movie from '../models/Movie.js';
import AICache from '../models/AICache.js';
import { getEmbedding } from '../utils/embedding.js';
import { cosineSimilarity, similarityToPercentage } from '../utils/similarity.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

const MODEL = 'mistralai/mistral-7b-instruct:free'; // Fast model (Free Tier)
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

console.log("[CHAT] Route loaded successfully.");

// --- Info endpoint: GET /api/chat ---
router.get('/', (req, res) => {
  res.json({ 
    message: "Movie AI Chatbot endpoint is active.", 
    usage: "Send a POST request with message and optional history to chat with the AI assistant.",
    endpoints: {
      post_chat: "POST /api/chat"
    }
  });
});

const activeChatRequests = new Map();

/**
 * POST /api/chat
 * Retrieval-Augmented Generation (RAG) for movie recommendations
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const userId = req.user?.id || 'anonymous';

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const cacheKey = { movieId: 'CHAT', userId, query: message };
    const requestKey = `CHAT_${userId}_${message}`;

    if (activeChatRequests.has(requestKey)) {
      try {
        const cachedResponse = await activeChatRequests.get(requestKey);
        return res.json(cachedResponse);
      } catch (err) { }
    }

    // Check DB Cache for chat
    const cached = await AICache.findOne(cacheKey);
    if (cached) {
      console.log(`[CHAT] Cache hit for query: ${message}`);
      return res.json({
        reply: cached.explanation,
        movies: [] // Cache doesn't store movie results, but we return empty to be fast
      });
    }

    const fetchChatLogic = async () => {
      // Simple intent detection
      const isMovieQuery = /recommend|suggest|movie|film|watch|like/i.test(message);

      let instructions = "";
      let scoredMovies = [];

      if (isMovieQuery) {
        // RAG PATH: Retrieve relevant movies from DB
        let queryEmbedding;
        try {
          queryEmbedding = await getEmbedding(message);
        } catch (err) {
          console.error('[CHAT] Embedding error:', err.message);
          throw new Error('AI service temporarily unavailable');
        }

        const movies = await Movie.find({ embedding: { $exists: true, $not: { $size: 0 } } })
          .select('+embedding')
          .lean();

        if (movies.length > 0) {
          scoredMovies = movies.map((movie) => ({
            ...movie,
            embedding: undefined,
            similarityScore: cosineSimilarity(queryEmbedding, movie.embedding),
            matchPercentage: similarityToPercentage(cosineSimilarity(queryEmbedding, movie.embedding))
          }))
          .sort((a, b) => b.similarityScore - a.similarityScore)
          .slice(0, 5);

          const context = scoredMovies.map((m, i) => (
            `Movie ${i + 1}: ${m.title} (${m.year}, ${m.language}). Genres: ${m.genres.join(', ')}. Details: ${(m.description || m.overview || '').substring(0, 150)}...`
          )).join('\n\n');

          instructions = `You are a smart AI movie assistant.
  - Use database context when provided.
  - Do NOT hallucinate movie recommendations. Only recommend movies from the provided context.
  - If nothing fits perfectly or context is empty, politely say so.
  CONTEXT (Top Matches from DB):
  ${context}
  Keep your response conversational but concise (max 3-4 sentences total).`;
        } else {
          instructions = `You are a smart AI movie assistant. No relevant movies found in the database. Politely let the user know. Keep it concise.`;
        }
      } else {
        instructions = `You are a smart AI movie assistant engaging in casual conversation.
  - Answer questions normally and accurately.
  - Be friendly, enthusiastic, and concise (max 3-4 sentences).
  - Do not invent movie recommendations.`;
      }

      const llmHistory = history.slice(-3); // Optimize history sent

      // Get fresh API key
      const trimmedKey = (process.env.OPENROUTER_API_KEY || "").trim();
      if (!trimmedKey) {
        console.error("[CHAT] API KEY IS MISSING OR EMPTY");
        throw new Error('OPENROUTER_API_KEY is not configured');
      }

      console.log(`[CHAT] Calling OpenRouter for query: "${message.substring(0, 50)}..."`);

      const response = await axios.post(
        OPENROUTER_URL,
        {
          model: MODEL,
          messages: [
            {
              role: 'user', 
              content: `INSTRUCTIONS: ${instructions}\n\nCONVERSATION HISTORY:\n${JSON.stringify(llmHistory)}\n\nUSER MESSAGE: ${message}`
            }
          ],
          temperature: 0.7,
          max_tokens: 150, 
        },
        {
          headers: {
            'Authorization': `Bearer ${trimmedKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://movie-mind-ai-system.vercel.app', 
            'X-Title': 'MovieMind AI',
          },
          timeout: 25000,
        }
      );

      console.log(`[CHAT] OpenRouter responded: ${response.status}`);

      const aiReply = response.data?.choices?.[0]?.message?.content ||
        "I'm having trouble thinking right now. Please try again!";

      // Save to cache
      try {
        await AICache.create({
          movieId: cacheKey.movieId,
          userId: cacheKey.userId,
          query: cacheKey.query,
          explanation: aiReply.trim()
        });
      } catch (err) {}

      return { reply: aiReply, movies: scoredMovies };
    };

    const chatPromise = fetchChatLogic();
    activeChatRequests.set(requestKey, chatPromise);

    let finalResponse;
    try {
      finalResponse = await chatPromise;
    } finally {
      activeChatRequests.delete(requestKey);
    }

    res.json(finalResponse);

  } catch (error) {
    console.error('[CHAT] Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Error processing your request' });
  }
});

export default router;
