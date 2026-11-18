const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required.'],
    trim: true,
    minlength: 2,
    maxlength: 80
  },
  email: {
    type: String,
    required: [true, 'Email is required.'],
    unique: true, // creates the unique index on email
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email format is invalid.']
  },
  password: {
    type: String,
    required: true,
    select: false // password hash is never returned unless explicitly requested
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
