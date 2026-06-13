// db.js — Florista database connection pool (MySQL / Railway / TiDB Cloud)
import mysql from 'mysql2/promise';
import 'dotenv/config';

// Облачные базы (Railway, TiDB) требуют TLS-подключение.
// DB_SSL=true включает шифрование. rejectUnauthorized:false — потому что
// Railway отдаёт самоподписанный сертификат (соединение всё равно зашифровано).
const useSSL = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  ...(useSSL ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: false } } : {}),
});

// Проверка подключения при старте. Не валим процесс при ошибке —
// сервер поднимется и переподключится, когда база станет доступна.
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅  MySQL connected successfully');
    conn.release();
  } catch (err) {
    console.error('⚠️  Database connection check failed (продолжаем работу):', err.message);
  }
})();

export default pool;