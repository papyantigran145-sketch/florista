-- ============================================================
-- Florista — БАЗА С ПЕРЕВОДАМИ (RU/HY/EN) + совместима с сервером
-- Собрана из твоего дампа: сохранены 50 товаров, категории,
-- промокоды и аккаунт администратора.
-- Исправлено: orders.total (было total_price), добавлена
-- таблица order_items, убраны дубли-колонки в products,
-- статусы заказов приведены к new/assembling/on_the_way/
-- delivered/cancelled, гостевые заказы разрешены.
--
-- Как применить (phpMyAdmin или консоль):
--   ВНИМАНИЕ: пересоздаёт таблицы florista. Данные товаров,
--   категорий, промокодов и админа сохранятся (они ниже).
--   Старые заказы со сломанной структурой будут очищены.
-- ============================================================
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `florista` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `florista`;

-- Сносим старые таблицы в правильном порядке (из-за внешних ключей)
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `user_cards`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `promo_codes`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `users`;

-- ─────────── users ───────────
CREATE TABLE `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('user','seller','staff','admin') NOT NULL DEFAULT 'user',
  `avatar` LONGTEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────── categories ───────────
CREATE TABLE `categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,            -- RU (основной)
  `name_hy` VARCHAR(100) DEFAULT NULL,     -- армянский
  `name_en` VARCHAR(100) DEFAULT NULL,     -- английский
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────── products ───────────
CREATE TABLE `products` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,            -- RU (основной)
  `name_hy` VARCHAR(255) DEFAULT NULL,     -- армянский
  `name_en` VARCHAR(255) DEFAULT NULL,     -- английский
  `price` DECIMAL(10,2) NOT NULL,
  `old_price` DECIMAL(10,2) DEFAULT NULL,
  `discount` TINYINT UNSIGNED DEFAULT 0,
  `category_id` INT UNSIGNED DEFAULT NULL,
  `image_url` LONGTEXT DEFAULT NULL,
  `description` TEXT DEFAULT NULL,         -- RU (основной)
  `description_hy` TEXT DEFAULT NULL,      -- армянский
  `description_en` TEXT DEFAULT NULL,      -- английский
  `stock` INT UNSIGNED DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────── orders ───────────
-- ВАЖНО: колонка называется `total` (сервер обращается именно к ней),
-- user_id допускает NULL (гостевые заказы), статусы — рабочие.
CREATE TABLE `orders` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `address` TEXT NOT NULL,
  `comment` TEXT DEFAULT NULL,
  `payment_method` VARCHAR(20) NOT NULL DEFAULT 'cash',
  `promo_code` VARCHAR(32) DEFAULT NULL,
  `discount_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(10,2) NOT NULL,
  `status` ENUM('new','assembling','on_the_way','delivered','cancelled') NOT NULL DEFAULT 'new',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────── order_items (этой таблицы не было — добавлена) ───────────
CREATE TABLE `order_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED DEFAULT NULL,
  `name` VARCHAR(255) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `qty` INT UNSIGNED NOT NULL DEFAULT 1,
  `image_url` LONGTEXT DEFAULT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────── promo_codes ───────────
CREATE TABLE `promo_codes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL UNIQUE,
  `discount_percent` TINYINT UNSIGNED NOT NULL,
  `max_uses` INT UNSIGNED NOT NULL DEFAULT 1,
  `used_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────── reviews ───────────
CREATE TABLE `reviews` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED DEFAULT NULL,
  `author` VARCHAR(100) NOT NULL DEFAULT 'Гость',
  `rating` TINYINT UNSIGNED NOT NULL DEFAULT 5,
  `comment` TEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ─────────── user_cards ───────────
CREATE TABLE `user_cards` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `brand` VARCHAR(20) NOT NULL DEFAULT 'card',
  `last4` CHAR(4) NOT NULL,
  `holder` VARCHAR(100) DEFAULT NULL,
  `exp_month` TINYINT UNSIGNED NOT NULL,
  `exp_year` SMALLINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================================
-- ДАННЫЕ (сохранены из твоего дампа)
-- ============================================================

INSERT INTO `categories` (`id`,`name`,`name_hy`,`name_en`) VALUES
(1, 'Розы', 'Վարդեր', 'Roses'),
(2, 'Полевые цветы', 'Դաշտային ծաղիկներ', 'Wildflowers'),
(3, 'Букеты', 'Փնջեր', 'Bouquets'),
(4, 'Подарки', 'Նվերներ', 'Gifts');

INSERT INTO `products` (`id`,`name`,`name_hy`,`name_en`,`price`,`old_price`,`discount`,`category_id`,`image_url`,`description`,`description_hy`,`description_en`,`stock`) VALUES
(1, 'Классическая роза', 'Դասական վարդ', 'Classic Rose', 15000.00, NULL, 47, 1, NULL, 'Идеальный выбор для свидания', 'Իդեալական ընտրություն ժամադրության համար', 'Perfect choice for a date', 76),
(2, 'Белая гортензия', 'Սպիտակ հորտենզիա', 'White Hydrangea', 22000.00, NULL, 53, 1, NULL, 'Нежность в каждом лепестке', 'Քնքշություն յուրաքանչյուր թերթիկում', 'Tenderness in every petal', 128),
(3, 'Букет ромашек', 'Երիցուկների փունջ', 'Daisy Bouquet', 12000.00, NULL, 41, 2, NULL, 'Аромат летнего луга', 'Ամառային մարգագետնի բույր', 'Scent of a summer meadow', 66),
(4, 'Подарочный набор', 'Նվերների հավաքածու', 'Gift Set', 35000.00, NULL, 53, 4, NULL, 'Цветы и сладости вместе', 'Ծաղիկներ և քաղցրավենիք միասին', 'Flowers and sweets together', 158),
(5, 'Роскошные пионы', 'Շքեղ պիոններ', 'Luxury Peonies', 28000.00, NULL, 50, 3, NULL, 'Королевский букет', 'Արքայական փունջ', 'A royal bouquet', 92),
(6, 'Тюльпаны Весна', 'Կակաչներ Գարուն', 'Spring Tulips', 11000.00, NULL, 26, 3, NULL, 'Свежий утренний сбор', 'Թարմ առավոտյան հավաք', 'Fresh morning pick', 127),
(7, 'Подсолнухи', 'Արևածաղիկներ', 'Sunflowers', 16000.00, NULL, 17, 2, NULL, 'Солнце в вашем доме', 'Արևը ձեր տանը', 'Sunshine in your home', 154),
(8, 'Орхидея Фаленопсис', 'Ֆալենոպսիս խոլորձ', 'Phalaenopsis Orchid', 42000.00, NULL, 49, 4, NULL, 'Экзотическая красота', 'Էկզոտիկ գեղեցկություն', 'Exotic beauty', 98),
(9, 'Лилии белые', 'Սպիտակ շուշաններ', 'White Lilies', 20000.00, NULL, 39, 3, NULL, 'Символ чистоты', 'Մաքրության խորհրդանիշ', 'A symbol of purity', 145),
(10, 'Герберы микс', 'Գերբերաների միքս', 'Gerbera Mix', 14000.00, NULL, 14, 1, NULL, 'Яркие краски для настроения', 'Վառ գույներ տրամադրության համար', 'Bright colors for your mood', 65),
(11, 'Авторский букет №1', 'Հեղինակային փունջ №1', 'Designer Bouquet #1', 55000.00, NULL, 28, 3, NULL, 'Фантазия флориста', 'Ծաղկավաճառի ֆանտազիա', 'The florist\'s fantasy', 104),
(12, 'Лаванда сухая', 'Չոր նարդոս', 'Dried Lavender', 10500.00, NULL, 15, 2, NULL, 'Прованс у вас дома', 'Պրովանսը ձեր տանը', 'Provence at your home', 78),
(13, 'Красные розы 51', '51 կարմիր վարդ', '51 Red Roses', 58000.00, NULL, 51, 1, NULL, 'Незабываемый подарок', 'Անմոռանալի նվեր', 'An unforgettable gift', 93),
(14, 'Эустома микс', 'Էուստոմայի միքս', 'Eustoma Mix', 19000.00, NULL, 27, 3, NULL, 'Воздушный и легкий букет', 'Օդային և թեթև փունջ', 'An airy and light bouquet', 131),
(15, 'Корзина с фруктами', 'Մրգերով զամբյուղ', 'Fruit Basket', 45000.00, NULL, 40, 4, NULL, 'Вкусно и красиво', 'Համեղ և գեղեցիկ', 'Tasty and beautiful', 83),
(16, 'Мини-букет', 'Մինի-փունջ', 'Mini Bouquet', 10000.00, NULL, 41, 3, NULL, 'Маленький комплимент', 'Փոքրիկ հաճոյախոսություն', 'A little compliment', 84),
(17, 'Розы персиковые', 'Դեղձագույն վարդեր', 'Peach Roses', 17000.00, NULL, 36, 1, NULL, 'Теплый оттенок', 'Ջերմ երանգ', 'A warm shade', 147),
(18, 'Букет сухоцветов', 'Չորածաղիկների փունջ', 'Dried Flower Bouquet', 13000.00, NULL, 29, 2, NULL, 'Стиль бохо', 'Բոհո ոճ', 'Boho style', 112),
(19, 'Ирисы весенние', 'Գարնանային հիրիկներ', 'Spring Irises', 12000.00, NULL, 29, 3, NULL, 'Глубокий синий цвет', 'Խորը կապույտ գույն', 'A deep blue color', 100),
(20, 'Хризантемы кустовые', 'Թփային քրիզանթեմներ', 'Spray Chrysanthemums', 11500.00, NULL, 55, 1, NULL, 'Стойкость и красота', 'Դիմացկունություն և գեղեցկություն', 'Resilience and beauty', 79),
(21, 'Роза в колбе', 'Վարդ ապակու մեջ', 'Rose in a Glass Dome', 25000.00, NULL, 36, 4, NULL, 'Вечный подарок', 'Հավերժ նվեր', 'An eternal gift', 153),
(22, 'Микс из полевых трав', 'Դաշտային խոտերի միքս', 'Wild Grass Mix', 15500.00, NULL, 43, 2, NULL, 'Эко-стиль', 'Էко-ոճ', 'Eco style', 148),
(23, 'Гвоздики нежные', 'Քնքուշ մեխակներ', 'Delicate Carnations', 10200.00, NULL, 60, 3, NULL, 'Классический вариант', 'Դասական տարբերակ', 'A classic option', 122),
(24, 'Альстромерии', 'Ալստրոմերիաներ', 'Alstroemerias', 18500.00, NULL, 57, 3, NULL, 'Яркий и стойкий букет', 'Վառ և դիմացկուն փունջ', 'A bright and lasting bouquet', 157),
(25, 'Премиум букет 101 роза', 'Պրեմիում փունջ՝ 101 վարդ', 'Premium 101 Roses', 60000.00, NULL, 39, 1, NULL, 'Максимальный эффект', 'Առավելագույն տպավորություն', 'Maximum impact', 86),
(26, 'Композиция в шляпной коробке', 'Կոմպոզիցիա գլխարկի տուփում', 'Hat Box Arrangement', 28000.00, NULL, 46, 4, NULL, 'Современно', 'Ժամանակակից', 'Modern', 137),
(27, 'Розы малиновые', 'Բոսորագույն վարդեր', 'Raspberry Roses', 20000.00, NULL, 30, 1, NULL, 'Яркий акцент', 'Վառ շեշտադրում', 'A bright accent', 154),
(28, 'Букет для невесты', 'Հարսնական փունջ', 'Bridal Bouquet', 48000.00, NULL, 11, 3, NULL, 'Белый шелк', 'Սպիտակ մետաքս', 'White silk', 124),
(29, 'Цветы в сумочке', 'Ծաղիկներ պայուսակում', 'Flowers in a Bag', 24000.00, NULL, 57, 4, NULL, 'Креативный дизайн', 'Կրեատիվ դիզայն', 'Creative design', 160),
(30, 'Сирень в букете', 'Յասաման փնջում', 'Lilac Bouquet', 16500.00, NULL, 42, 3, NULL, 'Весенний аромат', 'Գարնանային բույր', 'A spring fragrance', 113),
(31, 'Каллы белые', 'Սպիտակ կալաներ', 'White Calla Lilies', 32000.00, NULL, 43, 3, NULL, 'Строгая элегантность', 'Խիստ նրբագեղություն', 'Strict elegance', 139),
(32, 'Букет \"Солнечный день\"', 'Փունջ «Արևոտ օր»', '\"Sunny Day\" Bouquet', 14500.00, NULL, 43, 3, NULL, 'Яркие краски', 'Վառ գույներ', 'Bright colors', 63),
(33, 'Фиалки в горшке', 'Մանուշակ կճուճում', 'Potted Violet', 10000.00, NULL, 39, 2, NULL, 'Маленький друг', 'Փոքրիկ ընկեր', 'A little friend', 120),
(34, 'Антуриум', 'Անթուրիում', 'Anthurium', 27000.00, NULL, 16, 3, NULL, 'Экзотическая мощь', 'Էկզոտիկ հզորություն', 'Exotic power', 158),
(35, 'Ранункулюсы', 'Ռանունկուլյուսներ', 'Ranunculus', 29000.00, NULL, 11, 3, NULL, 'Нежные слои лепестков', 'Թերթիկների նուրբ շերտեր', 'Delicate layers of petals', 114),
(36, 'Васильки', 'Կապտածաղիկներ', 'Cornflowers', 11000.00, NULL, 35, 2, NULL, 'Настоящее поле', 'Իսկական դաշտ', 'A real field', 164),
(37, 'Георгины', 'Գեորգիններ', 'Dahlias', 18000.00, NULL, 17, 2, NULL, 'Осенний подарок', 'Աշնանային նվեր', 'An autumn gift', 168),
(38, 'Букет \"Страсть\"', 'Փունջ «Կիրք»', '\"Passion\" Bouquet', 23000.00, NULL, 27, 1, NULL, 'Красные цветы', 'Կարմիր ծաղիկներ', 'Red flowers', 154),
(39, 'Корзина с розами', 'Վարդերով զամբյուղ', 'Rose Basket', 44000.00, NULL, 20, 1, NULL, 'Праздничный формат', 'Տոնական ֆորմատ', 'A festive format', 107),
(40, 'Статица сухоцвет', 'Ստատիցա չորածաղիկ', 'Dried Statice', 12500.00, NULL, 46, 2, NULL, 'Интерьерный букет', 'Ինտերիերի փունջ', 'An interior bouquet', 73),
(41, 'Маттиола', 'Մատտիոլա', 'Matthiola', 17500.00, NULL, 50, 3, NULL, 'Неповторимый аромат', 'Անկրկնելի բույր', 'A unique fragrance', 104),
(42, 'Гортензия розовая', 'Վարդագույն հորտենզիա', 'Pink Hydrangea', 21000.00, NULL, 51, 3, NULL, 'Пышность и объем', 'Փարթամություն և ծավալ', 'Lushness and volume', 136),
(43, 'Астры', 'Աստղածաղիկներ', 'Asters', 13500.00, NULL, 13, 2, NULL, 'Садовое настроение', 'Այգու տրամադրություն', 'A garden mood', 83),
(44, 'Цветочный бокс с макарун', 'Ծաղկային տուփ մակարունով', 'Flower Box with Macarons', 33000.00, NULL, 16, 4, NULL, 'Идеальный презент', 'Իդեալական նվեր', 'The perfect present', 157),
(45, 'Розы с эвкалиптом', 'Վարդեր էվկալիպտով', 'Roses with Eucalyptus', 26000.00, NULL, 56, 1, NULL, 'Трендовый букет', 'Թրենդային փունջ', 'A trendy bouquet', 169),
(46, 'Букет \"Нежность\"', 'Փունջ «Քնքշություն»', '\"Tenderness\" Bouquet', 15000.00, NULL, 14, 3, NULL, 'Пастельные тона', 'Պաստելային երանգներ', 'Pastel tones', 117),
(47, 'Гардения', 'Գարդենիա', 'Gardenia', 31000.00, NULL, 34, 3, NULL, 'Белоснежное чудо', 'Ձյունասպիտակ հրաշք', 'A snow-white wonder', 139),
(48, 'Букет из сухоцветов 2', 'Չորածաղիկների փունջ 2', 'Dried Flower Bouquet 2', 19500.00, NULL, 18, 2, NULL, 'Модный эко-стиль', 'Նորաձև էко-ոճ', 'Fashionable eco style', 139),
(49, 'Микс роз 35 шт', 'Վարդերի միքս՝ 35 հատ', '35 Roses Mix', 38000.00, NULL, 14, 1, NULL, 'Золотая середина', 'Ոսկե միջին', 'The golden mean', 79),
(50, 'VIP композиция', 'VIP կոմպոզիցիա', 'VIP Arrangement', 60000.00, NULL, 58, 4, NULL, 'Эксклюзивный декор', 'Էксկլյուզիվ դեկոր', 'Exclusive decor', 51);

INSERT INTO `promo_codes` (`id`, `code`, `discount_percent`, `max_uses`, `used_count`, `active`, `created_at`) VALUES
(1, 'XM7JT8D2', 10, 1, 0, 1, '2026-06-12 19:57:31');

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `created_at`, `avatar`) VALUES
(3, ' TIgran', 'papyantigran145@gmail.com', '$2b$10$Zuh1js/S6wMgyOaUGtkOMeeX5VT5E5D0xkoGavR/Yl79eacQ6jDYq', 'admin', '2026-04-03 08:56:00', NULL);
