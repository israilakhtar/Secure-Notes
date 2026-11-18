const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri || uri === 'your_mongodb_connection_string') {
    console.error('MONGO_URI is not set in .env.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected.');
  } catch (error) {
    // Log the reason only; never print the connection string (it contains credentials).
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
