import axios from 'axios';

async function testTMDB() {
  try {
    console.log("Testing TMDB with 20 second timeout...");
    const res = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: '69a8827d45c582ca36c3a30fc9adfff7',
        query: 'Premam'
      },
      timeout: 20000
    });
    console.log("TMDB Success! Total results:", res.data.total_results);
    if (res.data.results.length > 0) {
      console.log("First result:", res.data.results[0].title);
      console.log("Poster Path:", res.data.results[0].poster_path);
    }
  } catch (err) {
    if (err.response) {
      console.error("TMDB HTTP Error:", err.response.status, err.response.data);
    } else {
      console.error("TMDB Failed:", err.message);
    }
  }
}

testTMDB();
