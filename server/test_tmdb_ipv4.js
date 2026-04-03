import axios from 'axios';
import https from 'https';

const agent = new https.Agent({ family: 4 }); // Force IPv4

async function testTMDB() {
  try {
    const res = await axios.get('https://api.themoviedb.org/3/search/movie', {
      params: {
        api_key: '69a8827d45c582ca36c3a30fc9adfff7',
        query: 'Inception'
      },
      httpsAgent: agent,
      timeout: 5000
    });
    console.log("TMDB Success:", res.data.results[0].title, res.data.results[0].poster_path);
  } catch (err) {
    console.error("TMDB Failed:", err.message);
  }
}

testTMDB();
