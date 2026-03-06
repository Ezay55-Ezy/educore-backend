const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  database: 'educore_db',
  user: 'postgres',
  password: '@MnQelbdy'
});
bcrypt.hash('password123', 10).then(hash => {
  pool.query('UPDATE users SET password_hash = $1', [hash]).then(() => {
    console.log('✅ Done! Password reset to password123');
    process.exit();
  });
});
