import 'dotenv/config';
import { generateMovies } from './utils/datasetGenerator.js';

async function test() {
  console.log("Testing generate movies...");
  const movies = await generateMovies();
  console.log("Total generated:", movies.length);
}

test();
