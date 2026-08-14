# Florista — запуск и деплой

Два варианта проекта:
- **florista-local.zip** — для локального теста (`.env` уже настроены под localhost)
- **florista-production.zip** — для хостинга: фронтенд → **Vercel**, бэкенд → **Render**, база → **TiDB Cloud**

---

## 1. Локальный запуск

Нужны: Node.js 18+, MySQL 8 (локально).

```bash
# 1. База данных
mysql -u root -p -e "CREATE DATABASE florista CHARACTER SET utf8mb4"
mysql -u root -p florista < florista-backend/schema.sql
# (если есть дамп с товарами) mysql -u root -p florista < florista.sql
# (если база осталась от старой версии) mysql -u root -p florista < florista-backend/migration.sql

# 2. Бэкенд
cd florista-backend
npm install
npm start            # http://localhost:5000

# 3. Фронтенд (новый терминал)
cd florista-frontend
npm install          # обязательно: добавлена библиотека react-icons
npm start            # http://localhost:3000
```

Если MySQL с паролем — впишите его в `florista-backend/.env` → `DB_PASSWORD`.

---

## 2. Деплой в интернет

### Шаг 0. GitHub
Залейте папки `florista-backend` и `florista-frontend` в репозиторий (можно один репозиторий с двумя папками).

### Шаг 1. База — TiDB Cloud (бесплатный Serverless)
1. Регистрация на https://tidbcloud.com → **Create Cluster** → Serverless (Free).
2. Кластер → **Connect** → скопируйте host, port (**4000**), user, password.
3. Откройте **SQL Editor** (или любой MySQL-клиент) и выполните содержимое `florista-backend/schema.sql`. При желании — импортируйте `florista.sql` с товарами.

### Шаг 2. Бэкенд — Render
1. https://render.com → **New → Web Service** → подключите репозиторий, Root Directory — `florista-backend`.
2. Build: `npm install` · Start: `npm start` · план Free.
   (Либо **New → Blueprint** — в папке уже лежит `render.yaml`.)
3. Environment variables:

| Переменная | Значение |
|---|---|
| `DB_HOST` | host из TiDB |
| `DB_PORT` | `4000` |
| `DB_USER` | user из TiDB |
| `DB_PASSWORD` | password из TiDB |
| `DB_NAME` | `florista` (как назвали базу) |
| `DB_SSL` | `true` ← обязательно для TiDB |
| `FRONTEND_URL` | URL фронтенда с Vercel (добавите после шага 3) |
| `ADMIN_KEY` | свой ключ-пароль для входа в админку |
| `TOKEN_SECRET` | любая длинная случайная строка |
| `GMAIL_USER` | gmail для рассылок (необязательно) |
| `GMAIL_APP_PASSWORD` | app-password Gmail (необязательно) |

4. После деплоя получите URL вида `https://florista-api.onrender.com`. Проверка: `/api/health`.

### Шаг 3. Фронтенд — Vercel
1. https://vercel.com → **Add New → Project** → тот же репозиторий, Root Directory — `florista-frontend` (Vercel сам определит Create React App).
2. Environment variable: `REACT_APP_API_URL = https://<ваш-render>.onrender.com/api`
3. Deploy. Файл `vercel.json` уже настроен, чтобы открывались адреса `/admin` и `/staff`.

### Шаг 4. Связка
Вернитесь в Render и впишите `FRONTEND_URL = https://<ваш-проект>.vercel.app` (для CORS и ссылок в письмах). Redeploy.

> Бесплатный Render «засыпает» после 15 минут простоя — первый запрос может занять ~30 секунд.

---

## 3. Доступы и роли

- **Роли пользователей:** `user` → `staff` (работник) → `admin`.
- **Админ-панель** (`/admin`) — два способа входа:
  - вкладка «Аккаунт»: email и пароль пользователя с ролью `admin`;
  - вкладка «Ключ доступа»: специальный ключ-пароль из переменной `ADMIN_KEY`.
- **Панель сотрудника** (`/staff`) — вход по email/паролю, пускает только роли `staff` и `admin`.
- **Назначить работника/админа:** Админ-панель → «Пользователи» → кнопки «Сделать работником» / «Сделать админом».
- **Первый админ:** войдите в `/admin` по ключу `ADMIN_KEY` и назначьте свою учётку админом во вкладке «Пользователи» (или в БД: `UPDATE users SET role='admin' WHERE email='ваш@email';`).

## 4. Промокоды и рассылка

- **Промокоды:** Админ-панель → «Промокоды». Код генерируется случайно, вы задаёте скидку (%) и число использований. Кнопка «Отправить» — выбираете пользователей, код уходит им на почту. Покупатель вводит код в окне оформления заказа.
- **Рассылка:** Админ-панель → «Рассылка» — тема, текст, опционально промокод; письмо уходит всем зарегистрированным.
- Для реальной отправки нужен Gmail: включите 2FA → создайте App Password → `GMAIL_USER` и `GMAIL_APP_PASSWORD`. Без них письма печатаются в консоль сервера (удобно локально).

## 5. Оплата картой

Номер карты проверяется **алгоритмом Луна** прямо в форме (и повторно на сервере): несуществующие номера отклоняются до обращения к банку. При желании карту можно сохранить — хранится только бренд и последние 4 цифры, полный номер и CVV никогда не записываются.
