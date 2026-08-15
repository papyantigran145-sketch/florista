import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import pool from './src/config/db.js';
import { createServer } from 'http';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// === Health check ===
app.get('/api/health', (req, res) => res.json({ ok: true }));

// === Товары ===
app.get('/api/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// ЧАТ API
// ============================================

// Получить историю
app.get('/api/chat/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const [rows] = await pool.query(
      `SELECT id, sender_role as \`from\`, message as text,
              UNIX_TIMESTAMP(created_at) * 1000 as ts,
              edited, deleted
       FROM chat_messages
       WHERE room_id = ? AND deleted = 0
       ORDER BY id ASC LIMIT 200`,
      [roomId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Отправить сообщение
app.post('/api/chat/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { text, from } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: 'Текст обязателен' });

    const senderRole = (from === 'admin') ? 'admin' : 'client';
    const [result] = await pool.query(
      `INSERT INTO chat_messages (room_id, sender_role, message) VALUES (?, ?, ?)`,
      [roomId, senderRole, text.trim()]
    );
    const [rows] = await pool.query(
      `SELECT id, sender_role as \`from\`, message as text,
              UNIX_TIMESTAMP(created_at) * 1000 as ts,
              edited, deleted
       FROM chat_messages WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Редактировать сообщение
app.put('/api/chat/:roomId/:msgId', async (req, res) => {
  try {
    const { roomId, msgId } = req.params;
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Текст обязателен' });
    }
    await pool.query(
      `UPDATE chat_messages SET message = ?, edited = 1 WHERE id = ? AND room_id = ?`,
      [text.trim(), msgId, roomId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Удалить сообщение
app.delete('/api/chat/:roomId/:msgId', async (req, res) => {
  try {
    const { roomId, msgId } = req.params;
    await pool.query(
      `UPDATE chat_messages SET deleted = 1 WHERE id = ? AND room_id = ?`,
      [msgId, roomId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Удалить все сообщения в комнате
app.delete('/api/chat/:roomId/all', async (req, res) => {
  try {
    const { roomId } = req.params;
    await pool.query(
      `DELETE FROM chat_messages WHERE room_id = ?`,
      [roomId]
    );
    res.json({ success: true, message: `Все сообщения в ${roomId} удалены` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Получить сессии для админа
app.get('/api/admin/chat/sessions', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT room_id, MAX(created_at) as last_activity,
       (SELECT COUNT(*) FROM chat_messages WHERE room_id = c.room_id AND sender_role = 'client' AND read_at IS NULL) as unread
       FROM chat_messages c
       WHERE room_id NOT LIKE 'admin-%'
       GROUP BY room_id
       ORDER BY last_activity DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================
// КОНТАКТЫ (сообщения из формы)
// ============================================

// Получить все сообщения
app.get('/api/admin/contacts', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT * FROM contact_messages WHERE status != 'deleted' ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Удалить сообщение
app.delete('/api/admin/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE contact_messages SET status = 'deleted' WHERE id = ?`,
      [id]
    );
    res.json({ success: true, message: 'Сообщение удалено' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Редактировать сообщение
app.put('/api/admin/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Текст обязателен' });
    }
    await pool.query(
      `UPDATE contact_messages SET message = ? WHERE id = ? AND status != 'deleted'`,
      [message.trim(), id]
    );
    res.json({ success: true, message: 'Сообщение обновлено' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === 404 ===
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Not found: ${req.method} ${req.originalUrl}` });
});

// === Запуск ===
const server = createServer(app);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🌸 Florista API running → http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  console.log('⏹ Остановка сервера...');
  await pool.end();
  process.exit(0);
});

// === Очистить все чаты ===
app.delete('/api/admin/chat/clear-all', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE chat_messages');
    res.json({ success: true, message: 'Все чаты очищены' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === Получить товары с поддержкой языка ===
app.get('/api/products/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const { category, sort, min_price, max_price } = req.query;

    const allowedLangs = ['ru','en','hy','uk','de','fr','es','pt','zh','ja','ar','fa','ko','fi','pl','sr','it','tr'];
    const langCode = allowedLangs.includes(lang) ? lang : 'ru';

    let sql = `
      SELECT p.*,
        COALESCE(
          CASE WHEN p.name_${langCode} IS NOT NULL AND p.name_${langCode} != '' THEN p.name_${langCode} ELSE p.name END,
          p.name
        ) as display_name,
        COALESCE(
          CASE WHEN p.description_${langCode} IS NOT NULL AND p.description_${langCode} != '' THEN p.description_${langCode} ELSE p.description END,
          p.description
        ) as display_description,
        COALESCE(AVG(r.rating),0) as avg_rating,
        COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (category)  { sql += ' AND p.category_id = ?'; params.push(parseInt(category)); }
    if (min_price) { sql += ' AND p.price >= ?';       params.push(parseFloat(min_price)); }
    if (max_price) { sql += ' AND p.price <= ?';       params.push(parseFloat(max_price)); }

    const sortMap = { 
      price_asc: 'price ASC', 
      price_desc: 'price DESC', 
      newest: 'p.created_at DESC', 
      discount: 'discount DESC' 
    };
    sql += ` GROUP BY p.id ORDER BY ${sortMap[sort] || 'p.created_at DESC'}`;

    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === Получить категории с поддержкой языка ===
app.get('/api/categories/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const allowedLangs = ['ru','en','hy','uk','de','fr','es','pt','zh','ja','ar','fa','ko','fi','pl','sr','it','tr'];
    const langCode = allowedLangs.includes(lang) ? lang : 'ru';

    const [rows] = await pool.query(`
      SELECT 
        id,
        COALESCE(
          CASE WHEN name_${langCode} IS NOT NULL AND name_${langCode} != '' THEN name_${langCode} ELSE name END,
          name
        ) as name
      FROM categories 
      ORDER BY id
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === ПОЛУЧИТЬ ТОВАРЫ С ПОДДЕРЖКОЙ ЯЗЫКА ===
app.get('/api/products/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const { category, sort, min_price, max_price } = req.query;
    
    const allowedLangs = ['ru','en','hy','uk','de','fr','es','pt','zh','ja','ar','fa','ko','fi','pl','sr','it','tr'];
    const langCode = allowedLangs.includes(lang) ? lang : 'ru';
    
    let sql = `
      SELECT p.*,
        COALESCE(
          CASE WHEN p.name_${langCode} IS NOT NULL AND p.name_${langCode} != '' THEN p.name_${langCode} ELSE p.name END,
          p.name
        ) as display_name,
        COALESCE(
          CASE WHEN p.description_${langCode} IS NOT NULL AND p.description_${langCode} != '' THEN p.description_${langCode} ELSE p.description END,
          p.description
        ) as display_description,
        COALESCE(AVG(r.rating),0) as avg_rating,
        COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    if (category)  { sql += ' AND p.category_id = ?'; params.push(parseInt(category)); }
    if (min_price) { sql += ' AND p.price >= ?';       params.push(parseFloat(min_price)); }
    if (max_price) { sql += ' AND p.price <= ?';       params.push(parseFloat(max_price)); }
    
    const sortMap = { 
      price_asc: 'price ASC', 
      price_desc: 'price DESC', 
      newest: 'p.created_at DESC', 
      discount: 'discount DESC' 
    };
    sql += ` GROUP BY p.id ORDER BY ${sortMap[sort] || 'p.created_at DESC'}`;
    
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// === ПОЛУЧИТЬ КАТЕГОРИИ С ПОДДЕРЖКОЙ ЯЗЫКА ===
app.get('/api/categories/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const allowedLangs = ['ru','en','hy','uk','de','fr','es','pt','zh','ja','ar','fa','ko','fi','pl','sr','it','tr'];
    const langCode = allowedLangs.includes(lang) ? lang : 'ru';
    
    const [rows] = await pool.query(`
      SELECT 
        id,
        COALESCE(
          CASE WHEN name_${langCode} IS NOT NULL AND name_${langCode} != '' THEN name_${langCode} ELSE name END,
          name
        ) as name
      FROM categories 
      ORDER BY id
    `);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
