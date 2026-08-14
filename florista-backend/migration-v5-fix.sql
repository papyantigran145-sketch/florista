-- migration-v5-fix.sql
-- Приводит РЕАЛЬНУЮ базу (дамп florista.sql от 03.04.2026) в соответствие с server.js.
-- В дампе есть только categories, products, reviews, users — и в products нет колонок,
-- которые код пишет при добавлении товара. Отсюда 500 в админке и на оформлении заказа.
--
-- Скрипт идемпотентный: повторный запуск ничего не сломает.
-- Запуск:  mysql -u root -p florista < migration-v5-fix.sql

-- ─── Хелпер: добавить колонку, если её ещё нет ────────────────────────────
DELIMITER $$
DROP PROCEDURE IF EXISTS add_col_if_missing$$
CREATE PROCEDURE add_col_if_missing(
  IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl VARCHAR(255))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = tbl AND COLUMN_NAME = col
  ) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', ddl);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END$$
DELIMITER ;

-- ─── products: мультиязычие + остатки ────────────────────────────────────
-- server.js пишет эти колонки в INSERT/UPDATE, а i18n.js читает их на фронтенде.
CALL add_col_if_missing('products', 'name_hy',        'VARCHAR(255) DEFAULT NULL AFTER `name`');
CALL add_col_if_missing('products', 'name_en',        'VARCHAR(255) DEFAULT NULL AFTER `name_hy`');
CALL add_col_if_missing('products', 'description_hy', 'TEXT DEFAULT NULL AFTER `description`');
CALL add_col_if_missing('products', 'description_en', 'TEXT DEFAULT NULL AFTER `description_hy`');
-- NULL = остаток не отслеживается, 0 = нет в наличии
CALL add_col_if_missing('products', 'stock',          'INT UNSIGNED DEFAULT NULL');

-- ─── categories: мультиязычие ────────────────────────────────────────────
CALL add_col_if_missing('categories', 'name_hy', 'VARCHAR(100) DEFAULT NULL');
CALL add_col_if_missing('categories', 'name_en', 'VARCHAR(100) DEFAULT NULL');

-- ─── users: роль staff + аватар ──────────────────────────────────────────
CALL add_col_if_missing('users', 'avatar', 'LONGTEXT DEFAULT NULL');
ALTER TABLE `users` MODIFY `role` ENUM('user','staff','admin') NOT NULL DEFAULT 'user';

-- ─── AUTO_INCREMENT там, где его нет ─────────────────────────────────────
-- В дампе AUTO_INCREMENT проставлен не всем таблицам; без него INSERT падает.
ALTER TABLE `categories` MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `products`   MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;
ALTER TABLE `reviews`    MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT;

-- ─── Отсутствующие таблицы ───────────────────────────────────────────────
-- Без них не работают: оформление заказа, промокоды, сохранённые карты.
CREATE TABLE IF NOT EXISTS `orders` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`         INT UNSIGNED DEFAULT NULL,
  `customer_name`   VARCHAR(100) NOT NULL,
  `phone`           VARCHAR(30)  NOT NULL,
  `address`         TEXT         NOT NULL,
  `comment`         TEXT         DEFAULT NULL,
  `payment_method`  VARCHAR(30)  NOT NULL DEFAULT 'cash',
  `promo_code`      VARCHAR(32)  DEFAULT NULL,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status`          ENUM('new','assembling','on_the_way','delivered','cancelled') NOT NULL DEFAULT 'new',
  `total`           DECIMAL(10,2) NOT NULL,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `order_items` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id`   INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED DEFAULT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `price`      DECIMAL(10,2) NOT NULL,
  `qty`        INT UNSIGNED NOT NULL DEFAULT 1,
  `image_url`  LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`order_id`)   REFERENCES `orders`(`id`)   ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `promo_codes` (
  `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code`             VARCHAR(32)  NOT NULL UNIQUE,
  `discount_percent` TINYINT UNSIGNED NOT NULL,
  `max_uses`         INT UNSIGNED NOT NULL DEFAULT 1,
  `used_count`       INT UNSIGNED NOT NULL DEFAULT 0,
  `active`           TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Полный номер карты и CVV НЕ хранятся — только бренд, последние 4 цифры и срок.
CREATE TABLE IF NOT EXISTS `user_cards` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`    INT UNSIGNED NOT NULL,
  `brand`      VARCHAR(20)  NOT NULL DEFAULT 'card',
  `last4`      CHAR(4)      NOT NULL,
  `holder`     VARCHAR(100) DEFAULT NULL,
  `exp_month`  TINYINT UNSIGNED NOT NULL,
  `exp_year`   SMALLINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `chat_messages` (
  `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `room_id`     VARCHAR(64)  NOT NULL,
  `sender_id`   INT UNSIGNED DEFAULT NULL,
  `sender_role` ENUM('client','admin') NOT NULL DEFAULT 'client',
  `message`     TEXT         NOT NULL,
  `edited`      TINYINT(1)   NOT NULL DEFAULT 0,
  `deleted`     TINYINT(1)   NOT NULL DEFAULT 0,
  `read_at`     TIMESTAMP    NULL DEFAULT NULL,
  `created_at`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_room_id`     (`room_id`, `id`),
  KEY `idx_room_unread` (`room_id`, `sender_role`, `read_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP PROCEDURE IF EXISTS add_col_if_missing;

