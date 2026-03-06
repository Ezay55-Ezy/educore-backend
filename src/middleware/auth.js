const jwt = require('jsonwebtoken');

// ── Protect routes — checks if user has a valid token ──
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if token exists in header
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login first.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please login again.'
    });
  }
};

// ── Admin only routes ──
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admins only.'
    });
  }
  next();
};

// ── Student can only access their own data ──
const ownDataOnly = (req, res, next) => {
  const requestedId = parseInt(req.params.id);
  const isOwnData   = req.user.studentId === requestedId;
  const isAdmin     = req.user.role === 'admin';
  const isTeacher   = req.user.role === 'teacher';

  if (!isOwnData && !isAdmin && !isTeacher) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only view your own data.'
    });
  }
  next();
};

module.exports = { protect, adminOnly, ownDataOnly };
