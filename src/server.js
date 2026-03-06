require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

// ── MIDDLEWARE ──────────────────────────────────────────────
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:4200', 'http://127.0.0.1:5500'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── REQUEST LOGGER (shows every API call in terminal) ───────
app.use((req, res, next) => {
  const time = new Date().toLocaleTimeString();
  console.log(`[${time}] ${req.method} ${req.path}`);
  next();
});

// ── ROUTES ──────────────────────────────────────────────────
// These must point to the files in your src/routes folder
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/students', require('./routes/students'));
app.use('/api/teacher',  require('./routes/teacher'));  

// ── HEALTH CHECK ────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🎓 EduCore API is running!',
    version: '1.0.0',
    endpoints: {
      auth:     '/api/auth/login',
      students: '/api/students',
      docs:     'See README.md for full API reference'
    }
  });
});

// ── 404 HANDLER ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found.` });
});

// ── ERROR HANDLER ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── START SERVER ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   🎓 EduCore Backend API             ║');
  console.log(`║   Running on http://localhost:${PORT}   ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  console.log('📡 Available endpoints:');
  console.log('   POST /api/auth/login');
  console.log('   GET  /api/auth/me');
  console.log('   GET  /api/students');
  console.log('   GET  /api/students/:id');
  console.log('   GET  /api/students/:id/attendance');
  console.log('   GET  /api/students/:id/fees');
  console.log('   GET  /api/students/:id/grades');
  console.log('');
});