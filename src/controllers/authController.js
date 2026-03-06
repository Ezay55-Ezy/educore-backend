const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/database');

// ── POST /api/auth/login ────────────────────────────────────
const login = async (req, res) => {
  try {
    const { admission_no, password } = req.body;

    // 1. Validate input
    if (!admission_no || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide admission number and password.'
      });
    }

    // 2. Find user by admission_no OR email
    const userQuery = await pool.query(
  `SELECT u.*, s.first_name, s.last_name, s.status
   FROM users u
   LEFT JOIN students s ON u.student_id = s.id
   WHERE u.admission_no ILIKE $1 OR u.email ILIKE $1`,
  [admission_no]
);

    if (userQuery.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admission number or password.'
      });
    }

    const user = userQuery.rows[0];

    // 3. Check account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Contact the school office.'
      });
    }

    // 4. Check password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admission number or password.'
      });
    }

    // 5. Update last login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // 6. Build display name (works for both students and admins)
    const displayName = user.first_name
      ? `${user.first_name} ${user.last_name}`
      : (user.email || user.admission_no);

    // 7. Create JWT token
    const token = jwt.sign(
      {
        userId:    user.id,
        studentId: user.student_id,  // ← This is the students table ID
        role:      user.role,
        name:      displayName
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 8. Send response
    // IMPORTANT: user.id here is the students table ID (not users table ID)
    // The dashboard uses this to fetch /api/students/:id/grades etc.
    res.status(200).json({
      success: true,
      message: `Welcome back, ${displayName}!`,
      token,
      user: {
        id:           user.student_id,   // ← dashboard uses this for API calls
        admission_no: user.admission_no,
        email:        user.email,
        name:         displayName,
        role:         user.role,
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ── GET /api/auth/me ────────────────────────────────────────
const getMe = async (req, res) => {
  res.json({
    success: true,
    user: {
      id:   req.user.studentId,
      role: req.user.role,
      name: req.user.name
    }
  });
};

// ── PUT /api/auth/change-password ───────────────────────────
const changePassword = async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const userId = req.user.userId;

    if (!current_password || !new_password) {
      return res.status(400).json({ success: false, message: 'All fields required.' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const match  = await bcrypt.compare(current_password, result.rows[0].password_hash);

    if (!match) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);

    res.json({ success: true, message: 'Password changed successfully.' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { login, getMe, changePassword };