import express from 'express';
import axios from 'axios';
import Movie from '../models/Movie.js';
import { getEmbedding } from '../utils/embedding.js';
import { cosineSimilarity, similarityToPercentage } from '../utils/similarity.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

const MODEL = 'qwen/qwen3.6-plus:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

console.log("[CHAT] Route loaded successfully.");

/**
 * POST /api/chat
 * Retrieval-Augmented Generation (RAG) for movie recommendations
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

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
        return res.status(503).json({ error: 'AI service temporarily unavailable' });
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

    const llmHistory = history.slice(-5);

    // Get fresh API key
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    if (!apiKey) {
      console.error("[CHAT] API KEY IS MISSING");
      return res.status(503).json({ error: 'OPENROUTER_API_KEY is not configured' });
    }

    console.log(`[CHAT] Calling OpenRouter...`);

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
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://movie-mind-ai-five.vercel.app',
          'X-Title': 'MovieMind AI',
        },
        timeout: 25000,
      }
    );

    console.log(`[CHAT] OpenRouter responded: ${response.status}`);

    const aiReply = response.data?.choices?.[0]?.message?.content ||
      "I'm having trouble thinking right now. Please try again!";

    res.json({
      reply: aiReply,
      movies: scoredMovies
    });

  } catch (error) {
    console.error('[CHAT] Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message || 'Error processing your request' });
  }
});

export default router;
