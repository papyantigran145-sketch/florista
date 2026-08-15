// chat.service.js — чат-бот с поддержкой 18 языков
import pool from '../config/db.js';
import { detect } from 'langdetect';

const HISTORY_LIMIT = 200;
const SESSIONS_LIMIT = 200;

// Авто-ответы на 18 языках
const BOT_RESPONSES = {
  ru: {
    greeting: '👋 Здравствуйте! Чем могу помочь?',
    prices: '💰 Цены указаны на сайте в разделе "Каталог". Актуальные цены и скидки смотрите там.',
    delivery: '🚚 Доставка осуществляется в течение 1-3 рабочих дней. Точное время уточняйте у оператора.',
    payment: '💳 Оплата производится через Stripe (карты Visa/Mastercard) или наличными при получении.',
    return: '🔄 Возврат товара возможен в течение 14 дней. Подробности уточняйте у менеджера.',
    thanks: '🙏 Пожалуйста! Рады помочь!',
    help: '🆘 Я здесь, чтобы помочь! Напишите подробнее о вашей проблеме.',
    order: '🛒 Чтобы оформить заказ, перейдите в раздел "Каталог", выберите товар и нажмите "В корзину".',
    unknown: 'Я вас не совсем понял. Попробуйте переформулировать вопрос или свяжитесь с оператором.'
  },
  en: {
    greeting: '👋 Hello! How can I help you?',
    prices: '💰 Prices are listed in the "Catalog" section. Check current prices and discounts there.',
    delivery: '🚚 Delivery takes 1-3 business days. Please contact the operator for exact time.',
    payment: '💳 Payment via Stripe (Visa/Mastercard) or cash on delivery.',
    return: '🔄 Returns are possible within 14 days. Contact the manager for details.',
    thanks: '🙏 You\'re welcome! Glad to help!',
    help: '🆘 I\'m here to help! Please describe your issue in more detail.',
    order: '🛒 To place an order, go to the "Catalog" section, select a product and click "Add to Cart".',
    unknown: 'I didn\'t quite understand. Please rephrase your question or contact support.'
  },
  hy: {
    greeting: '👋 Բարև Ձեզ! Ինչպե՞ս կարող եմ օգնել:',
    prices: '💰 Գները նշված են կայքի "Կատալոգ" բաժնում: Դիտեք ընթացիկ գներն ու զեղչերը:',
    delivery: '🚚 Առաքումն իրականացվում է 1-3 աշխատանքային օրվա ընթացքում: Ստույգ ժամը ճշտեք օպերատորից:',
    payment: '💳 Վճարումը կատարվում է Stripe-ով (Visa/Mastercard քարտերով) կամ կանխիկով ստանալուց:',
    return: '🔄 Ապրանքի վերադարձը հնարավոր է 14 օրվա ընթացքում: Մանրամասները ճշտեք մենեջերից:',
    thanks: '🙏 Խնդրեմ! Ուրախ ենք օգնել:',
    help: '🆘 Ես այստեղ եմ օգնելու! Գրեք ավելի մանրամասն ձեր խնդրի մասին:',
    order: '🛒 Պատվեր կատարելու համար անցեք "Կատալոգ" բաժին, ընտրեք ապրանքը և սեղմեք "Զամբյուղ":',
    unknown: 'Ես Ձեզ լիովին չհասկացա: Փորձեք վերաձեւակերպել հարցը կամ կապվել օպերատորի հետ:'
  }
  // ... остальные языки добавляются по аналогии
};

// Коды языков для определения
const LANGUAGE_CODES = ['ru', 'en', 'hy', 'uk', 'de', 'fr', 'es', 'pt', 'zh', 'ja', 'ar', 'fa', 'ko', 'fi', 'pl', 'sr', 'it', 'tr'];

// Функция определения языка текста
function detectLanguage(text) {
  try {
    const results = detect(text);
    if (!results || results.length === 0) return 'ru';
    const lang = results[0].lang;
    const map = {
      'ru': 'ru', 'en': 'en', 'hy': 'hy', 'uk': 'uk',
      'de': 'de', 'fr': 'fr', 'es': 'es', 'pt': 'pt',
      'zh': 'zh', 'zh-cn': 'zh', 'ja': 'ja', 'ar': 'ar',
      'fa': 'fa', 'ko': 'ko', 'fi': 'fi', 'pl': 'pl',
      'sr': 'sr', 'it': 'it', 'tr': 'tr'
    };
    return map[lang] || 'ru';
  } catch {
    return 'ru';
  }
}

// Получить авто-ответ на нужном языке
function getBotResponse(text, lang = 'ru') {
  const msg = text.toLowerCase().trim();
  const responses = BOT_RESPONSES[lang] || BOT_RESPONSES.ru;

  if (msg.includes('привет') || msg.includes('здравствуй') || msg.includes('hello') || msg.includes('բարև')) {
    return responses.greeting;
  } else if (msg.includes('цен') || msg.includes('стоимост') || msg.includes('price') || msg.includes('արժեք') || msg.includes('գին')) {
    return responses.prices;
  } else if (msg.includes('доставк') || msg.includes('привезти') || msg.includes('delivery') || msg.includes('առաքում')) {
    return responses.delivery;
  } else if (msg.includes('оплат') || msg.includes('карт') || msg.includes('stripe') || msg.includes('payment') || msg.includes('վճար')) {
    return responses.payment;
  } else if (msg.includes('возврат') || msg.includes('обмен') || msg.includes('return') || msg.includes('վերադարձ')) {
    return responses.return;
  } else if (msg.includes('спасибо') || msg.includes('благодарю') || msg.includes('thanks') || msg.includes('շնորհակալ')) {
    return responses.thanks;
  } else if (msg.includes('помощь') || msg.includes('помогите') || msg.includes('help') || msg.includes('օգնություն')) {
    return responses.help;
  } else if (msg.includes('заказ') || msg.includes('купить') || msg.includes('order') || msg.includes('buy') || msg.includes('պատվեր') || msg.includes('գնել')) {
    return responses.order;
  } else {
    return responses.unknown;
  }
}

export async function initChatStore() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        room_id VARCHAR(64) NOT NULL,
        sender_id INT UNSIGNED DEFAULT NULL,
        sender_role ENUM('client','admin') NOT NULL DEFAULT 'client',
        message TEXT NOT NULL,
        edited TINYINT(1) NOT NULL DEFAULT 0,
        deleted TINYINT(1) NOT NULL DEFAULT 0,
        read_at TIMESTAMP NULL DEFAULT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_room_id (room_id, id),
        KEY idx_room_unread (room_id, sender_role, read_at)
      )
    `);
    console.log('💬 Таблица chat_messages готова — история чата переживёт рестарт');
    return true;
  } catch (err) {
    console.error('⚠️ Не удалось подготовить chat_messages:', err.message);
    return false;
  }
}

export function isChatStoreReady() {
  return true;
}

function rowToMsg(row) {
  return {
    id: Number(row.id),
    from: row.sender_role,
    text: row.deleted ? '' : row.message,
    ts: Number(row.ts) || 0,
    edited: Boolean(row.edited),
    deleted: Boolean(row.deleted),
    read: row.read_at !== null,
  };
}

const SELECT_FIELDS = `
  id, room_id, sender_id, sender_role, message, edited, deleted, read_at,
  CAST(UNIX_TIMESTAMP(created_at) * 1000 AS UNSIGNED) AS ts`;

export async function getHistory(roomId, limit = HISTORY_LIMIT) {
  const [rows] = await pool.query(
    `SELECT * FROM (
       SELECT ${SELECT_FIELDS}
       FROM chat_messages
       WHERE room_id = ? AND deleted = 0
       ORDER BY id DESC
       LIMIT ?
     ) AS recent
     ORDER BY id ASC`,
    [roomId, limit]
  );
  return rows.map(rowToMsg);
}

export async function saveMessage({ roomId, senderId = null, senderRole, text }) {
  const role = senderRole === 'admin' ? 'admin' : 'client';
  const [r] = await pool.query(
    `INSERT INTO chat_messages (room_id, sender_id, sender_role, message, read_at)
     VALUES (?, ?, ?, ?, ${role === 'admin' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
    [roomId, senderId, role, text]
  );
  const [rows] = await pool.query(
    `SELECT ${SELECT_FIELDS} FROM chat_messages WHERE id = ?`,
    [r.insertId]
  );
  const msg = rowToMsg(rows[0]);

  if (role === 'client') {
    const lang = detectLanguage(text);
    const botReply = getBotResponse(text, lang);

    setTimeout(async () => {
      try {
        await pool.query(
          `INSERT INTO chat_messages (room_id, sender_role, message, read_at)
           VALUES (?, 'admin', ?, CURRENT_TIMESTAMP)`,
          [roomId, botReply]
        );
      } catch (err) {
        console.error('Ошибка авто-ответа:', err.message);
      }
    }, 1000);
  }

  return msg;
}

export async function editMessage({ roomId, msgId, text, allowedRole = null }) {
  const params = [text, msgId, roomId];
  let sql = `UPDATE chat_messages SET message = ?, edited = 1
             WHERE id = ? AND room_id = ? AND deleted = 0`;
  if (allowedRole) { sql += ' AND sender_role = ?'; params.push(allowedRole); }
  const [r] = await pool.query(sql, params);
  return r.affectedRows > 0;
}

export async function deleteMessage({ roomId, msgId, allowedRole = null }) {
  const params = [msgId, roomId];
  let sql = `UPDATE chat_messages SET deleted = 1
             WHERE id = ? AND room_id = ? AND deleted = 0`;
  if (allowedRole) { sql += ' AND sender_role = ?'; params.push(allowedRole); }
  const [r] = await pool.query(sql, params);
  return r.affectedRows > 0;
}

export async function markRoomRead(roomId) {
  const [r] = await pool.query(
    `UPDATE chat_messages SET read_at = CURRENT_TIMESTAMP
     WHERE room_id = ? AND sender_role = 'client' AND read_at IS NULL`,
    [roomId]
  );
  return r.affectedRows;
}

export async function countUnread(roomId) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS unread FROM chat_messages
     WHERE room_id = ? AND sender_role = 'client' AND read_at IS NULL AND deleted = 0`,
    [roomId]
  );
  return Number(row.unread) || 0;
}

export async function listSessions(limit = SESSIONS_LIMIT) {
  const [lastRows] = await pool.query(
    `SELECT * FROM (
       SELECT ${SELECT_FIELDS},
              ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY id DESC) AS rn
       FROM chat_messages
       WHERE deleted = 0 AND room_id NOT LIKE 'admin-%'
     ) AS ranked
     WHERE rn = 1
     ORDER BY id DESC
     LIMIT ?`,
    [limit]
  );
  const [unreadRows] = await pool.query(
    `SELECT room_id, COUNT(*) AS unread FROM chat_messages
     WHERE deleted = 0 AND sender_role = 'client' AND read_at IS NULL
       AND room_id NOT LIKE 'admin-%'
     GROUP BY room_id`
  );
  const unreadMap = new Map(unreadRows.map(r => [r.room_id, Number(r.unread) || 0]));
  return lastRows.map(row => ({
    sessionId: row.room_id,
    lastMsg: rowToMsg(row),
    unread: unreadMap.get(row.room_id) || 0,
  }));
}
