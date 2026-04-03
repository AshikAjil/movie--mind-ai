import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    genres: {
      type: [String],
      required: true,
      default: [],
    },
    overview: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
      enum: ['English', 'Malayalam', 'Tamil', 'Hindi'],
    },
    release_date: {
      type: String,
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    poster: {
      type: String,
      default: '',
    },
    tmdbId: {
      type: Number,
      unique: true,
      sparse: true,
    },
    embedding: {
      type: [Number],
      default: [],
      select: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
movieSchema.index({ isFeatured: 1 });
movieSchema.index({ language: 1 });
movieSchema.index({ genres: 1 });

const Movie = mongoose.model('Movie', movieSchema);

export default Movie;
