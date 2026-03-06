const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres.xykueobxazkhpcpbudiq:OWmy5AIhqcp9dfMf@aws-1-eu-west-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

bcrypt.hash('password123', 10).then(hash => {
  pool.query('UPDATE users SET password_hash = $1', [hash]).then(r => {
    console.log('✅ Done! Updated', r.rowCount, 'users to password123');
    process.exit();
  }).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
});