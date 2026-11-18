const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = 10;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Used to keep login timing similar when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer-password', SALT_ROUNDS);

const toPublicUser = (user) => ({ id: user._id, name: user.name, email: user.email });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // typeof checks also block NoSQL operator objects such as { "$ne": "" }
    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2 || cleanName.length > 80) {
      return res.status(400).json({ message: 'Name must be 2 to 80 characters.' });
    }
    if (cleanEmail.length > 254 || !EMAIL_PATTERN.test(cleanEmail)) {
      return res.status(400).json({ message: 'Enter a valid email address.' });
    }
    // bcrypt only uses the first 72 bytes, so longer passwords are rejected.
    if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Password must be 8 to 72 characters.' });
    }

    if (await User.findOne({ email: cleanEmail })) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name: cleanName, email: cleanEmail, password: hashedPassword });

    res.status(201).json({ message: 'Registration successful.', user: toPublicUser(user) });
  } catch (error) {
    if (error.code === 11000) { // race condition caught by the unique index
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    console.error('Register error:', error.message);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+password');
    const passwordMatches = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);

    // Same message for unknown email and wrong password.
    if (!user || !passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '1d'
    });

    res.status(200).json({ token, user: toPublicUser(user) });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// GET /api/auth/me
const getMe = (req, res) => {
  res.status(200).json({ user: req.user });
};

module.exports = { register, login, getMe };
