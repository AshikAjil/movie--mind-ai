import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_EMBEDDING_URL = 'https://openrouter.ai/api/v1/embeddings';
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

/**
 * Generate an embedding vector for the given text using OpenRouter API
 * @param {string} text - The text to embed
 * @returns {Promise<number[]>} - The embedding vector
 */
export const getEmbedding = async (text) => {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables');
  }

  try {
    const response = await axios.post(
      OPENROUTER_EMBEDDING_URL,
      {
        model: EMBEDDING_MODEL,
        input: text,
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

    const embedding = response.data?.data?.[0]?.embedding;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding response from OpenRouter');
    }

    return embedding;
  } catch (error) {
    if (error.response) {
      const { status, data } = error.response;
      throw new Error(`OpenRouter Embedding API Error ${status}: ${JSON.stringify(data)}`);
    }
    throw error;
  }
};

/**
 * Generate embeddings for a movie (combining title + genres + description)
 * @param {Object} movie - Movie object
 * @returns {Promise<number[]>} - The embedding vector
 */
export const getMovieEmbedding = async (movie) => {
  const text = `${movie.title}. Genres: ${movie.genres.join(', ')}. Language: ${movie.language}. Year: ${movie.year}. ${movie.description}`;
  return getEmbedding(text);
};
