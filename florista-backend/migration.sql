-- Миграция для УЖЕ СУЩЕСТВУЮЩЕЙ базы (если schema.sql уже выполнялся раньше).
-- Выполни эти команды один раз. Если колонка/таблица уже есть — команда просто упадёт с ошибкой, это нормально, переходи к следующей.
USE florista;

ALTER TABLE users  MODIFY role ENUM('user','staff','admin') NOT NULL DEFAULT 'user';
ALTER TABLE users  ADD COLUMN avatar LONGTEXT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN promo_code VARCHAR(32) DEFAULT NULL;
ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS promo_codes (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code             VARCHAR(32)  NOT NULL UNIQUE,
  discount_percent TINYINT UNSIGNED NOT NULL,
  max_uses         INT UNSIGNED NOT NULL DEFAULT 1,
  used_count       INT UNSIGNED NOT NULL DEFAULT 0,
  active           TINYINT(1)   NOT NULL DEFAULT 1,
  created_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS user_cards (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    INT UNSIGNED NOT NULL,
  brand      VARCHAR(20)  NOT NULL DEFAULT 'card',
  last4      CHAR(4)      NOT NULL,
  holder     VARCHAR(100) DEFAULT NULL,
  exp_month  TINYINT UNSIGNED NOT NULL,
  exp_year   SMALLINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- v3: учёт остатков на складе (NULL = безлимит)
ALTER TABLE products ADD COLUMN stock INT UNSIGNED DEFAULT NULL;
