# 🎬 MovieMind AI — Full Stack AI Movie Recommendation System

A production-ready MERN + AI movie recommendation app using **OpenRouter embeddings** for semantic search and **GPT-4o-mini** for personalized AI explanations.

Link: https://movie-mind-ai-five.vercel.app/

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Vanilla CSS (dark glassmorphism) |
| Backend | Node.js + Express (ES Modules) |
| Database | MongoDB Atlas (Mongoose) |
| AI Embeddings | OpenRouter `openai/text-embedding-3-small` |
| AI Chat | OpenRouter `openai/gpt-4o-mini` |

---

## 📁 Project Structure

```
movie-ai-system/
├── server/
│   ├── index.js              # Express app entry
│   ├── db.js                 # MongoDB connection
│   ├── .env                  # API keys (fill in!)
│   ├── models/Movie.js       # Mongoose schema
│   ├── utils/
│   │   ├── datasetGenerator.js  # 500-movie dataset
│   │   ├── embedding.js         # OpenRouter embeddings
│   │   └── similarity.js        # Cosine similarity
│   └── routes/
│       ├── movies.js         # CRUD + seed
│       ├── search.js         # Semantic search
│       └── explain.js        # AI explanations
│
└── client/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css
        ├── services/api.js
        ├── components/
        │   ├── MovieCard.jsx
        │   ├── SearchBar.jsx
        │   └── ExplanationBox.jsx
        └── pages/
            ├── Home.jsx
            └── Login.jsx
```

---

## ⚙️ Setup

### 1. Add your API keys

Edit `server/.env`:

```env
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/movieai
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
PORT=5000
```

### 2. Start the backend

```bash
cd server
npm install
npm run dev
```

### 3. Seed the database (one-time)

```bash
# Using curl
curl -X POST http://localhost:5000/api/movies/seed

# Or click "Seed DB" in the app header
```

> ⚠️ Seeding generates embeddings for 500 movies via OpenRouter API — this takes ~5-10 minutes.

### 4. Start the frontend

```bash
cd client
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🔌 API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| `POST` | `/api/movies/seed` | Seed 500 movies with embeddings |
| `GET` | `/api/movies` | All movies (paginated) |
| `GET` | `/api/movies/featured` | 100 featured movies |
| `POST` | `/api/search` | Semantic search |
| `POST` | `/api/explain` | AI personalized explanation |
| `GET` | `/api/health` | Server health check |

### Search request body
```json
{
  "query": "scary supernatural horror with ghosts",
  "preferences": {
    "genres": ["Horror", "Thriller"],
    "language": "English"
  }
}
```

### Explain request body
```json
{
  "movieId": "mongo_object_id",
  "preferences": {
    "genres": ["Thriller"],
    "likedMovies": ["Inception", "Interstellar"]
  }
}
```

---

## 🤖 RAG Pipeline

1. **Indexing**: When seeded, each movie's text (title + genre + description) is converted to a vector embedding via OpenRouter
2. **Search**: User query → embedding → cosine similarity against all stored embeddings → top 20 at ≥20% match
3. **Explain**: Movie data from DB (no hallucination) + user preferences → GPT-4o-mini → personalized explanation

---

## 🎨 Features

- ✅ Dark glassmorphism UI with gradient animations
- ✅ 500 movies (English + Malayalam + Tamil)
- ✅ Semantic/AI search with match percentages
- ✅ Personalized AI explanations ("Why should I watch?")
- ✅ Multi-step onboarding (pick 8 movies + genres)
- ✅ Language + genre filters
- ✅ Lazy-loading poster images
- ✅ Server status indicator
- ✅ One-click database seeding from UI
- ✅ Persistent user preferences (localStorage)
