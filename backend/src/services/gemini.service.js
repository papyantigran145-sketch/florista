// gemini.js — Вспомогательный модуль: вызов Gemini API и парсинг ответа.
// Вся логика работы с Gemini изолирована здесь, server.js только импортирует функцию.

import { GoogleGenerativeAI } from '@google/generative-ai';

// Инициализация клиента — используем ключ из .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Промпт для генерации товаров. Gemini ОБЯЗАН вернуть чистый JSON-массив.
 * Никакого текста до или после — только валидный JSON.
 */
const SYSTEM_PROMPT = `Ты — генератор каталога цветочного магазина.
Верни ТОЛЬКО валидный JSON-массив и ничего больше — без пояснений, без markdown-блоков, без \`\`\`json.
Каждый объект массива содержит поля:
  name        (строка, название цветка или букета на русском)
  price       (число, цена в армянских драмах, например 5000)
  old_price   (число или null — цена до скидки, если есть)
  discount    (целое число 0–99 — процент скидки, 0 если нет скидки)
  description (строка, краткое описание 1–2 предложения)
  image_url   (строка — data:image/jpeg;base64,... или пустая строка "" если нет картинки)
Пример правильного ответа:
[{"name":"Красная роза","price":3500,"old_price":4500,"discount":22,"description":"Классический символ любви.","image_url":""}]`;

/**
 * Извлекает JSON-массив из ответа Gemini.
 * Gemini иногда оборачивает JSON в ```json ... ``` — чистим это.
 * @param {string} text — сырой текст из ответа модели
 * @returns {Array} — распарсенный массив товаров
 */
function extractArray(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Gemini вернул пустой ответ');
  }

  // Убираем markdown-обёртки: ```json ... ``` или ``` ... ```
  let cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/,      '')
    .replace(/\s*```$/,       '')
    .trim();

  // Ищем первый [ и последний ] — вырезаем только массив
  const start = cleaned.indexOf('[');
  const end   = cleaned.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Gemini не вернул массив. Ответ: ${cleaned.slice(0, 200)}`);
  }
  cleaned = cleaned.slice(start, end + 1);

  const parsed = JSON.parse(cleaned); // бросит SyntaxError если JSON сломан
  if (!Array.isArray(parsed)) {
    throw new Error('Распарсенный ответ Gemini — не массив');
  }
  return parsed;
}

/**
 * Нормализует один объект товара из ответа Gemini:
 * - цены приводит к числу (parseFloat), чтобы не было NaN при расчёте
 * - скидку — к целому (parseInt)
 * - image_url — оставляет строку или null
 * @param {Object} item
 * @returns {Object}
 */
function normalizeItem(item) {
  const price     = parseFloat(item.price)     || 0;
  const old_price = item.old_price != null ? (parseFloat(item.old_price) || null) : null;
  let   discount  = parseInt(item.discount)    || 0;

  // Пересчитываем скидку из цен, если модель дала оба значения
  if (price > 0 && old_price && old_price > price) {
    discount = Math.round((1 - price / old_price) * 100);
  }

  // image_url: принимаем data:... строку или пустую строку → null
  const rawImg    = typeof item.image_url === 'string' ? item.image_url.trim() : '';
  const image_url = rawImg.startsWith('data:') ? rawImg : null;

  return {
    name:        String(item.name        || 'Без названия'),
    price,
    old_price,
    discount,
    description: String(item.description || ''),
    image_url,
  };
}

/**
 * Генерирует список товаров через Gemini API.
 * @param {string} userPrompt — что именно запросил пользователь (например: "5 букетов роз")
 * @returns {Promise<Array>} — массив нормализованных объектов товаров
 */
export async function generateProducts(userPrompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent({
    contents: [
      {
        role: 'user',
        parts: [{ text: `${SYSTEM_PROMPT}\n\nЗапрос: ${userPrompt}` }],
      },
    ],
    generationConfig: {
      temperature:     0.7,
      maxOutputTokens: 4096,
    },
  });

  // Безопасно достаём текст из вложенного ответа Gemini
  const text = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text
            ?? result?.response?.text?.()   // альтернативный метод SDK
            ?? '';

  const rawArray = extractArray(text);
  return rawArray.map(normalizeItem);
}
