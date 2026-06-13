// server.js — Florista REST API
import express           from 'express';
import cors              from 'cors';
import multer            from 'multer';
import path              from 'path';
import crypto            from 'crypto';
import bcrypt            from 'bcryptjs';
import Stripe            from 'stripe';
import nodemailer        from 'nodemailer';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import pool              from './db.js';
import { createServer }  from 'http';
import { Server }        from 'socket.io';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app        = express();
const httpServer = createServer(app);
const io         = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || '*', credentials: true },
});
const PORT   = process.env.PORT || 5000;
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// ─── Безопасность: ключи ──────────────────────────────────────────────────
// ADMIN_KEY    — специальный ключ-пароль для входа в админ-панель без аккаунта
// TOKEN_SECRET — секрет для подписи токенов (обязательно поменяй в проде!)
const ADMIN_KEY    = process.env.ADMIN_KEY    || '<-2rfc+cc-sudo+r/m/f/m(autofix)>';
const TOKEN_SECRET = process.env.TOKEN_SECRET || 'change-me-in-production';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 часов

// ─── Простые подписанные токены (HMAC, без внешних зависимостей) ─────────
function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  const sig  = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyToken(token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

// Читает токен из заголовка Authorization: Bearer <token>
function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  req.user = token ? verifyToken(token) : null;
  // Альтернатива: специальный ключ-пароль администратора
  if (!req.user && req.headers['x-admin-key'] && req.headers['x-admin-key'] === ADMIN_KEY) {
    req.user = { id: 0, role: 'admin', name: 'Key Admin' };
  }
  next();
}

// Доступ только указанным ролям
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Нет доступа. Войдите с нужной ролью.' });
    }
    next();
  };
}

const requireAdmin = requireRole('admin');
const requireStaff = requireRole('staff', 'admin');
const requireAuth  = (req, res, next) =>
  req.user && req.user.id ? next() : res.status(401).json({ success: false, message: 'Требуется вход в аккаунт' });

// ─── Алгоритм Луна — проверка реальности номера карты ────────────────────
// Отсекает невозможные номера ДО любого обращения к банку:
// если контрольная цифра не сходится, такой карты не может существовать ни у кого.
function luhnCheck(number) {
  const digits = String(number || '').replace(/[\s-]/g, '');
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0, dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d; dbl = !dbl;
  }
  return sum % 10 === 0;
}

function detectBrand(number) {
  const n = String(number || '').replace(/[\s-]/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(9051|999)/.test(n)) return 'arca'; // локальные карты ArCa
  if (/^6/.test(n)) return 'discover';
  return 'card';
}

// ─── Настройка Gmail транспортера ───
let transporter = null;
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  console.log('📧 Gmail transporter configured');
} else {
  console.log('⚠️ Gmail not configured, emails will log to console');
}

// ─── In-memory chat rooms ─────────────────────────────────────────────────
const chatRooms = new Map();

function broadcastSessions(socket) {
  const sessions = [...chatRooms.entries()].map(([id, msgs]) => {
    const visible = msgs.filter(m => !m.deleted);
    return {
      sessionId: id,
      lastMsg: visible[visible.length - 1] || null,
      unread: visible.filter(m => m.from === 'client' && !m.read).length,
    };
  });
  socket.emit('admin:sessions', sessions);
}

io.on('connection', (socket) => {
  const sessionId = socket.handshake.query.sessionId;
  if (!sessionId) return;
  socket.join(sessionId);

  const history = (chatRooms.get(sessionId) || []).filter(m => !m.deleted);
  socket.emit('chat:history', history);

  socket.on('admin:join', () => {
    socket.join('admin-room');
    broadcastSessions(socket);
  });

  socket.on('admin:watchSession', ({ targetSessionId }) => {
    socket.join(targetSessionId);
    const history = (chatRooms.get(targetSessionId) || []).filter(m => !m.deleted);
    socket.emit('chat:history', history);
  });

  socket.on('admin:markRead', ({ targetSessionId }) => {
    const msgs = chatRooms.get(targetSessionId);
    if (msgs) msgs.forEach(m => { if (m.from === 'client') m.read = true; });
    io.to('admin-room').emit('admin:readUpdate', { sessionId: targetSessionId });
  });

  socket.on('admin:send', ({ targetSessionId, text }) => {
    if (!text?.trim()) return;
    const msg = { id: Math.random().toString(36).slice(2) + Date.now(), from: 'admin', text: text.trim(), ts: Date.now(), edited: false, deleted: false, read: true };
    if (!chatRooms.has(targetSessionId)) chatRooms.set(targetSessionId, []);
    chatRooms.get(targetSessionId).push(msg);
    io.to(targetSessionId).emit('chat:message', msg);
    io.to('admin-room').emit('admin:newMessage', { sessionId: targetSessionId, msg });
  });

  socket.on('chat:send', ({ text, from }) => {
    if (!text?.trim()) return;
    const msg = { id: Math.random().toString(36).slice(2) + Date.now(), from, text: text.trim(), ts: Date.now(), edited: false, deleted: false, read: false };
    if (!chatRooms.has(sessionId)) chatRooms.set(sessionId, []);
    chatRooms.get(sessionId).push(msg);
    io.to(sessionId).emit('chat:message', msg);
    io.to('admin-room').emit('admin:newMessage', {
      sessionId,
      msg,
      unread: chatRooms.get(sessionId).filter(m => m.from === 'client' && !m.read).length,
    });
  });

  socket.on('chat:edit', ({ msgId, newText, targetSessionId }) => {
    const roomId = targetSessionId || sessionId;
    const msgs = chatRooms.get(roomId);
    if (!msgs) return;
    const msg = msgs.find(m => m.id === msgId);
    if (!msg) return;
    msg.text = newText.trim();
    msg.edited = true;
    io.to(roomId).emit('chat:edited', { msgId, newText: msg.text, roomId });
    io.to('admin-room').emit('chat:edited', { msgId, newText: msg.text, roomId });
  });

  socket.on('chat:delete', ({ msgId, targetSessionId }) => {
    const roomId = targetSessionId || sessionId;
    const msgs = chatRooms.get(roomId);
    if (!msgs) return;
    const msg = msgs.find(m => m.id === msgId);
    if (!msg) return;
    msg.deleted = true;
    io.to(roomId).emit('chat:deleted', { msgId, roomId });
    io.to('admin-room').emit('chat:deleted', { msgId, roomId });
  });

  socket.on('disconnect', () => {});
});

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(attachUser);

// ─── Multer — память (НЕ сохраняет на диск) ───────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const ok = /jpeg|jpg|png|webp|gif/.test(path.extname(file.originalname).toLowerCase())
            && /image\//.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only image files allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function fileToBase64(file) {
  if (!file) return null;
  return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────
function calcPriceFields(price, old_price, discount) {
  const p  = price     ? parseFloat(price)     : null;
  const op = old_price ? parseFloat(old_price) : null;
  let   d  = discount  ? parseInt(discount)    : 0;
  if (p && op && op > p) {
    d = Math.round((1 - p / op) * 100);
  } else if (op && d > 0 && !p) {
    return { price: +(op * (1 - d/100)).toFixed(2), old_price: op, discount: d };
  }
  return { price: p, old_price: op || null, discount: d };
}

function publicUser(row) {
  const { password, ...u } = row;
  return u;
}

// Рамка фирменного письма
function brandedEmail(title, innerHtml) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff5f7; border-radius: 12px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #c0474a; margin-bottom: 4px;">Florista</h1>
        <h3 style="color: #8b2e30; margin-top: 0;">${title}</h3>
      </div>
      <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
        ${innerHtml}
      </div>
      <div style="text-align: center; font-size: 12px; color: #9a7a88;">
        <p>С любовью, команда Florista</p>
      </div>
    </div>`;
}

// ─── CONTACT FORM (отправка на Gmail) ────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, message, phone } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Заполните все обязательные поля' });
    }

    if (!transporter) {
      console.log('📧 Новое сообщение с сайта:');
      console.log(`  От: ${name} (${email})`);
      console.log(`  Телефон: ${phone || 'не указан'}`);
      console.log(`  Сообщение: ${message}`);
      console.log('─'.repeat(50));
      return res.json({ success: true, message: 'Сообщение получено! Мы свяжемся с вами.' });
    }

    const adminHtml = brandedEmail('Новое сообщение с сайта', `
      <p><strong>Имя:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Телефон:</strong> ${phone}</p>` : ''}
      <p><strong>Сообщение:</strong></p>
      <div style="background: #fef0f3; padding: 15px; border-radius: 8px; margin-top: 10px;">
        ${String(message).replace(/\n/g, '<br/>')}
      </div>
    `);

    await transporter.sendMail({
      from: `"Florista Website" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email,
      subject: `Новое сообщение от ${name}`,
      html: adminHtml,
    });

    if (process.env.SEND_CONFIRMATION === 'true') {
      await transporter.sendMail({
        from: `"Florista Flowers" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Спасибо за ваше сообщение!',
        html: brandedEmail(`Спасибо, ${name}!`, `<p>Мы получили ваше сообщение и свяжемся с вами в ближайшее время.</p>`),
      });
    }

    res.json({ success: true, message: 'Сообщение успешно отправлено!' });
  } catch (error) {
    console.error('Ошибка отправки письма:', error);
    res.status(500).json({ success: false, message: 'Ошибка при отправке. Попробуйте позже.' });
  }
});

// ─── CATEGORIES ───────────────────────────────────────────────────────────
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM categories ORDER BY id');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const { name, name_hy, name_en } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    const [r] = await pool.query(
      'INSERT INTO categories (name, name_hy, name_en) VALUES (?,?,?)',
      [name, name_hy || null, name_en || null]
    );
    res.status(201).json({ success: true, data: { id: r.insertId, name, name_hy, name_en } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Редактирование категории (включая переводы)
app.put('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { name, name_hy, name_en } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'name required' });
    await pool.query(
      'UPDATE categories SET name=?, name_hy=?, name_en=? WHERE id=?',
      [name, name_hy || null, name_en || null, req.params.id]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── AUTH ─────────────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Все поля обязательны' });
    const [ex] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (ex.length) return res.status(409).json({ success: false, message: 'Email уже зарегистрирован' });
    const hash = await bcrypt.hash(password, 10);
    const [r]  = await pool.query('INSERT INTO users (name,email,password) VALUES (?,?,?)', [name, email, hash]);
    const user = { id: r.insertId, name, email, role: 'user', avatar: null };
    const token = signToken({ id: user.id, role: user.role, name: user.name });
    res.status(201).json({ success: true, data: user, token });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email и пароль обязательны' });
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return res.status(401).json({ success: false, message: 'Неверный email или пароль' });
    const u = publicUser(rows[0]);
    const token = signToken({ id: u.id, role: u.role, name: u.name });
    res.json({ success: true, data: u, token });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Вход в админ-панель по специальному ключу-паролю (без аккаунта)
app.post('/api/auth/admin-key', (req, res) => {
  const { key } = req.body;
  if (!key || key !== ADMIN_KEY)
    return res.status(401).json({ success: false, message: 'Неверный ключ доступа' });
  const token = signToken({ id: 0, role: 'admin', name: 'Администратор (ключ)' });
  res.json({ success: true, data: { id: 0, name: 'Администратор (ключ)', role: 'admin' }, token });
});

// Проверка токена (используется панелями при загрузке)
app.get('/api/auth/me', (req, res) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Не авторизован' });
  res.json({ success: true, data: req.user });
});

// ─── ПРОФИЛЬ: аватар ─────────────────────────────────────────────────────
app.put('/api/users/avatar', requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body; // data:image/...;base64,...  или null для удаления
    if (avatar && (!/^data:image\//.test(avatar) || avatar.length > 2_000_000))
      return res.status(400).json({ success: false, message: 'Неверный формат аватара (картинка до ~1.5 МБ)' });
    await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [avatar || null, req.user.id]);
    const [rows] = await pool.query('SELECT id,name,email,role,avatar,created_at FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── СОХРАНЁННЫЕ КАРТЫ (только маскированные данные!) ───────────────────
app.get('/api/users/cards', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, brand, last4, holder, exp_month, exp_year, created_at FROM user_cards WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/users/cards', requireAuth, async (req, res) => {
  try {
    const { number, holder, exp_month, exp_year } = req.body;
    if (!luhnCheck(number))
      return res.status(400).json({ success: false, message: 'Номер карты не прошёл проверку. Такой карты не существует.' });
    const m = parseInt(exp_month), y = parseInt(exp_year);
    if (!(m >= 1 && m <= 12) || !(y >= 2024 && y <= 2050))
      return res.status(400).json({ success: false, message: 'Неверный срок действия карты' });
    const digits = String(number).replace(/[\s-]/g, '');
    const last4  = digits.slice(-4);
    const brand  = detectBrand(digits);
    // Полный номер НЕ сохраняем — только последние 4 цифры
    const [r] = await pool.query(
      'INSERT INTO user_cards (user_id, brand, last4, holder, exp_month, exp_year) VALUES (?,?,?,?,?,?)',
      [req.user.id, brand, last4, holder || null, m, y]
    );
    res.status(201).json({ success: true, data: { id: r.insertId, brand, last4, holder, exp_month: m, exp_year: y } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/users/cards/:id', requireAuth, async (req, res) => {
  try {
    await pool.query('DELETE FROM user_cards WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Публичная проверка номера карты (алгоритм Луна) — без сохранения
app.post('/api/cards/validate', (req, res) => {
  const { number } = req.body;
  const valid = luhnCheck(number);
  res.json({ success: true, valid, brand: valid ? detectBrand(number) : null });
});

// ─── PRODUCTS ─────────────────────────────────────────────────────────────
app.get('/api/products', async (req, res) => {
  try {
    const { category, sort, min_price, max_price } = req.query;
    let sql = `SELECT p.*,
      COALESCE(AVG(r.rating),0) as avg_rating,
      COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN reviews r ON r.product_id = p.id
      WHERE 1=1`;
    const params = [];
    if (category)  { sql += ' AND p.category_id = ?'; params.push(parseInt(category)); }
    if (min_price) { sql += ' AND p.price >= ?';       params.push(parseFloat(min_price)); }
    if (max_price) { sql += ' AND p.price <= ?';       params.push(parseFloat(max_price)); }
    const sortMap = { price_asc: 'price ASC', price_desc: 'price DESC', newest: 'created_at DESC', discount: 'discount DESC' };
    sql += ` GROUP BY p.id ORDER BY ${sortMap[sort] || 'p.created_at DESC'}`;
    const [rows] = await pool.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/admin/products', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, name_hy, name_en, old_price, discount, category_id, description, description_hy, description_en, stock } = req.body;
    if (!name || !req.body.price)
      return res.status(400).json({ success: false, message: 'name and price required' });
    const { price, old_price: op, discount: d } = calcPriceFields(req.body.price, old_price, discount);
    const image_url = fileToBase64(req.file);
    const [r] = await pool.query(
      'INSERT INTO products (name,name_hy,name_en,price,old_price,discount,category_id,image_url,description,description_hy,description_en,stock) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      [name, name_hy || null, name_en || null, price, op, d, category_id ? parseInt(category_id) : null, image_url, description || null, description_hy || null, description_en || null, stock === '' || stock === undefined || stock === null ? null : parseInt(stock)]
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [r.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/admin/products/:id', requireAdmin, upload.single('image'), async (req, res) => {
  try {
    const { name, name_hy, name_en, old_price, discount, category_id, description, description_hy, description_en, stock } = req.body;
    const { price, old_price: op, discount: d } = calcPriceFields(req.body.price, old_price, discount);
    const image_url = req.file ? fileToBase64(req.file) : (req.body.image_url || null);
    await pool.query(
      'UPDATE products SET name=?,name_hy=?,name_en=?,price=?,old_price=?,discount=?,category_id=?,image_url=?,description=?,description_hy=?,description_en=?,stock=? WHERE id=?',
      [name, name_hy || null, name_en || null, price, op, d, category_id ? parseInt(category_id) : null, image_url, description || null, description_hy || null, description_en || null, stock === '' || stock === undefined || stock === null ? null : parseInt(stock), req.params.id]
    );
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const [r] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── REVIEWS ──────────────────────────────────────────────────────────────
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : null;
    res.json({ success: true, data: rows, avg_rating: avg, count: rows.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { author, rating, comment, user_id } = req.body;
    if (!comment || !rating)
      return res.status(400).json({ success: false, message: 'rating и comment обязательны' });
    const [r] = await pool.query(
      'INSERT INTO reviews (product_id, user_id, author, rating, comment) VALUES (?,?,?,?,?)',
      [req.params.id, user_id || null, author || 'Гость', parseInt(rating), comment]
    );
    const [rows] = await pool.query('SELECT * FROM reviews WHERE id = ?', [r.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, p.name AS product_name
      FROM reviews r
      LEFT JOIN products p ON p.id = r.product_id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── USERS (админ) ────────────────────────────────────────────────────────
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, avatar, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Назначение роли: user / staff (работник) / admin
app.put('/api/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'staff', 'admin'].includes(role))
      return res.status(400).json({ success: false, message: 'Роль должна быть user, staff или admin' });
    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── ПРОМОКОДЫ ────────────────────────────────────────────────────────────
function randomPromoCode(len = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без похожих символов O/0, I/1
  let code = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}


// Пополнение склада: «пришло ещё N штук»
app.put('/api/admin/products/:id/restock', requireAdmin, async (req, res) => {
  try {
    const amount = parseInt(req.body.amount);
    if (!(amount >= 1)) return res.status(400).json({ success: false, message: 'Количество должно быть больше 0' });
    await pool.query('UPDATE products SET stock = COALESCE(stock, 0) + ? WHERE id = ?', [amount, req.params.id]);
    const [[p]] = await pool.query('SELECT stock FROM products WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { stock: p ? p.stock : null } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Добавить активации исчерпанному (или любому) промокоду
app.put('/api/admin/promocodes/:id/add-uses', requireAdmin, async (req, res) => {
  try {
    const amount = parseInt(req.body.amount);
    if (!(amount >= 1)) return res.status(400).json({ success: false, message: 'Количество должно быть больше 0' });
    await pool.query('UPDATE promo_codes SET max_uses = max_uses + ? WHERE id = ?', [amount, req.params.id]);
    const [[p]] = await pool.query('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: p });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.get('/api/admin/promocodes', requireAdmin, async (req, res) => {
  try {
    // Источник истины — реальные заказы: пересчитываем used_count
    // по фактическим (не отменённым) заказам с этим кодом. Это чинит любые
    // расхождения счётчика и автоматически возвращает активацию при отмене заказа.
    await pool.query(`
      UPDATE promo_codes p
      SET p.used_count = (
        SELECT COUNT(*) FROM orders o
        WHERE o.promo_code = p.code AND o.status != 'cancelled'
      )`);
    const [rows] = await pool.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Создание: символы — случайно, скидка % и кол-во использований — задаёт админ
app.post('/api/admin/promocodes', requireAdmin, async (req, res) => {
  try {
    const discount = parseInt(req.body.discount_percent);
    const maxUses  = parseInt(req.body.max_uses);
    if (!(discount >= 1 && discount <= 99))
      return res.status(400).json({ success: false, message: 'Скидка должна быть от 1 до 99%' });
    if (!(maxUses >= 1 && maxUses <= 1000000))
      return res.status(400).json({ success: false, message: 'Количество использований от 1 и выше' });

    // генерируем уникальный код
    let code = randomPromoCode();
    for (let i = 0; i < 5; i++) {
      const [ex] = await pool.query('SELECT id FROM promo_codes WHERE code = ?', [code]);
      if (!ex.length) break;
      code = randomPromoCode();
    }
    const [r] = await pool.query(
      'INSERT INTO promo_codes (code, discount_percent, max_uses) VALUES (?,?,?)',
      [code, discount, maxUses]
    );
    res.status(201).json({ success: true, data: { id: r.insertId, code, discount_percent: discount, max_uses: maxUses, used_count: 0, active: 1 } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Добавить активаций к промокоду (например, пришло «пополнение» лимита)
app.put('/api/admin/promocodes/:id/add-uses', requireAdmin, async (req, res) => {
  try {
    const amount = parseInt(req.body.amount);
    if (!(amount >= 1)) return res.status(400).json({ success: false, message: 'Минимум 1 активация' });
    await pool.query('UPDATE promo_codes SET max_uses = max_uses + ?, active = 1 WHERE id = ?', [amount, req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.put('/api/admin/promocodes/:id/toggle', requireAdmin, async (req, res) => {
  try {
    await pool.query('UPDATE promo_codes SET active = 1 - active WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.delete('/api/admin/promocodes/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM promo_codes WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Отправка промокода выбранным пользователям на почту
app.post('/api/admin/promocodes/:id/send', requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body; // массив id пользователей
    if (!Array.isArray(userIds) || !userIds.length)
      return res.status(400).json({ success: false, message: 'Выберите пользователей' });

    const [[promo]] = await pool.query('SELECT * FROM promo_codes WHERE id = ?', [req.params.id]);
    if (!promo) return res.status(404).json({ success: false, message: 'Промокод не найден' });

    const [users] = await pool.query(
      `SELECT name, email FROM users WHERE id IN (${userIds.map(() => '?').join(',')})`,
      userIds
    );
    if (!users.length) return res.status(404).json({ success: false, message: 'Пользователи не найдены' });

    const html = (name) => brandedEmail('Подарок для вас!', `
      <p>Здравствуйте, <strong>${name}</strong>!</p>
      <p>Дарим вам персональный промокод на скидку <strong>${promo.discount_percent}%</strong>:</p>
      <div style="background:#fef0f3; padding:18px; border-radius:10px; text-align:center; margin:14px 0;">
        <span style="font-size:1.6rem; font-weight:bold; letter-spacing:.2em; color:#c0474a;">${promo.code}</span>
      </div>
      <p>Введите его при оформлении заказа на нашем сайте.</p>
      ${process.env.FRONTEND_URL ? `<p style="text-align:center;"><a href="${process.env.FRONTEND_URL}" style="display:inline-block; background:#c0474a; color:#fff; padding:10px 26px; border-radius:8px; text-decoration:none;">Перейти в магазин</a></p>` : ''}
    `);

    let sent = 0;
    if (!transporter) {
      users.forEach(u => console.log(`📧 [DEV] Промокод ${promo.code} → ${u.email}`));
      sent = users.length;
    } else {
      for (const u of users) {
        try {
          await transporter.sendMail({
            from: `"Florista Flowers" <${process.env.GMAIL_USER}>`,
            to: u.email,
            subject: `Ваш промокод на скидку ${promo.discount_percent}%`,
            html: html(u.name),
          });
          sent++;
        } catch (e) { console.error(`Не отправлено ${u.email}:`, e.message); }
      }
    }
    res.json({ success: true, sent, total: users.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Проверка промокода клиентом при оформлении заказа
app.post('/api/promocodes/validate', async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    if (!code) return res.status(400).json({ success: false, message: 'Введите промокод' });
    const [[promo]] = await pool.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM orders o WHERE o.promo_code = p.code AND o.status != 'cancelled') as real_used
       FROM promo_codes p WHERE p.code = ?`, [code]);
    if (!promo || !promo.active)
      return res.status(404).json({ success: false, message: 'Промокод не найден или отключён' });
    if (Math.max(promo.used_count, promo.real_used) >= promo.max_uses)
      return res.status(410).json({ success: false, message: 'Лимит использований промокода исчерпан' });
    res.json({ success: true, data: { code: promo.code, discount_percent: promo.discount_percent } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── РАССЫЛКА (акции и промокоды на почту зарегистрированных) ────────────
app.post('/api/admin/newsletter', requireAdmin, async (req, res) => {
  try {
    const { subject, message, promo_id } = req.body;
    if (!subject || !message)
      return res.status(400).json({ success: false, message: 'Тема и текст обязательны' });

    let promoBlock = '';
    if (promo_id) {
      const [[promo]] = await pool.query('SELECT * FROM promo_codes WHERE id = ?', [promo_id]);
      if (promo) {
        promoBlock = `
          <div style="background:#fef0f3; padding:18px; border-radius:10px; text-align:center; margin:14px 0;">
            <div style="font-size:.85rem; color:#8b2e30; margin-bottom:6px;">Промокод на скидку ${promo.discount_percent}%</div>
            <span style="font-size:1.6rem; font-weight:bold; letter-spacing:.2em; color:#c0474a;">${promo.code}</span>
          </div>`;
      }
    }

    const [users] = await pool.query('SELECT name, email FROM users');
    if (!users.length) return res.status(404).json({ success: false, message: 'Нет зарегистрированных пользователей' });

    let sent = 0;
    if (!transporter) {
      users.forEach(u => console.log(`📧 [DEV] Рассылка "${subject}" → ${u.email}`));
      sent = users.length;
    } else {
      for (const u of users) {
        try {
          await transporter.sendMail({
            from: `"Florista Flowers" <${process.env.GMAIL_USER}>`,
            to: u.email,
            subject,
            html: brandedEmail(subject, `<p>Здравствуйте, <strong>${u.name}</strong>!</p><p>${String(message).replace(/\n/g, '<br/>')}</p>${promoBlock}`),
          });
          sent++;
        } catch (e) { console.error(`Не отправлено ${u.email}:`, e.message); }
      }
    }
    res.json({ success: true, sent, total: users.length });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── PAYMENTS ─────────────────────────────────────────────────────────────
app.post('/api/payment/stripe', async (req, res) => {
  try {
    if (!stripe)
      return res.status(503).json({ success: false, message: 'Stripe не настроен. Добавьте STRIPE_SECRET_KEY в .env' });
    const { amount, currency = 'amd' } = req.body;
    if (!amount || amount < 50)
      return res.status(400).json({ success: false, message: 'Неверная сумма' });
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      automatic_payment_methods: { enabled: true },
    });
    res.json({ success: true, clientSecret: intent.client_secret });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/payment/idram', async (req, res) => {
  try {
    const { amount, orderId } = req.body;
    res.json({
      success: true,
      redirect_url: `https://banking.idram.am/Payment/Pay`,
      params: {
        EDP_LANGUAGE:    'RU',
        EDP_REC_ACCOUNT: process.env.IDRAM_ACCOUNT || 'YOUR_IDRAM_ACCOUNT',
        EDP_DESCRIPTION: `Florista Order #${orderId}`,
        EDP_AMOUNT:      amount,
        EDP_BILL_NO:     orderId,
      },
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

app.post('/api/payment/telcell', async (req, res) => {
  res.json({ success: true, note: 'Требуется подключение к Telcell. Подробнее: https://telcell.am/business' });
});

// ─── ORDERS ───────────────────────────────────────────────────────────────

// Создать заказ (клиент)
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_name, phone, address, comment, payment_method, items, user_id, promo_code, card_number } = req.body;
    if (!customer_name || !phone || !address || !items || !items.length)
      return res.status(400).json({ success: false, message: 'Заполните все обязательные поля' });

    // Если оплата картой — проверяем номер алгоритмом Луна ДО создания заказа.
    // Несуществующий номер отсекается сразу, без запроса в банк.
    if (['card', 'arca'].includes(payment_method) && card_number !== undefined) {
      if (!luhnCheck(card_number))
        return res.status(400).json({ success: false, message: 'Номер карты недействителен: такой карты не существует. Проверьте цифры.' });
    }

    // Сумму считаем на сервере — клиентскому total не доверяем
    let subtotal = 0;
    for (const item of items) {
      const price = parseFloat(item.price) || 0;
      const qty   = parseInt(item.qty) || 1;
      subtotal += price * qty;
    }

    // Промокод: АТОМАРНО резервируем использование одним UPDATE.
    // Если лимит исчерпан или код отключён — affectedRows = 0 и заказ отклоняется.
    let appliedPromo = null;
    let discountAmount = 0;
    if (promo_code) {
      const code = String(promo_code).trim().toUpperCase();
      const [upd] = await pool.query(
        `UPDATE promo_codes SET used_count = used_count + 1
         WHERE code = ? AND active = 1 AND used_count < max_uses
           AND (SELECT COUNT(*) FROM orders o WHERE o.promo_code = code AND o.status != 'cancelled') < max_uses`,
        [code]
      );
      if (!upd.affectedRows) {
        const [[p]] = await pool.query('SELECT used_count, max_uses, active FROM promo_codes WHERE code = ?', [code]);
        const why = !p ? 'Промокод не найден'
          : !p.active ? 'Промокод отключён'
          : 'Лимит использований промокода исчерпан';
        return res.status(400).json({ success: false, message: why });
      }
      const [[promo]] = await pool.query('SELECT * FROM promo_codes WHERE code = ?', [code]);
      appliedPromo   = promo;
      discountAmount = +(subtotal * promo.discount_percent / 100).toFixed(2);
      console.log(`Промокод ${code}: использование ${promo.used_count}/${promo.max_uses}`);
    }

    // ── СКЛАД: проверяем наличие и атомарно списываем остатки ──
    // stock = NULL означает «остаток не отслеживается» (безлимит).
    const decremented = []; // [{id, qty}] — чтобы откатить при ошибке
    for (const item of items) {
      if (!item.product_id) continue;
      const qty = parseInt(item.qty) || 1;
      const [[prod]] = await pool.query('SELECT stock FROM products WHERE id = ?', [item.product_id]);
      if (prod && prod.stock === null) continue; // остаток не отслеживается — безлимит
      const [upd] = await pool.query(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [qty, item.product_id, qty]
      );
      if (!upd.affectedRows) {
        // откатываем уже списанное и сообщаем, чего не хватило
        for (const d of decremented)
          await pool.query('UPDATE products SET stock = stock + ? WHERE id = ?', [d.qty, d.id]);
        if (appliedPromo)
          await pool.query('UPDATE promo_codes SET used_count = used_count - 1 WHERE id = ?', [appliedPromo.id]);
        const [[p]] = await pool.query('SELECT name, stock FROM products WHERE id = ?', [item.product_id]);
        return res.status(400).json({
          success: false,
          message: p
            ? `«${p.name}»: недостаточно на складе (осталось ${p.stock ?? 0} шт.)`
            : 'Товар не найден',
        });
      }
      decremented.push({ id: item.product_id, qty });
    }

    const total = Math.max(0, +(subtotal - discountAmount).toFixed(2));

    const [r] = await pool.query(
      'INSERT INTO orders (user_id, customer_name, phone, address, comment, payment_method, promo_code, discount_amount, total) VALUES (?,?,?,?,?,?,?,?,?)',
      [user_id || null, customer_name, phone, address, comment || null, payment_method || 'cash',
       appliedPromo ? appliedPromo.code : null, discountAmount, total]
    );
    const orderId = r.insertId;

    for (const item of items) {
      await pool.query(
        'INSERT INTO order_items (order_id, product_id, name, price, qty, image_url) VALUES (?,?,?,?,?,?)',
        [orderId, item.product_id || null, item.name, item.price, item.qty, item.image_url || null]
      );
    }

    res.status(201).json({ success: true, data: { id: orderId, total, discount_amount: discountAmount } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Статус заказа по ID (для клиента — отслеживание)
app.get('/api/orders/:id/status', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, status, customer_name, total, created_at, updated_at FROM orders WHERE id = ?',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Заказ не найден' });
    res.json({ success: true, data: rows[0] });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Все заказы (для сотрудников и админов)
app.get('/api/staff/orders', requireStaff, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = 'SELECT * FROM orders';
    const params = [];
    if (status) { sql += ' WHERE status = ?'; params.push(status); }
    sql += ' ORDER BY created_at DESC';
    const [orders] = await pool.query(sql, params);

    for (const order of orders) {
      const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }

    res.json({ success: true, data: orders });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Один заказ полностью (для сотрудников)
app.get('/api/staff/orders/:id', requireStaff, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Заказ не найден' });
    const [items] = await pool.query('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    res.json({ success: true, data: { ...rows[0], items } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Изменить статус заказа (сотрудник)

// Возврат остатков на склад при отмене заказа (выполняется один раз)
async function restockOrder(orderId) {
  const [items] = await pool.query(
    'SELECT product_id, qty FROM order_items WHERE order_id = ? AND product_id IS NOT NULL', [orderId]);
  for (const it of items) {
    await pool.query(
      'UPDATE products SET stock = stock + ? WHERE id = ? AND stock IS NOT NULL',
      [it.qty, it.product_id]
    );
  }
}

app.put('/api/staff/orders/:id/status', requireStaff, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['new','assembling','on_the_way','delivered','cancelled'];
    if (!allowed.includes(status))
      return res.status(400).json({ success: false, message: 'Неверный статус' });
    const [[prev]] = await pool.query('SELECT status FROM orders WHERE id = ?', [req.params.id]);
    await pool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    if (status === 'cancelled' && prev && prev.status !== 'cancelled') await restockOrder(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Отменить заказ (клиент)
app.put('/api/orders/:id/cancel', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT status FROM orders WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Заказ не найден' });
    if (['delivered','cancelled'].includes(rows[0].status))
      return res.status(400).json({ success: false, message: 'Нельзя отменить этот заказ' });
    await pool.query("UPDATE orders SET status='cancelled' WHERE id=?", [req.params.id]);
    await restockOrder(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// ─── STATS (для staff и admin панелей) ───────────────────────────────────
app.get('/api/stats', requireStaff, async (req, res) => {
  try {
    const [[orders]]   = await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(total),0) as revenue FROM orders WHERE status != 'cancelled'");
    const [[today]]    = await pool.query("SELECT COUNT(*) as total, COALESCE(SUM(total),0) as revenue FROM orders WHERE DATE(created_at)=CURDATE() AND status != 'cancelled'");
    const [[pending]]  = await pool.query("SELECT COUNT(*) as total FROM orders WHERE status IN ('new','assembling','on_the_way')");
    const [[products]] = await pool.query('SELECT COUNT(*) as total FROM products');
    const [[reviews]]  = await pool.query('SELECT COUNT(*) as total, COALESCE(AVG(rating),0) as avg FROM reviews');
    const [byStatus]   = await pool.query("SELECT status, COUNT(*) as cnt FROM orders GROUP BY status");
    const [topProducts]= await pool.query(`
      SELECT p.name, SUM(oi.qty) as sold, SUM(oi.qty * oi.price) as revenue
      FROM order_items oi JOIN products p ON p.id = oi.product_id
      GROUP BY oi.product_id, p.name ORDER BY sold DESC LIMIT 5
    `);
    const [byDay] = await pool.query(`
      SELECT DATE(created_at) as day, COUNT(*) as orders, COALESCE(SUM(total),0) as revenue
      FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status != 'cancelled'
      GROUP BY DATE(created_at) ORDER BY day ASC
    `);
    res.json({ success: true, data: { orders, today, pending, products, reviews, byStatus, topProducts, byDay } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Health-check для Render
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ─── Error handler ────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

httpServer.listen(PORT, () => console.log(`🌸  Florista API running → http://localhost:${PORT}`));
