import axios from 'axios';

// Safe URL resolution to avoid Vercel trailing slash 404 bugs
console.log("API URL:", import.meta.env.VITE_API_URL);
const userUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const finalBaseUrl = userUrl.endsWith('/api') ? userUrl : (userUrl ? `${userUrl}/api` : '/api');

const api = axios.create({
  baseURL: finalBaseUrl,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('movieai_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — normalize errors
api.interceptors.response.use(
  (response) => {
    // Prevent fatal render crashes if Vercel fallback serves index.html instead of a JSON API response
    if (typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype')) {
      return Promise.reject(new Error("API returned HTML instead of JSON. Ensure VITE_API_URL is set correctly in Vercel."));
    }
    return response.data;
  },
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'An unknown error occurred';
    return Promise.reject(new Error(message));
  }
);

// ─── Movies ───────────────────────────────────────────────
export const getFeaturedMovies = () => api.get('/movies/featured');

export const getAllMovies = (params = {}) => api.get('/movies', { params });
export const getMovieDetails = (id) => api.get(`/movies/${id}`);
export const getSimilarMovies = (id) => api.get(`/movies/similar/${id}`);
export const getMovieTrailer = (tmdbId) => api.get(`/movies/${tmdbId}/trailer`).catch(() => null);

export const seedMovies = () => api.post('/movies/seed');

// ─── Search ───────────────────────────────────────────────
export const searchMovies = (query, preferences = {}, feedSignals = {}) =>
  api.post('/search', { query, preferences, feedSignals });

// ─── Feed ─────────────────────────────────────────────────
export const getUserFeed = () => api.get('/auth/feed');
export const toggleLikeMovie = (movieId) => api.post('/auth/like', { movieId });
export const toggleDislikeMovie = (movieId) => api.post('/auth/dislike', { movieId });

// ─── Explain ──────────────────────────────────────────────
export const explainMovie = (movieId, movieTitle, preferences = {}, feedSignals = {}) =>
  api.post('/explain', { movieId, movieTitle, preferences, feedSignals });

// ─── Chat ─────────────────────────────────────────────────
export const chatWithAI = (message, history = []) => api.post('/chat', { message, history });

// ─── Health ───────────────────────────────────────────────
export const checkHealth = () => api.get('/health');

// ─── Auth ─────────────────────────────────────────────────
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (credentials) => api.post('/auth/register', credentials);
export const getUserInfo = () => api.get('/auth/me');
export const updatePreferences = (data) => api.put('/auth/preferences', data);
export const seedMockUsers = () => api.post('/auth/seed');
export const getProfileAnalysis = () => api.get('/users/profile-analysis');

export default api;
