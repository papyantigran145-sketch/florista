// db.js — Florista database connection pool (MySQL / TiDB Cloud)
import mysql from 'mysql2/promise';
import 'dotenv/config';

// TiDB Cloud (Serverless) требует TLS-подключение.
// Поставь DB_SSL=true в переменных окружения на Render — и пул включит TLS.
const useSSL = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306, // TiDB Serverless — 4000
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  ...(useSSL ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } } : {}),
});

// Smoke-test on startup so misconfiguration is caught immediately
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL/TiDB connected successfully');
    conn.release();
  } catch (err) {
    console.error('❌  Database connection failed:', err.message);
    process.exit(1);
  }
})();

export default pool;
