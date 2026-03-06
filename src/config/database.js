const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host:     process.env.DB_HOST || 'localhost',
        port:     process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'educore_db',
        user:     process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
      }
);

pool.connect()
  .then(() => console.log('✅ Database connected successfully'))
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
  });

module.exports = pool;