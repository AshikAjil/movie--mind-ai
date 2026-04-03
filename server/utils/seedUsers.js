import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const mockUsers = [
  {
    name: "Ashik",
    email: "ashik@test.com",
    password: "123456",
    selectedMovies: [
      { movieId: "1", title: "Inception" },
      { movieId: "2", title: "Interstellar" },
      { movieId: "4", title: "The Dark Knight" },
      { movieId: "5", title: "The Matrix" },
      { movieId: "6", title: "Avengers: Endgame" },
      { movieId: "7", title: "Spider-Man: No Way Home" },
      { movieId: "8", title: "Mad Max: Fury Road" },
      { movieId: "9", title: "Gladiator" }
    ],
    preferences: { genres: ["Action", "Sci-Fi", "Thriller"], languages: ["English"] }
  },
  {
    name: "User2",
    email: "user2@test.com",
    password: "123456",
    selectedMovies: [
      { movieId: "3", title: "Premam" },
      { movieId: "10", title: "Bangalore Days" },
      { movieId: "11", title: "Kumbalangi Nights" },
      { movieId: "12", title: "Drishyam" },
      { movieId: "13", title: "Manichitrathazhu" },
      { movieId: "14", title: "Charlie" },
      { movieId: "15", title: "Ustad Hotel" },
      { movieId: "16", title: "Maheshinte Prathikaaram" }
    ],
    preferences: { genres: ["Drama", "Romance", "Comedy", "Thriller"], languages: ["Malayalam"] }
  }
];

export default async function seedUsers() {
  try {
    console.log('Seeding mock users...');
    
    // Check if they already exist, delete them to reset data
    for (const mockUser of mockUsers) {
      await User.deleteOne({ email: mockUser.email });
      console.log(`Deleted old record for ${mockUser.name} to refresh mock data.`);

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(mockUser.password, salt);
      
      await User.create({
        ...mockUser,
        password: hashedPassword
      });
      console.log(`User ${mockUser.name} updated with full 8+ movie profile.`);
    }
    
    return 'User seeding completed successfully.';
  } catch (err) {
    console.error('Error seeding users:', err);
    throw err;
  }
}
