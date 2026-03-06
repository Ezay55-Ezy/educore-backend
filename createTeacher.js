require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  database: 'educore_db', user: 'postgres',
  password: process.env.DB_PASSWORD
});

async function create() {
  const hash = await bcrypt.hash('teacher123', 10);
  await pool.query(
    `INSERT INTO users (email, admission_no, password_hash, role)
     VALUES ('teacher@educore.com', 'TCH-001', $1, 'teacher')
     ON CONFLICT (email) DO UPDATE SET password_hash = $1`,
    [hash]
  );
  console.log('Done! Teacher account created.');
  console.log('Email:    teacher@educore.com');
  console.log('Password: teacher123');
  process.exit();
}
create();
