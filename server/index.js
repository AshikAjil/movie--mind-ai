import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import moviesRouter from './routes/movies.js';
import searchRouter from './routes/search.js';
import explainRouter from './routes/explain.js';
import authRouter from './routes/auth.js';
import userStatsRouter from './routes/userStats.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Check for required API keys at startup
const openRouterKey = process.env.OPENROUTER_API_KEY;
if (!openRouterKey) {
  console.warn("⚠️  [WARNING] OPENROUTER_API_KEY is not defined in environment variables!");
} else {
  const maskedKey = `${openRouterKey.substring(0, 8)}...${openRouterKey.substring(openRouterKey.length - 4)}`;
  console.log(`✅ [INFO] OpenRouter API Key detected: ${maskedKey}`);
}

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Routes
app.use('/api/movies', moviesRouter);
app.use('/api/search', searchRouter);
app.use('/api/explain', explainRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', userStatsRouter);
app.use('/api/chat', chatRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Movie AI Server is running 🚀' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Connect to DB and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
