import axios from 'axios';

async function testOMDB() {
  try {
    const res = await axios.get('http://www.omdbapi.com/', {
      params: {
        t: 'Inception',
        apikey: 'thewdb'
      },
      timeout: 5000
    });
    console.log("OMDB Success:", res.data.Poster);
  } catch(err) {
    console.error("OMDB Failed:", err.message);
  }
}

testOMDB();
