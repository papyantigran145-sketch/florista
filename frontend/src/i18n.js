import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Импорт всех файлов локалей
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

const resources = {
  uk: { translation: uk },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  pt: { translation: pt },
  zh: { translation: zh },
  ja: { translation: ja },
  ar: { translation: ar },
  fa: { translation: fa },
  ko: { translation: ko },
  fi: { translation: fi },
  pl: { translation: pl },
  sr: { translation: sr },
  it: { translation: it },
  nl: { translation: nl },
  cs: { translation: cs },
  el: { translation: el },
  hu: { translation: hu }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'uk',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    react: {
      useSuspense: false,
    }
  });

export default i18n;
