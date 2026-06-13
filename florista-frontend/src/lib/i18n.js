// Локализация контента из базы (товары, категории).
// У сущности есть поля name/name_hy/name_en и description/description_hy/description_en.
// Берём поле под текущий язык, с откатом на русский (основной), затем на любой непустой.
export function localized(obj, field, lang) {
  if (!obj) return '';
  const ru = obj[field];
  if (lang === 'ru') return ru || obj[`${field}_en`] || obj[`${field}_hy`] || '';
  const val = obj[`${field}_${lang}`];
  return (val && String(val).trim()) ? val : (ru || '');
}

// Удобные шорткаты
export const pName = (p, lang) => localized(p, 'name', lang);
export const pDesc = (p, lang) => localized(p, 'description', lang);
export const cName = (c, lang) => localized(c, 'name', lang);
