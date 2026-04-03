import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  selectedMovies: [{
    movieId: String, // Or ObjectId if directly ref'ing Movie model, string works well
    title: String,
    genres: [String],
    language: String,
    year: Number
  }],
  likedMovies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  }],
  dislikedMovies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie'
  }],
  preferences: {
    genres: { type: [String], default: [] },
    languages: { type: [String], default: [] },
  }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
