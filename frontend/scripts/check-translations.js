const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');

// Проверяем существует ли папка
if (!fs.existsSync(localesDir)) {
  console.log('❌ Папка locales не найдена по пути:', localesDir);
  console.log('📁 Создаем папку locales...');
  fs.mkdirSync(localesDir, { recursive: true });
  console.log('✅ Папка создана, но файлы переводов отсутствуют.');
  console.log('📝 Пожалуйста, создайте файлы переводов в папке src/locales/');
  process.exit(1);
}

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

if (files.length === 0) {
  console.log('❌ В папке locales нет файлов переводов (.json)');
  console.log('📁 Путь:', localesDir);
  process.exit(1);
}

console.log(`📂 Найдено файлов переводов: ${files.length}\n`);

// Загружаем украинский как эталон
let uk;
try {
  uk = JSON.parse(fs.readFileSync(path.join(localesDir, 'uk.json'), 'utf8'));
} catch (e) {
  console.log('❌ Ошибка загрузки uk.json:', e.message);
  console.log('📝 Убедитесь, что файл uk.json существует и валидный JSON');
  process.exit(1);
}

// Функция для получения всех ключей из объекта
const getKeys = (obj, prefix = '') => {
  let keys = [];
  for (const key in obj) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      keys = keys.concat(getKeys(obj[key], newPrefix));
    } else {
      keys.push(newPrefix);
    }
  }
  return keys;
};

const ukKeys = getKeys(uk);

console.log(`✅ Всего ключей в украинском (эталон): ${ukKeys.length}\n`);
console.log('📊 Сравнение файлов:\n');

let totalIssues = 0;

files.forEach(file => {
  const lang = file.replace('.json', '');
  let data;
  try {
    data = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'));
  } catch (e) {
    console.log(`❌ ${lang.toUpperCase()}: Ошибка парсинга JSON`);
    totalIssues++;
    return;
  }
  
  const langKeys = getKeys(data);
  
  const missing = ukKeys.filter(k => !langKeys.includes(k));
  const extra = langKeys.filter(k => !ukKeys.includes(k));
  
  console.log(`📁 ${lang.toUpperCase()}:`);
  console.log(`   Всего ключей: ${langKeys.length}`);
  
  if (missing.length > 0) {
    console.log(`   ❌ Отсутствует: ${missing.length} ключей`);
    if (missing.length <= 5) {
      console.log(`      ${missing.join(', ')}`);
    }
    totalIssues++;
  }
  
  if (extra.length > 0) {
    console.log(`   ⚠️ Лишние: ${extra.length} ключей`);
    if (extra.length <= 5) {
      console.log(`      ${extra.join(', ')}`);
    }
    totalIssues++;
  }
  
  if (missing.length === 0 && extra.length === 0) {
    console.log(`   ✅ Полный перевод`);
  }
  console.log('');
});

if (totalIssues === 0) {
  console.log('🎉 Все файлы переведены полностью!');
} else {
  console.log(`⚠️ Найдено ${totalIssues} проблем. Рекомендуется исправить.`);
}
