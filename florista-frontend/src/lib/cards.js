// lib/cards.js — проверка банковских карт (алгоритм Луна) и определение бренда.
// Алгоритм Луна отсекает несуществующие номера ДО отправки запроса в банк:
// если контрольная сумма не сходится — такой карты не может быть ни у кого.

export function luhnCheck(number) {
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

export function detectBrand(number) {
  const n = String(number || '').replace(/[\s-]/g, '');
  if (/^4/.test(n)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'mastercard';
  if (/^3[47]/.test(n)) return 'amex';
  if (/^(9051|999)/.test(n)) return 'arca';
  if (/^6/.test(n)) return 'discover';
  return 'card';
}

export const BRAND_LABELS = {
  visa: 'Visa', mastercard: 'MasterCard', amex: 'Amex',
  arca: 'ArCa', discover: 'Discover', card: 'Карта',
};

// Красивое форматирование: 4111 1111 1111 1111
export function formatCardNumber(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
}

// ММ/ГГ
export function formatExpiry(value) {
  const d = String(value || '').replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
}

export function parseExpiry(value) {
  const [m, y] = String(value || '').split('/');
  const month = parseInt(m, 10);
  let year = parseInt(y, 10);
  if (year < 100) year += 2000;
  return { month, year };
}

export function expiryValid(value) {
  const { month, year } = parseExpiry(value);
  if (!(month >= 1 && month <= 12) || !year || Number.isNaN(year)) return false;
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}
