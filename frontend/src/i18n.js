// i18n.js — система переводов для 20 языков
import ru from './locales/ru.json';
import en from './locales/en.json';
import hy from './locales/hy.json';
import uk from './locales/uk.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ar from './locales/ar.json';
import fa from './locales/fa.json';
import ko from './locales/ko.json';
import fi from './locales/fi.json';
import pl from './locales/pl.json';
import sr from './locales/sr.json';
import it from './locales/it.json';
import nl from './locales/nl.json';
import cs from './locales/cs.json';
import el from './locales/el.json';
import hu from './locales/hu.json';

// Все поддерживаемые языки (20 языков)
export const SUPPORTED_LANGUAGES = {
  hy: { name: 'Հայերեն', flag: '🇦🇲', code: 'hy' },
  ru: { name: 'Русский', flag: '🇷🇺', code: 'ru' },
  uk: { name: 'Українська', flag: '🇺🇦', code: 'uk' },
  en: { name: 'English', flag: '🇬🇧', code: 'en' },
  de: { name: 'Deutsch', flag: '🇩🇪', code: 'de' },
  fr: { name: 'Français', flag: '🇫🇷', code: 'fr' },
  es: { name: 'Español', flag: '🇪🇸', code: 'es' },
  pt: { name: 'Português', flag: '🇵🇹', code: 'pt' },
  zh: { name: '中文', flag: '🇨🇳', code: 'zh' },
  ja: { name: '日本語', flag: '🇯🇵', code: 'ja' },
  ar: { name: 'العربية', flag: '🇸🇦', code: 'ar' },
  fa: { name: 'فارسی', flag: '🇮🇷', code: 'fa' },
  ko: { name: '한국어', flag: '🇰🇷', code: 'ko' },
  fi: { name: 'Suomi', flag: '🇫🇮', code: 'fi' },
  pl: { name: 'Polski', flag: '🇵🇱', code: 'pl' },
  sr: { name: 'Српски', flag: '🇷🇸', code: 'sr' },
  it: { name: 'Italiano', flag: '🇮🇹', code: 'it' },
  nl: { name: 'Nederlands', flag: '🇳🇱', code: 'nl' },
  cs: { name: 'Čeština', flag: '🇨🇿', code: 'cs' },
  el: { name: 'Ελληνικά', flag: '🇬🇷', code: 'el' },
  hu: { name: 'Magyar', flag: '🇭🇺', code: 'hu' }
};

// Базовые переводы
const translations = { ru, en, hy, uk, de, fr, es, pt, zh, ja, ar, fa, ko, fi, pl, sr, it, nl, cs, el, hu };

// Функция получения перевода
export function t(key, lang = 'hy') {
  const keys = key.split('.');
  let result = translations[lang] || translations.hy;
  for (const k of keys) {
    if (result && result[k] !== undefined) {
      result = result[k];
    } else {
      return key;
    }
  }
  return result || key;
}

// Хук для React
export function useTranslation(lang = 'hy') {
  return {
    t: (key) => t(key, lang),
    lang,
    supported: SUPPORTED_LANGUAGES
  };
}

// Компонент переключателя языков
import { useState } from 'react';
export function LanguageSelector({ lang, onLangChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'var(--bg-subtle, #f5f5f5)',
          border: '1px solid var(--border, #ddd)',
          borderRadius: '20px',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.85rem'
        }}
      >
        <span>{SUPPORTED_LANGUAGES[lang]?.flag || '🌐'}</span>
        <span>{SUPPORTED_LANGUAGES[lang]?.name || lang}</span>
        <span style={{ fontSize: '0.7rem' }}>▼</span>
      </button>
      
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          background: 'var(--bg-surface, #fff)',
          border: '1px solid var(--border, #ddd)',
          borderRadius: '12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          maxHeight: '300px',
          overflowY: 'auto',
          zIndex: 1000,
          minWidth: '180px',
          padding: '4px 0'
        }}>
          {Object.values(SUPPORTED_LANGUAGES).map((l) => (
            <button
              key={l.code}
              onClick={() => { onLangChange(l.code); setIsOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                width: '100%',
                background: lang === l.code ? 'var(--bg-subtle, #f0f0f0)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                textAlign: 'left',
                transition: 'background 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-subtle, #f0f0f0)'}
              onMouseLeave={(e) => e.currentTarget.style.background = lang === l.code ? 'var(--bg-subtle, #f0f0f0)' : 'transparent'}
            >
              <span>{l.flag}</span>
              <span>{l.name}</span>
              {lang === l.code && <span style={{ marginLeft: 'auto', color: '#c0474a' }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
