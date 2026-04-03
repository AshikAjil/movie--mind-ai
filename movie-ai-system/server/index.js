import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './db.js';
import moviesRouter from './routes/movies.js';
import searchRouter from './routes/search.js';
import explainRouter from './routes/explain.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api/movies', moviesRouter);
app.use('/api/search', searchRouter);
app.use('/api/explain', explainRouter);

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
