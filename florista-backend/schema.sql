-- Florista — полная схема БД (MySQL / TiDB совместимая)
-- Для TiDB Cloud: базу создаёшь в консоли, затем выполняешь этот файл.
CREATE DATABASE IF NOT EXISTS florista;
USE florista;

CREATE TABLE IF NOT EXISTS categories (
  id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS products (
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  name        VARCHAR(255)     NOT NULL,
  price       DECIMAL(10,2)    NOT NULL,
  old_price   DECIMAL(10,2)    DEFAULT NULL,
  discount    TINYINT UNSIGNED DEFAULT 0,
  category_id INT UNSIGNED     DEFAULT NULL,
  image_url   LONGTEXT         DEFAULT NULL,
  description TEXT             DEFAULT NULL,
  stock       INT UNSIGNED     DEFAULT NULL,  -- NULL = остаток не отслеживается
  created_at  TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Роли: user — обычный, staff — сотрудник (staff-панель), admin — администратор
CREATE TABLE IF NOT EXISTS users (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('user','staff','admin') NOT NULL DEFAULT 'user',
  avatar     LONGTEXT     DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

-- Отзывы
CREATE TABLE IF NOT EXISTS reviews (
  id         INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED     NOT NULL,
  user_id    INT UNSIGNED     DEFAULT NULL,
  author     VARCHAR(100)     NOT NULL DEFAULT 'Гость',
  rating     TINYINT UNSIGNED NOT NULL DEFAULT 5,
  comment    TEXT             NOT NULL,
  created_at TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT IGNORE INTO categories (id, name) VALUES
  (1, 'Розы'), (2, 'Полевые цветы'), (3, 'Букеты'), (4, 'Подарки');

-- Заказы
CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED DEFAULT NULL,
  customer_name   VARCHAR(100) NOT NULL,
  phone           VARCHAR(30)  NOT NULL,
  address         TEXT         NOT NULL,
  comment         TEXT         DEFAULT NULL,
  payment_method  VARCHAR(30)  NOT NULL DEFAULT 'cash',
  promo_code      VARCHAR(32)  DEFAULT NULL,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status          ENUM('new','assembling','on_the_way','delivered','cancelled') NOT NULL DEFAULT 'new',
  total           DECIMAL(10,2) NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Состав заказа
CREATE TABLE IF NOT EXISTS order_items (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id   INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED DEFAULT NULL,
  name       VARCHAR(255) NOT NULL,
  price      DECIMAL(10,2) NOT NULL,
  qty        INT UNSIGNED NOT NULL DEFAULT 1,
  image_url  LONGTEXT DEFAULT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Промокоды (символы генерируются случайно в админ-панели,
-- скидку в % и лимит использований задаёт администратор)
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

-- Сохранённые способы оплаты пользователя.
-- ВАЖНО: полный номер карты и CVV НИКОГДА не хранятся —
-- только бренд, последние 4 цифры, срок и имя держателя.
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
