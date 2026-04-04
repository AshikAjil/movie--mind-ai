import mongoose from 'mongoose';

const aiCacheSchema = new mongoose.Schema(
  {
    movieId: {
      type: String, // Can be "CHAT" for chat queries
      required: true,
    },
    userId: {
      type: String,
      default: 'anonymous', // Default if user not logged in
    },
    query: {
      type: String,
      default: '', // For chat queries or extra explain context
    },
    explanation: {
      type: String,
      required: true, // Stores either the movie explanation or chat reply
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: '7d', // TTL index to automatically remove documents after 7 days
    },
  }
);

// Compound index to quickly find cache hits
aiCacheSchema.index({ movieId: 1, userId: 1, query: 1 });

const AICache = mongoose.model('AICache', aiCacheSchema);

export default AICache;
