import express from 'express';
import User from '../models/User.js';
import { authMiddleware } from './auth.js';

const router = express.Router();

/**
 * GET /api/users/profile-analysis
 * Logic: Fetch liked movies and aggregate genre/language counts.
 */
router.get('/profile-analysis', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('likedMovies');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const genreCounts = {};
    const langCounts = {};
    const likedMovies = user.likedMovies || [];

    likedMovies.forEach(movie => {
      // Genres
      if (movie.genres) {
        movie.genres.forEach(g => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      }
      // Language
      if (movie.language) {
        langCounts[movie.language] = (langCounts[movie.language] || 0) + 1;
      }
    });

    // Find "Most Watched Category" (top genre)
    let mostWatchedGenre = 'None yet';
    let maxVal = 0;
    Object.entries(genreCounts).forEach(([g, count]) => {
      if (count > maxVal) {
        maxVal = count;
        mostWatchedGenre = g;
      }
    });

    res.json({
      genres: genreCounts,
      languages: langCounts,
      totalLiked: likedMovies.length,
      mostWatchedCategory: mostWatchedGenre
    });
  } catch (err) {
    console.error('Profile analysis error:', err.message);
    res.status(500).json({ error: 'Failed to generate profile analysis' });
  }
});

export default router;
