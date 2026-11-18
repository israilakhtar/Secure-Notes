const jwt = require('jsonwebtoken');
const User = require('../models/User');

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

const protect = async (req, res, next) => {
  const header = req.headers.authorization;

  if (typeof header !== 'string') {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const [scheme, token, ...extra] = header.split(' ');
  if (scheme !== 'Bearer' || !token || extra.length > 0) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    // Pinning the algorithm blocks "alg: none" and algorithm-confusion tricks.
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    if (typeof payload.id !== 'string' || !OBJECT_ID_PATTERN.test(payload.id)) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    // Confirms the account still exists (e.g. a deleted user's old token stops working).
    const user = await User.findById(payload.id).select('name email');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token.' });
    }

    req.user = { id: user._id.toString(), name: user.name, email: user.email };
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ message: 'Authentication failed.' });
  }
};

module.exports = protect;
