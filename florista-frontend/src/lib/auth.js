// lib/auth.js — хранение пользователя и токена, заголовки авторизации
export const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function getUser() {
  try { return JSON.parse(localStorage.getItem('fl_user') || 'null'); } catch { return null; }
}
export function getToken() { return localStorage.getItem('fl_token') || null; }

export function saveSession(user, token) {
  localStorage.setItem('fl_user', JSON.stringify(user));
  if (token) localStorage.setItem('fl_token', token);
}
export function clearSession() {
  localStorage.removeItem('fl_user');
  localStorage.removeItem('fl_token');
}

// Заголовки авторизации пользователя
export function authHeaders(extra = {}) {
  const token = getToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

// Заголовки для админ/staff панелей (отдельный токен сессии панели)
export function panelHeaders(storageKey, extra = {}) {
  const token = sessionStorage.getItem(storageKey) || getToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}
