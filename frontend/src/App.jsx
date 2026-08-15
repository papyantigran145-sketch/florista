import React, { Suspense } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from './hooks/useTranslation';
import './App.css';

// Компонент для загрузки переводов
const Loader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

// Компонент с использованием переводов
const HomePage = () => {
  const { t, isRTL } = useTranslation();

  return (
    <div className={`${isRTL ? 'rtl' : 'ltr'}`}>
      <header className="p-4 border-b">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('header.home')}</h1>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* Hero секция */}
        <section className="my-8">
          <p className="text-sm text-gray-500">{t('hero.eyebrow')}</p>
          <h2 className="text-4xl font-bold mt-2">
            {t('hero.title1')} <span className="text-pink-500">{t('hero.title_em')}</span> {t('hero.title2')}
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl">{t('hero.sub')}</p>
          <div className="flex gap-4 mt-6">
            <button className="bg-pink-500 text-white px-6 py-3 rounded-lg hover:bg-pink-600">
              {t('hero.shop_btn')}
            </button>
            <button className="border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50">
              {t('hero.contact_btn')}
            </button>
          </div>
        </section>

        {/* Каталог */}
        <section className="my-12">
          <h3 className="text-2xl font-bold">
            {t('catalog.title')} <span className="text-pink-500">{t('catalog.title_em')}</span>
          </h3>
          
          {/* Сортировка */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              {t('catalog.all')}
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              {t('catalog.sort_newest')}
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              {t('catalog.sort_price_asc')}
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              {t('catalog.sort_price_desc')}
            </button>
            <button className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200">
              {t('catalog.sort_discount')}
            </button>
          </div>
        </section>

        {/* Особенности */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 my-12">
          <div className="p-4 border rounded-lg">
            <h4 className="font-bold">{t('features.delivery')}</h4>
            <p className="text-sm text-gray-500">{t('features.delivery_sub')}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-bold">{t('features.fresh')}</h4>
            <p className="text-sm text-gray-500">{t('features.fresh_sub')}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-bold">{t('features.secure')}</h4>
            <p className="text-sm text-gray-500">{t('features.secure_sub')}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h4 className="font-bold">{t('features.support')}</h4>
            <p className="text-sm text-gray-500">{t('features.support_sub')}</p>
          </div>
        </section>
      </main>

      <footer className="border-t p-4 mt-8">
        <div className="container mx-auto text-center text-sm text-gray-500">
          <p>© 2024 Florista. {t('footer.rights')}</p>
          <p>{t('footer.secured')}</p>
        </div>
      </footer>
    </div>
  );
};

// Главный компонент приложения
function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <Suspense fallback={<Loader />}>
        <HomePage />
      </Suspense>
    </I18nextProvider>
  );
}

export default App;
