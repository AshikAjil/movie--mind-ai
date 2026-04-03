import express from 'express';
import axios from 'axios';
import Movie from '../models/Movie.js';
import { getEmbedding } from '../utils/embedding.js';
import { cosineSimilarity, similarityToPercentage } from '../utils/similarity.js';
import { authMiddleware } from './auth.js';

const router = express.Router();
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

/**
 * POST /api/chat
 * Retrieval-Augmented Generation (RAG) for movie recommendations
 * Expects { message, history }
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // --- STEP 1: Query Classification ---
    // Simple intent detection using regex
    const isMovieQuery = /recommend|suggest|movie|film|watch|like/i.test(message);

    let systemPrompt = "";
    let scoredMovies = [];
    let context = "";

    if (isMovieQuery) {
      // ===== MOVIE / MIXED QUERY (RAG PATH) =====
      
      // Generate Embedding
      let queryEmbedding;
      try {
        queryEmbedding = await getEmbedding(message);
      } catch (err) {
        console.error('Embedding error in Chat:', err.message);
        return res.status(503).json({ error: 'AI service temporarily unavailable' });
      }

      // Retrieve Top Matches
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
        .slice(0, 5); // Performance Limit: Top 5
        
        // Keep context short
        context = scoredMovies.map((m, i) => (
          `Movie ${i + 1}: ${m.title} (${m.year}, ${m.language}). Genres: ${m.genres.join(', ')}. Details: ${(m.description || m.overview || '').substring(0, 150)}...`
        )).join('\n\n');
      }

      systemPrompt = `You are a smart AI movie assistant.

- Use database context when provided.
- For general questions, answer normally.
- Do NOT hallucinate movie recommendations. Only recommend movies from the provided context. If nothing fits perfectly or context is empty, politely say you don't have a perfect match right now.

CONTEXT (Top Matches from DB):
${context ? context : 'No relevant movies found in database.'}

Keep your response conversational but concise (max 3-4 sentences total).`;

    } else {
      // ===== GENERAL QUERY (LLM ONLY) =====
      systemPrompt = `You are a smart AI movie assistant. 
You are currently engaging in general knowledge or casual conversation. 
- Answer the user's questions normally and accurately.
- Be friendly, enthusiastic, and concise (max 3-4 sentences).
- Do not invent movie recommendations here. If they later ask for a recommendation, say you'd love to search the database for them!`;
    }

    // --- STEP 4: Call LLM ---
    const llmHistory = history.slice(-5); // Performance: Keep last 5 messages for memory

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.0-flash-001',
        messages: [
          { role: 'system', content: systemPrompt },
          ...llmHistory,
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 300, // Token limits
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5000',
          'X-Title': 'MovieMind Hybrid Chat',
        },
        timeout: 25000,
      }
    );

    const aiReply = response.data?.choices?.[0]?.message?.content || "I'm having trouble thinking of a response right now. Feel free to ask another question!";

    // --- STEP 5: Return Results ---
    res.json({
      reply: aiReply,
      movies: scoredMovies // Will be empty [] for General queries
    });

  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ error: error.message || 'Error processing your request' });
  }
});

export default router;
