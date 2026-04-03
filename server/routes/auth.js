import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import seedUsers from '../utils/seedUsers.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretfallbackkey123';

// Auth Middleware
export const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    console.log(`[BACKEND] Validating Signup route hit for: ${req.body.email}`);
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'User already exists' });

    user = new User({ name, email, password });
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);

    await user.save();

    const payload = { userId: user.id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        selectedMovies: user.selectedMovies,
        preferences: user.preferences
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const payload = { userId: user.id };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        selectedMovies: user.selectedMovies,
        preferences: user.preferences
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/auth/preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const { selectedMovies, preferences } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.selectedMovies = selectedMovies || user.selectedMovies;
    if (preferences) {
      user.preferences.genres = preferences.genres || user.preferences.genres;
      user.preferences.languages = preferences.languages || 
                                   (preferences.language ? [preferences.language] : user.preferences.languages);
    }

    await user.save();
    res.json({ message: 'Preferences updated successfully', user });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/seed
router.post('/seed', async (req, res) => {
  try {
    const message = await seedUsers();
    res.json({ message });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/auth/feed
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('likedMovies', '-embedding')
      .populate('dislikedMovies', '-embedding');
      
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      liked: user.likedMovies,
      disliked: user.dislikedMovies
    });
  } catch (err) {
    console.error('Feed error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/like
router.post('/like', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.body;
    const user = await User.findById(req.user.userId);
    
    // Toggle logic: if already liked, remove it. If not, add to liked and remove from disliked.
    const likedIndex = user.likedMovies.indexOf(movieId);
    if (likedIndex > -1) {
      user.likedMovies.splice(likedIndex, 1);
    } else {
      user.likedMovies.push(movieId);
      // Remove from disliked array safely
      user.dislikedMovies = user.dislikedMovies.filter(id => id.toString() !== movieId.toString());
    }
    
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Like logic error:', err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST /api/auth/dislike
router.post('/dislike', authMiddleware, async (req, res) => {
  try {
    const { movieId } = req.body;
    const user = await User.findById(req.user.userId);
    
    // Toggle logic: if already disliked, remove it. If not, add to disliked and remove from liked.
    const dislikedIndex = user.dislikedMovies.indexOf(movieId);
    if (dislikedIndex > -1) {
      user.dislikedMovies.splice(dislikedIndex, 1);
    } else {
      user.dislikedMovies.push(movieId);
      // Remove from liked array safely
      user.likedMovies = user.likedMovies.filter(id => id.toString() !== movieId.toString());
    }
    
    await user.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Dislike logic error:', err.message);
    res.status(500).send('Server error');
  }
});

export default router;
