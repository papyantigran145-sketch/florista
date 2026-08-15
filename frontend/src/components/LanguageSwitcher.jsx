import React, { useState } from 'react';
import { SUPPORTED_LANGUAGES } from '../i18n';

const LanguageSwitcher = ({ currentLang, onLanguageChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleLanguageChange = (langCode) => {
    onLanguageChange(langCode);
    setIsOpen(false);
  };

  const currentLangData = SUPPORTED_LANGUAGES[currentLang] || SUPPORTED_LANGUAGES.hy;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Switch language"
      >
        <span className="text-xl">{currentLangData.flag}</span>
        <span className="hidden md:inline">{currentLangData.name}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            {Object.values(SUPPORTED_LANGUAGES).map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left ${
                  currentLang === lang.code ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : ''
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="flex-1">{lang.name}</span>
                {currentLang === lang.code && (
                  <span className="text-blue-500">✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSwitcher;
