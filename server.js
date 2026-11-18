require('dotenv').config();

const path = require('path');
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');

// Fail fast if the signing secret is missing or obviously weak.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 ||
    process.env.JWT_SECRET === 'your_long_random_secret') {
  console.error('JWT_SECRET must be set in .env and be at least 32 characters long.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.disable('x-powered-by');

// Security headers. The CSP blocks inline scripts, which limits the damage of any XSS bug.
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
      "object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Central error handler: never leak stack traces or internals.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON in request body.' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request body is too large.' });
  }
  console.error('Unhandled error:', err.message);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Secure Notes running at http://localhost:${PORT}`));
});
