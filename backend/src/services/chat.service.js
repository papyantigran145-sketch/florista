// chat-store.js — хранение сообщений техподдержки в MySQL/TiDB.
// Вся работа с таблицей chat_messages изолирована здесь: server.js вызывает
// только эти функции и ничего не знает про SQL.
//
// Формат сообщения, который уходит на фронтенд (не менять — от него зависят
// LiveChat.js и AdminChat.js):
//   { id, from: 'client'|'admin', text, ts, edited, deleted, read }

import pool from './db.js';

// Сколько последних сообщений отдаём при открытии комнаты
const HISTORY_LIMIT = 200;
// Сколько диалогов показываем в списке админа
const SESSIONS_LIMIT = 200;

// ─── DDL ──────────────────────────────────────────────────────────────────
// Дублирует schema.sql: если админ забыл прогнать миграцию на проде,
// таблица создастся сама при старте. Совместимо с MySQL 8 и TiDB.
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS chat_messages (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  room_id     VARCHAR(64)  NOT NULL,
  sender_id   INT UNSIGNED DEFAULT NULL,
  sender_role ENUM('client','admin') NOT NULL DEFAULT 'client',
  message     TEXT         NOT NULL,
  edited      TINYINT(1)   NOT NULL DEFAULT 0,
  deleted     TINYINT(1)   NOT NULL DEFAULT 0,
  read_at     TIMESTAMP    NULL DEFAULT NULL,
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_room_id    (room_id, id),
  KEY idx_room_unread(room_id, sender_role, read_at)
)`;

let ready = false;

export async function initChatStore() {
  try {
    await pool.query(CREATE_TABLE_SQL);
    ready = true;
    console.log('💬  Таблица chat_messages готова — история чата переживёт рестарт');
  } catch (err) {
    ready = false;
    console.error('⚠️  Не удалось подготовить chat_messages:', err.message);
  }
  return ready;
}

export function isChatStoreReady() {
  return ready;
}

// ─── Преобразование строки БД в объект для фронтенда ──────────────────────
// ts считаем на стороне БД (UNIX_TIMESTAMP), чтобы часовой пояс MySQL
// и часовой пояс Node не могли разъехаться.
function rowToMsg(row) {
  return {
    id:      Number(row.id),
    from:    row.sender_role,
    text:    row.deleted ? '' : row.message,
    ts:      Number(row.ts) || 0,
    edited:  Boolean(row.edited),
    deleted: Boolean(row.deleted),
    read:    row.read_at !== null,
  };
}

const SELECT_FIELDS = `
  id, room_id, sender_id, sender_role, message, edited, deleted, read_at,
  CAST(UNIX_TIMESTAMP(created_at) * 1000 AS UNSIGNED) AS ts`;

// ─── Чтение истории комнаты ───────────────────────────────────────────────
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

// ─── Запись нового сообщения ──────────────────────────────────────────────
export async function saveMessage({ roomId, senderId = null, senderRole, text }) {
  const role = senderRole === 'admin' ? 'admin' : 'client';
  // Сообщения оператора сразу считаем прочитанными — счётчик unread
  // существует только для входящих от клиента.
  const [r] = await pool.query(
    `INSERT INTO chat_messages (room_id, sender_id, sender_role, message, read_at)
     VALUES (?, ?, ?, ?, ${role === 'admin' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
    [roomId, senderId, role, text]
  );
  const [rows] = await pool.query(
    `SELECT ${SELECT_FIELDS} FROM chat_messages WHERE id = ?`,
    [r.insertId]
  );
  return rowToMsg(rows[0]);
}

// ─── Редактирование ───────────────────────────────────────────────────────
// allowedRole ограничивает клиента его собственными сообщениями:
// клиент не должен править текст оператора.
export async function editMessage({ roomId, msgId, text, allowedRole = null }) {
  const params = [text, msgId, roomId];
  let sql = `UPDATE chat_messages SET message = ?, edited = 1
             WHERE id = ? AND room_id = ? AND deleted = 0`;
  if (allowedRole) { sql += ' AND sender_role = ?'; params.push(allowedRole); }

  const [r] = await pool.query(sql, params);
  return r.affectedRows > 0;
}

// ─── Мягкое удаление ──────────────────────────────────────────────────────
export async function deleteMessage({ roomId, msgId, allowedRole = null }) {
  const params = [msgId, roomId];
  let sql = `UPDATE chat_messages SET deleted = 1
             WHERE id = ? AND room_id = ? AND deleted = 0`;
  if (allowedRole) { sql += ' AND sender_role = ?'; params.push(allowedRole); }

  const [r] = await pool.query(sql, params);
  return r.affectedRows > 0;
}

// ─── Отметить входящие как прочитанные ────────────────────────────────────
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

// ─── Список диалогов для админ-панели ─────────────────────────────────────
// Служебные комнаты самих операторов ('admin-<timestamp>') в список не идут.
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
    lastMsg:   rowToMsg(row),
    unread:    unreadMap.get(row.room_id) || 0,
  }));
}
