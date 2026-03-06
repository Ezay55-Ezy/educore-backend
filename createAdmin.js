const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Database connection using your specific password
const pool = new Pool({
  host: 'localhost',
  database: 'educore_db',
  user: 'postgres',
  password: '@MnQelbdy' // Your confirmed PostgreSQL password
});

async function run() {
  try {
    // This creates the hash for the LOGIN password (admin123)
    const hash = await bcrypt.hash('admin123', 10);
    
    const query = `
      INSERT INTO users (email, admission_no, password_hash, role) 
      VALUES ($1, $2, $3, $4) 
      ON CONFLICT (email) DO UPDATE SET password_hash = $3
    `;
    
    const values = ['admin@educore.com', 'ADMIN-001', hash, 'admin'];
    
    await pool.query(query, values);
    console.log('✅ Done! Admin account (admin@educore.com) is ready.');
    console.log('Use "admin123" to log in to the web panel.');
  } catch (err) {
    console.error('❌ Database Connection Error:', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
}

run();
