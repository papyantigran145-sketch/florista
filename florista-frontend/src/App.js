import { useState, useEffect, useCallback } from 'react';
import './index.css';
import './responsive-styles.css';
import {
  FiZap, FiStar, FiTruck, FiLock, FiMessageCircle, FiMapPin, FiPhone,
  FiMail, FiClock, FiUsers, FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi';
import { LuFlower2, LuLeaf } from 'react-icons/lu';
import { saveSession, clearSession } from './lib/auth';

import Header from './components/Header';
import OrderTrack from './components/OrderTrack';
import StaffPanel from './components/StaffPanel';
import Footer from './components/Footer';
import Catalog, { PaymentModal } from './components/Catalog';
import LiveChat from './components/LiveChat';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// ─── Переводы ─────────────────────────────────────────────────────────────
export const TRANSLATIONS = {
  ru: {
    heroEyebrow: 'Лучший цветочный магазин Еревана',
    heroTitle1: 'Цветы, которые',
    heroTitleEm: 'говорят',
    heroTitle2: 'сердцу',
    heroSub: 'Доставка по Еревану: 1–2 часа. Премиальные букеты, доставка в день заказа.',
    heroShop: 'Магазин',
    heroContact: 'Контакты',
    featureDelivery: 'Доставка в день заказа',
    featureSub1: 'По Еревану: 1–2 часа',
    featureFresh: 'Свежие и премиальные',
    featureSub2: 'Прямо от производителей',
    featureSecure: 'Безопасная оплата',
    featureSub3: 'Visa, ArCa, MasterCard',
    featureSupport: 'Поддержка 24/7',
    featureSub4: 'Всегда на связи',
    collectionTitle: 'Наша',
    collectionEm: 'коллекция',
    collectionLink: 'Магазин →',
    aboutEyebrow: 'О нас',
    aboutTitle: 'Создано с',
    aboutTitleEm: 'любовью',
    aboutSub: 'в Ереване',
    aboutP1: 'Основанная в сердце Еревана, Florista с 2015 года дарит радость через цветы.',
    aboutP2: 'Мы убеждены, что цветы — это не просто украшение, а эмоции, ставшие видимыми.',
    aboutBtn: 'Связаться с нами',
    contactTitle: 'Контакты',
    contactAddr: 'Адрес',
    contactAddrVal: 'Ереван, Армения',
    contactPhone: 'Телефон',
    contactEmail: 'Email',
    contactHours: 'Часы работы',
    contactHoursVal: 'Ежедневно 09:00 – 22:00',
    contactForm: 'Напишите нам',
    contactName: 'Имя',
    contactNamePh: 'Ваше имя',
    contactEmailPh: 'your@email.com',
    contactMsg: 'Сообщение',
    contactMsgPh: 'Чем можем помочь?',
    contactSend: 'Отправить',
    allCategories: 'Все',
    sortNewest: 'Новинки',
    sortPriceAsc: 'Цена ↑',
    sortPriceDesc: 'Цена ↓',
    sortDiscount: 'Скидки',
    priceFilter: 'Цена',
    filterApply: 'Применить',
    filterReset: 'Сбросить',
    addToCart: 'Корзина',
    addedToCart: '✓ Добавлено!',
    viewProduct: 'Просмотр',
    wishlist: 'Избранное',
    addToCartModal: 'В корзину',
    reviews: 'Отзывы',
    writeReview: 'Написать отзыв',
    cancelReview: 'Отмена',
    yourRating: 'Ваша оценка',
    yourName: 'Ваше имя (необязательно)',
    reviewPlaceholder: 'Поделитесь впечатлениями о товаре...',
    sendReview: 'Отправить отзыв',
    sending: 'Отправка...',
    noReviews: 'Отзывов пока нет. Будьте первым!',
    loading: 'Загрузка...',
    savings: 'Экономия',
  },
  en: {
    heroEyebrow: 'Yerevan\'s Finest Flower Shop',
    heroTitle1: 'Flowers That',
    heroTitleEm: 'Speak',
    heroTitle2: 'to the Heart',
    heroSub: 'Delivery across Yerevan: 1–2 hours. Premium bouquets, same-day delivery.',
    heroShop: 'Shop',
    heroContact: 'Contact',
    featureDelivery: 'Same-Day Delivery',
    featureSub1: 'In Yerevan: 1–2 hours',
    featureFresh: 'Fresh & Premium',
    featureSub2: 'Direct from growers',
    featureSecure: 'Secure Payment',
    featureSub3: 'Visa, ArCa, MasterCard',
    featureSupport: '24/7 Support',
    featureSub4: 'Always here for you',
    collectionTitle: 'Our',
    collectionEm: 'Collection',
    collectionLink: 'Shop →',
    aboutEyebrow: 'About Florista',
    aboutTitle: 'Crafted with',
    aboutTitleEm: 'Love',
    aboutSub: 'in Yerevan',
    aboutP1: 'Founded in the heart of Yerevan, Florista has been spreading joy through flowers since 2015.',
    aboutP2: 'We believe flowers are not just decoration — they are emotions made visible.',
    aboutBtn: 'Contact us',
    contactTitle: 'Contact',
    contactAddr: 'Address',
    contactAddrVal: 'Yerevan, Armenia',
    contactPhone: 'Phone',
    contactEmail: 'Email',
    contactHours: 'Working Hours',
    contactHoursVal: 'Daily 09:00 – 22:00',
    contactForm: 'Send us a message',
    contactName: 'Name',
    contactNamePh: 'Your name',
    contactEmailPh: 'your@email.com',
    contactMsg: 'Message',
    contactMsgPh: 'How can we help?',
    contactSend: 'Send',
    allCategories: 'All',
    sortNewest: 'Newest',
    sortPriceAsc: 'Price ↑',
    sortPriceDesc: 'Price ↓',
    sortDiscount: 'Discounts',
    priceFilter: 'Price',
    filterApply: 'Apply',
    filterReset: 'Reset',
    addToCart: 'Add to cart',
    addedToCart: '✓ Added!',
    viewProduct: 'View',
    wishlist: 'Wishlist',
    addToCartModal: 'Add to cart',
    reviews: 'Reviews',
    writeReview: 'Write a review',
    cancelReview: 'Cancel',
    yourRating: 'Your rating',
    yourName: 'Your name (optional)',
    reviewPlaceholder: 'Share your impressions...',
    sendReview: 'Submit review',
    sending: 'Sending...',
    noReviews: 'No reviews yet. Be the first!',
    loading: 'Loading...',
    savings: 'Save',
  },
  hy: {
    heroEyebrow: 'Երևանի լավագույն ծաղկի խանութ',
    heroTitle1: 'Ծաղիկներ, որոնք',
    heroTitleEm: 'խոսում են',
    heroTitle2: 'սրտի հետ',
    heroSub: 'Առաքում Երևանով՝ 1–2 ժամ։ Պրեմիում փնջեր, առաքում պատվերի օրը։',
    heroShop: 'Խանութ',
    heroContact: 'Կապ',
    featureDelivery: 'Նույն օրվա առաքում',
    featureSub1: 'Երևանով՝ 1–2 ժամ',
    featureFresh: 'Թարմ և պրեմիում',
    featureSub2: 'Ուղղակիորեն արտադրողներից',
    featureSecure: 'Անվտանգ վճարում',
    featureSub3: 'Visa, ArCa, MasterCard',
    featureSupport: '24/7 աջակցություն',
    featureSub4: 'Միշտ կապի մեջ',
    collectionTitle: 'Մեր',
    collectionEm: 'հավաքածուն',
    collectionLink: 'Խանութ →',
    aboutEyebrow: 'Florista-ի մասին',
    aboutTitle: 'Ստեղծված',
    aboutTitleEm: 'սիրով',
    aboutSub: 'Երևանում',
    aboutP1: 'Հիմնված Երևանի սրտում՝ Florista-ն 2015 թվականից ի վեր ուրախություն է բերում ծաղիկների միջոցով։',
    aboutP2: 'Մենք հավատում ենք, որ ծաղիկները ոչ միայն զարդ են, այլ տեսանելի դարձած հույզեր։',
    aboutBtn: 'Կապվել մեզ հետ',
    contactTitle: 'Կապ',
    contactAddr: 'Հասցե',
    contactAddrVal: 'Երևան, Հայաստան',
    contactPhone: 'Հեռախոս',
    contactEmail: 'Էլ. փոստ',
    contactHours: 'Աշխատանքային ժամեր',
    contactHoursVal: 'Ամեն օր 09:00 – 22:00',
    contactForm: 'Գրեք մեզ',
    contactName: 'Անուն',
    contactNamePh: 'Ձեր անունը',
    contactEmailPh: 'your@email.com',
    contactMsg: 'Հաղորդագրություն',
    contactMsgPh: 'Ինչպե՞ս կարող ենք օգնել',
    contactSend: 'Ուղարկել',
    allCategories: 'Բոլորը',
    sortNewest: 'Նոր',
    sortPriceAsc: 'Գին ↑',
    sortPriceDesc: 'Գին ↓',
    sortDiscount: 'Զեղչեր',
    priceFilter: 'Գին',
    filterApply: 'Կիրառել',
    filterReset: 'Զրոյացնել',
    addToCart: 'Զամբյուղ',
    addedToCart: '✓ Ավելացվեց!',
    viewProduct: 'Տեսնել',
    wishlist: 'Ցանկություն',
    addToCartModal: 'Զամբյուղ',
    reviews: 'Կարծիքներ',
    writeReview: 'Գրել կարծիք',
    cancelReview: 'Չեղարկել',
    yourRating: 'Ձեր գնահատականը',
    yourName: 'Ձեր անունը (կամընտիր)',
    reviewPlaceholder: 'Կիսվեք ձեր տպավորություններով...',
    sendReview: 'Ուղարկել կարծիք',
    sending: 'Ուղարկվում է...',
    noReviews: 'Կարծիքներ դեռ չկան։ Եղեք առաջինը!',
    loading: 'Բեռնում...',
    savings: 'Խնայողություն',
  },
};

async function fetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    return await res.json();
  } catch {
    return { success: false, message: 'Network error' };
  }
}

/* ── Toast ── */
function ToastContainer({ toasts }) {
  return (
    <div className="toast-container" id="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`} style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          {t.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}{t.msg}
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  }, []);
  return { toasts, toast };
}

/* ── App ── */
export default function App() {
  const { toasts, toast } = useToast();

  const [theme, setTheme] = useState(() => localStorage.getItem('fl_theme') || 'light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fl_theme', theme);
  }, [theme]);

  const [lang, setLang] = useState(() => localStorage.getItem('fl_lang') || 'ru');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ru;

  function switchLang(l) {
    setLang(l);
    localStorage.setItem('fl_lang', l);
  }

  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fl_user') || 'null'); } catch { return null; }
  });

  async function onAuthSuccess(userData, token) {
    setUser(userData);
    saveSession(userData, token);
    toast(`${lang === 'ru' ? 'Добро пожаловать' : lang === 'en' ? 'Welcome' : 'Բարի գալուստ'}, ${userData.name}!`);
  }

  // Обновление профиля (например, смена аватара в боковой панели)
  function onUserUpdate(userData) {
    setUser(userData);
    localStorage.setItem('fl_user', JSON.stringify(userData));
  }

  function logout() {
    setUser(null);
    clearSession();
    toast(lang === 'ru' ? 'Вы вышли из системы' : lang === 'en' ? 'Logged out' : 'Դուք դուրս եկաք');
  }

  const [cartItems, setCartItems]   = useState([]);
  const [cartTotal, setCartTotal]   = useState(0);
  const [cartCount, setCartCount]   = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API}/categories`)
      .then(r => r.json())
      .then(d => { if (d.success) setCategories(d.data); });
    createPetals();
  }, []);

  // Плавное появление секций при прокрутке
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('fl-visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.12 });
    const attach = () => document.querySelectorAll('.section, .fl-reveal, .product-card').forEach((el) => {
      if (!el.classList.contains('fl-visible')) observer.observe(el);
    });
    attach();
    const interval = setInterval(attach, 1500); // подхватываем динамически добавленные карточки
    return () => { observer.disconnect(); clearInterval(interval); };
  }, []);

  function createPetals() {
    setTimeout(() => {
      const hero = document.querySelector('.hero');
      if (!hero) return;
      for (let i = 0; i < 8; i++) {
        const petal = document.createElement('div');
        petal.className = 'petal';
        petal.style.cssText = `left:${Math.random() * 100}%;width:${20 + Math.random() * 30}px;height:${20 + Math.random() * 30}px;animation-duration:${8 + Math.random() * 8}s;animation-delay:${Math.random() * 8}s;border-radius:${Math.random() > .5 ? '50% 0' : '0 50%'}`;
        hero.appendChild(petal);
      }
    }, 100);
  }

  async function addToCart(productId, qty = 1) {
    try {
      const res = await fetch(`${API}/products/${productId}`);
      const data = await res.json();
      if (!data.success) return false;
      const product = data.data;
      setCartItems((prev) => {
        const existing = prev.find((i) => i.product_id === productId);
        if (existing) {
          return prev.map((i) => i.product_id === productId ? { ...i, qty: i.qty + qty } : i);
        }
        return [...prev, {
          product_id: productId,
          qty,
          name: product.name,
          price: product.price,
          image_url: product.image_url,
        }];
      });
      setCartCount((c) => c + qty);
      return true;
    } catch { return false; }
  }

  function updateCart(productId, qty) {
    if (qty <= 0) { removeCart(productId); return; }
    setCartItems((prev) => prev.map((i) => i.product_id === productId ? { ...i, qty } : i));
  }

  function removeCart(productId) {
    setCartItems((prev) => {
      const item = prev.find((i) => i.product_id === productId);
      if (item) setCartCount((c) => Math.max(0, c - item.qty));
      return prev.filter((i) => i.product_id !== productId);
    });
  }

  useEffect(() => {
    const total = cartItems.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);
    setCartTotal(total);
    const count = cartItems.reduce((sum, i) => sum + i.qty, 0);
    setCartCount(count);
  }, [cartItems]);

  // Routing
  const currentPath = window.location.pathname;
  if (currentPath === '/staff') return <StaffPanel />;

  return (
    <>
      <style>{`
        .section, .fl-reveal, .product-card { opacity: 0; transform: translateY(22px); transition: opacity .6s ease, transform .6s cubic-bezier(.22,1,.36,1); }
        .fl-visible { opacity: 1 !important; transform: none !important; }
        .product-card { transition: opacity .5s ease, transform .5s cubic-bezier(.22,1,.36,1), box-shadow .25s ease; }
        .product-card.fl-visible:hover { transform: translateY(-6px) !important; }
        .btn-primary, .btn-outline, .btn-checkout { transition: transform .15s ease, box-shadow .2s ease, background .2s ease; }
        .btn-primary:active, .btn-checkout:active { transform: scale(.97); }
      `}</style>
      <Header
        lang={lang}
        onLangSwitch={switchLang}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        user={user}
        onLogout={logout}
        onAuthSuccess={onAuthSuccess}
        onUserUpdate={onUserUpdate}
        cartCount={cartCount}
        cart={cartItems}
        cartTotal={cartTotal}
        onCartUpdate={updateCart}
        onCartRemove={removeCart}
        onCartCheckout={() => setPaymentOpen(true)}
        onOpenProduct={(id) => {
          document.dispatchEvent(new CustomEvent('florista:openProduct', { detail: { id } }));
        }}
        onOpenCart={() => {}}
        t={t}
      />

      {/* HERO */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <div className="eyebrow">{t.heroEyebrow}</div>
            <h1>{t.heroTitle1}<br /><em>{t.heroTitleEm}</em><br />{t.heroTitle2}</h1>
            <p>{t.heroSub}</p>
            <div className="hero-actions">
              <a href="#shop" className="btn-primary">{t.heroShop}</a>
              <a href="#contact" className="btn-outline">{t.heroContact}</a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-circle"></div>
            <div className="hero-badge badge-1">
              <span className="badge-icon"><FiZap /></span>
              <div><div className="badge-label">{t.featureDelivery}</div><div className="badge-value">1–2 h</div></div>
            </div>
            <div className="hero-badge badge-2">
              <span className="badge-icon"><FiStar /></span>
              <div><div className="badge-label">Customer Rating</div><div className="badge-value">4.9 / 5.0</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <div className="features-strip">
        <div className="features-inner">
          {[
            [<FiTruck key="i" />,          t.featureDelivery, t.featureSub1],
            [<LuLeaf key="i" />,           t.featureFresh,    t.featureSub2],
            [<FiLock key="i" />,           t.featureSecure,   t.featureSub3],
            [<FiMessageCircle key="i" />,  t.featureSupport,  t.featureSub4],
          ].map(([icon, label, sub]) => (
            <div key={label} className="feature-item fl-reveal">
              <div className="feature-icon">{icon}</div>
              <div><div className="feature-label">{label}</div><div className="feature-sub">{sub}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* CATALOG */}
      <Catalog
        categories={categories}
        onAddToCart={addToCart}
        user={user}
        toast={toast}
        cartItems={cartItems}
        cartTotal={cartTotal}
        onCartSuccess={() => {}}
        t={t}
        lang={lang}
      />

      {/* ABOUT */}
      <section className="section" id="about" style={{ background: 'var(--bg-surface)', margin: 0, maxWidth: '100%', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="about-grid" style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '.8rem', fontWeight: 700, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--pink-400)', marginBottom: '1rem' }}>{t.aboutEyebrow}</div>
            <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>{t.aboutTitle} <em>{t.aboutTitleEm}</em> {t.aboutSub}</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '1rem' }}>{t.aboutP1}</p>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: '2rem' }}>{t.aboutP2}</p>
            <a href="#contact" className="btn-primary">{t.aboutBtn}</a>
          </div>
          <div className="about-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {[[<LuFlower2 key="i" />, '200+', lang === 'ru' ? 'Видов цветов' : lang === 'en' ? 'Flower types' : 'Ծաղկի տեսակ'],
              [<FiTruck key="i" />, '1-2ч', lang === 'ru' ? 'Доставка' : lang === 'en' ? 'Delivery' : 'Առաքում'],
              [<FiStar key="i" />, '4.9', lang === 'ru' ? 'Рейтинг' : lang === 'en' ? 'Rating' : 'Վարկանիш'],
              [<FiUsers key="i" />, '5000+', lang === 'ru' ? 'Клиентов' : lang === 'en' ? 'Clients' : 'Հաճախորդ']
            ].map(([icon, val, label]) => (
              <div key={label} className="fl-reveal" style={{ background: 'var(--bg-subtle)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '.5rem', color: 'var(--pink-400)', display: 'flex', justifyContent: 'center' }}>{icon}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 600, color: 'var(--pink-400)' }}>{val}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginTop: '.2rem' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section" id="contact">
        <div className="section-header">
          <h2 className="section-title">{t.contactTitle}</h2>
        </div>
        <div className="contact-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {[
                [<FiMapPin key="i" />, t.contactAddr,  t.contactAddrVal],
                [<FiPhone key="i" />,  t.contactPhone, '+374 10 XXX XXX'],
                [<FiMail key="i" />,   t.contactEmail, 'hello@florista.am'],
                [<FiClock key="i" />,  t.contactHours, t.contactHoursVal],
              ].map(([icon, label, val]) => (
                <div key={label} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--pink-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0, color: 'var(--pink-400)' }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: '.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.2rem' }}>{label}</div>
                    <div style={{ fontSize: '.95rem', color: 'var(--text-primary)' }}>{val}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '2rem', border: '1px solid var(--border)' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', marginBottom: '1.5rem' }}>{t.contactForm}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-field"><label>{t.contactName}</label><input type="text" placeholder={t.contactNamePh} /></div>
              <div className="form-field"><label>{t.contactEmail}</label><input type="email" placeholder={t.contactEmailPh} /></div>
              <div className="form-field"><label>{t.contactMsg}</label>
                <textarea rows={4} placeholder={t.contactMsgPh} style={{ resize: 'vertical', padding: '.75rem 1rem', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '.92rem', fontFamily: 'inherit', outline: 'none', width: '100%' }} />
              </div>
              <button className="btn-primary">{t.contactSend}</button>
            </div>
          </div>
        </div>
      </section>

      {/* ORDER TRACKING */}
      <section className="section" id="track" style={{ background: 'var(--bg-subtle)', margin: 0, maxWidth: '100%', borderTop: '1px solid var(--border)' }}>
        <OrderTrack />
      </section>

      <Footer categories={categories} lang={lang} />

      <PaymentModal
        open={paymentOpen}
        cart={cartItems}
        total={cartTotal}
        onClose={() => setPaymentOpen(false)}
        user={user}
        onSuccess={() => { setCartItems([]); setCartCount(0); }}
        toast={toast}
        t={t}
      />

      <ToastContainer toasts={toasts} />
      <LiveChat lang={lang} />
    </>
  );
}
