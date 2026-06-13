import { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import {
  FiX, FiCreditCard, FiSmartphone, FiDollarSign, FiTag, FiCheckCircle,
  FiAlertCircle, FiLock, FiSearch, FiHeart, FiStar,
} from 'react-icons/fi';
import { FaCcVisa, FaCcMastercard, FaStripe } from 'react-icons/fa';
import { LuFlower, LuFlower2 } from 'react-icons/lu';
import { authHeaders, getToken } from '../lib/auth';
import { pName, pDesc, cName } from '../lib/i18n';
import { luhnCheck, detectBrand, BRAND_LABELS, formatCardNumber, formatExpiry, parseExpiry, expiryValid } from '../lib/cards';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// React-иконки категорий (вместо эмодзи)
const CAT_ICONS = { 1: <LuFlower2 />, 2: <LuFlower />, 3: <LuFlower2 />, 4: <LuFlower />, default: <LuFlower /> };
const fmt = (n) => '֏' + Number(n).toLocaleString('en-US');

async function fetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    return await res.json();
  } catch { return { success: false }; }
}

/* ── Хук блокировки скролла страницы ── */
function useScrollLock(active) {
  useEffect(() => {
    if (active) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'scroll';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      if (scrollY) window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }
  }, [active]);
}

/* ── Stars ── */
function Stars({ rating, interactive = false, onRate }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {Array.from({ length: 5 }, (_, i) => {
        const val = i + 1;
        const filled = interactive ? val <= (hover || rating) : val <= Math.round(rating || 0);
        return (
          <span
            key={i}
            style={{ fontSize: interactive ? '1.4rem' : '1rem', cursor: interactive ? 'pointer' : 'default', color: filled ? '#f59e0b' : '#d1d5db', transition: 'color .15s' }}
            onMouseEnter={() => interactive && setHover(val)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onRate && onRate(val)}
          >★</span>
        );
      })}
    </div>
  );
}

/* ── Reviews Section ── */
function ReviewsSection({ productId, user, t }) {
  const [reviews, setReviews]   = useState([]);
  const [avgRating, setAvg]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating]     = useState(5);
  const [comment, setComment]   = useState('');
  const [author, setAuthor]     = useState(user?.name || '');
  const [sending, setSending]   = useState(false);
  const [error, setError]       = useState('');

  function load() {
    setLoading(true);
    fetchJSON(`${API}/products/${productId}/reviews`).then((d) => {
      if (d.success) { setReviews(d.data); setAvg(d.avg_rating); }
      setLoading(false);
    });
  }

  useEffect(() => { load(); }, [productId]);

  async function submitReview(e) {
    e.preventDefault();
    setError('');
    if (!comment.trim()) { setError(t?.writeReview || 'Напишите отзыв'); return; }
    if (!rating)         { setError('Поставьте оценку'); return; }
    setSending(true);
    const res = await fetchJSON(`${API}/products/${productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author: author || 'Гость', rating, comment, user_id: user?.id }),
    });
    setSending(false);
    if (res.success) {
      setComment(''); setRating(5); setShowForm(false);
      load();
    } else { setError(res.message || 'Ошибка'); }
  }

  return (
    <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 600 }}>
            {t?.reviews || 'Отзывы'}
          </span>
          {avgRating && (
            <span style={{ marginLeft: '.75rem', fontSize: '.85rem', color: 'var(--text-muted)' }}>
              <FiStar style={{ verticalAlign: '-2px', fill: 'currentColor' }} /> {avgRating} · {reviews.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '.4rem .9rem', borderRadius: '20px', border: '1.5px solid var(--pink-400)', background: 'transparent', color: 'var(--pink-400)', cursor: 'pointer', fontSize: '.82rem', fontFamily: 'inherit', fontWeight: 500 }}
        >
          {showForm ? (t?.cancelReview || 'Отмена') : (t?.writeReview || 'Написать отзыв')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submitReview} style={{ background: 'var(--bg-subtle)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '.75rem' }}>
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', marginBottom: '.3rem' }}>
              {t?.yourRating || 'Ваша оценка'}
            </div>
            <Stars rating={rating} interactive onRate={setRating} />
          </div>
          {!user && (
            <div style={{ marginBottom: '.75rem' }}>
              <input
                type="text"
                placeholder={t?.yourName || 'Ваше имя (необязательно)'}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                style={{ width: '100%', padding: '.55rem .85rem', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '.88rem', fontFamily: 'inherit', outline: 'none' }}
              />
            </div>
          )}
          <textarea
            placeholder={t?.reviewPlaceholder || 'Поделитесь впечатлениями о товаре...'}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            style={{ width: '100%', padding: '.55rem .85rem', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '.88rem', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
          />
          {error && <div style={{ color: 'var(--pink-400)', fontSize: '.82rem', marginTop: '.4rem' }}>{error}</div>}
          <button
            type="submit"
            disabled={sending}
            style={{ marginTop: '.75rem', padding: '.5rem 1.2rem', background: 'var(--pink-400)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 500 }}
          >
            {sending ? (t?.sending || 'Отправка...') : (t?.sendReview || 'Отправить отзыв')}
          </button>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>
          {t?.loading || 'Загрузка...'}
        </div>
      ) : !reviews.length ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '.9rem' }}>
          {t?.noReviews || 'Отзывов пока нет. Будьте первым!'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.85rem' }}>
          {reviews.map((r) => (
            <div key={r.id} style={{ background: 'var(--bg-subtle)', borderRadius: '10px', padding: '1rem 1.1rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '.9rem' }}>{r.author}</span>
                  <Stars rating={r.rating} />
                </div>
                <span style={{ fontSize: '.75rem', color: 'var(--text-muted)' }}>
                  {new Date(r.created_at).toLocaleDateString('ru-RU')}
                </span>
              </div>
              <p style={{ fontSize: '.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{r.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Стили оверлея (inline, не зависят от index.css) ── */
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  zIndex: 9000,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  paddingTop: '2rem',
  paddingBottom: '2rem',
  overflowY: 'auto',
};

const paymentOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  zIndex: 9000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/* ── Product Detail Modal ── */
function ProductModal({ open, productId, onClose, onAddToCart, toast, user, t, lang }) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [qty, setQty]         = useState(1);

  useScrollLock(open);

  useEffect(() => {
    if (!open || !productId) return;
    setProduct(null); setQty(1); setLoading(true);
    fetchJSON(`${API}/products/${productId}`).then((res) => {
      if (res.success) setProduct(res.data);
      setLoading(false);
    });
  }, [open, productId]);

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const icon = product ? (CAT_ICONS[product.category_id] || CAT_ICONS.default) : CAT_ICONS.default;

  const discount = product && product.old_price && product.old_price > product.price
    ? Math.round((1 - product.price / product.old_price) * 100)
    : product?.discount || 0;

  return (
    <div
      style={overlayStyle}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', width: '900px', maxWidth: '95vw', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,.25)', marginBottom: '2rem' }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', zIndex: 1, background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
        ><FiX /></button>

        {loading && <div style={{ padding: '4rem', textAlign: 'center' }}><div className="spinner" /></div>}

        {!loading && product && (
          <div style={{ padding: '2rem' }}>
            <div className="product-detail">
              <div className="product-detail-image">
                {product.image_url
                  ? <img src={product.image_url} alt={pName(product, lang)}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-lg)' }}
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  : <div className="product-emoji" style={{ fontSize: '6rem', color: 'var(--pink-400)' }}>{icon}</div>}
              </div>
              <div className="product-detail-body">
                <h1 className="product-detail-title">{pName(product, lang)}</h1>

                <div className="product-detail-price" style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                  {product.old_price && product.old_price > product.price && (
                    <span className="detail-price-old">{fmt(product.old_price)}</span>
                  )}
                  <span className="detail-price-new">{fmt(product.price)}</span>
                  {discount > 0 && (
                    <span style={{ background: '#fef2f2', color: '#ef4444', padding: '.2rem .6rem', borderRadius: '6px', fontSize: '.82rem', fontWeight: 700 }}>
                      -{discount}%
                    </span>
                  )}
                </div>

                {product.old_price && product.old_price > product.price && (
                  <div style={{ fontSize: '.82rem', color: '#22c55e', fontWeight: 500, marginTop: '.3rem' }}>
                    {t?.savings || 'Экономия'}: {fmt(product.old_price - product.price)}
                  </div>
                )}

                {/* Остаток на складе: 0 = недоступен, NULL = не отслеживается */}
                {product.stock !== null && product.stock !== undefined && (
                  <div style={{ marginTop: '.5rem', fontSize: '.84rem', fontWeight: 600, color: product.stock === 0 ? '#ef4444' : product.stock <= 10 ? '#f59e0b' : '#10b981' }}>
                    {product.stock === 0
                      ? 'Нет в наличии — товар закончился на складе'
                      : product.stock <= 10
                        ? `Осталось всего ${product.stock} шт.`
                        : `В наличии: ${product.stock} шт.`}
                  </div>
                )}

                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, margin: '1rem 0 1.5rem' }}>
                  {product.description || ''}
                </p>

                <div className="qty-selector">
                  <div className="qty-control">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
                    <span className="qty-display">{qty}</span>
                    <button onClick={() => setQty((q) => product.stock != null ? Math.min(product.stock, q + 1) : q + 1)}>+</button>
                  </div>
                  <button className="btn-primary" onClick={handleAddToCart}
                    disabled={product.stock === 0}
                    style={product.stock === 0 ? { opacity: .45, cursor: 'not-allowed' } : undefined}>
                    {product.stock === 0 ? 'Нет в наличии' : (t?.addToCartModal || t?.addToCart || 'В корзину')}
                  </button>
                </div>
              </div>
            </div>

            <ReviewsSection productId={productId} user={user} t={t} />
          </div>
        )}
      </div>
    </div>
  );

  async function handleAddToCart() {
    const ok = await onAddToCart(product.id, qty);
    if (ok) toast(t?.addedToCart || 'Добавлено в корзину!');
    else toast('Не удалось добавить', 'error');
  }
}

/* ── Payment Modal ── */
export function PaymentModal({ open, cart, total, onClose, onSuccess, toast, t, user }) {
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const [method, setMethod]   = useState('cash');
  const [step, setStep]       = useState(1);
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ name: '', phone: '', address: '', comment: '' });

  // ── Промокод ──
  const [promoInput, setPromoInput]     = useState('');
  const [promo, setPromo]               = useState(null); // { code, discount_percent }
  const [promoChecking, setPromoChecking] = useState(false);
  const [promoError, setPromoError]     = useState('');

  // ── Карта (для способов card / arca) ──
  const [card, setCard]           = useState({ number: '', expiry: '', cvv: '', holder: '' });
  const [saveCard, setSaveCard]   = useState(false);
  const [savedCards, setSavedCards] = useState([]);
  const [selectedCardId, setSelectedCardId] = useState(null); // null = новая карта

  const isCardMethod = ['card', 'arca'].includes(method);
  const cardDigits   = card.number.replace(/\s/g, '');
  const luhnOk   = cardDigits.length >= 12 && luhnCheck(cardDigits);
  const luhnFail = cardDigits.length >= 13 && !luhnCheck(cardDigits);
  const cardBrand = detectBrand(cardDigits);

  // Загружаем сохранённые карты авторизованного пользователя
  useEffect(() => {
    if (!open || !user || !getToken()) return;
    fetch(`${API}/users/cards`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setSavedCards(d.data); })
      .catch(() => {});
  }, [open, user]);

  const discountAmount = promo ? +(total * promo.discount_percent / 100).toFixed(2) : 0;
  const finalTotal = Math.max(0, +(total - discountAmount).toFixed(2));

  async function applyPromo() {
    const code = promoInput.trim().toUpperCase();
    if (!code) return;
    setPromoChecking(true); setPromoError('');
    try {
      const res = await fetch(`${API}/promocodes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) { setPromo(data.data); toast(`Промокод применён: −${data.data.discount_percent}%`); }
      else { setPromo(null); setPromoError(data.message || 'Промокод не найден'); }
    } catch { setPromoError('Ошибка сети'); }
    setPromoChecking(false);
  }

  useScrollLock(open);

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const methods = [
    { key: 'cash',    icon: <FiDollarSign />,  label: 'Наличные',  color: '#78716c' },
    { key: 'card',    icon: <FaCcVisa />,      label: 'Visa / MC', color: '#1a56db' },
    { key: 'idram',   icon: <FiSmartphone />,  label: 'iDram',     color: '#e85d04' },
    { key: 'telcell', icon: <FiSmartphone />,  label: 'Telcell',   color: '#059669' },
    { key: 'stripe',  icon: <FaStripe />,      label: 'Stripe',    color: '#6366f1' },
    { key: 'arca',    icon: <FiCreditCard />,  label: 'ARCA',      color: '#dc2626' },
  ];

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function placeOrder() {
    if (!form.name.trim())    { toast('Введите ваше имя', 'error'); return; }
    if (!form.phone.trim())   { toast('Введите номер телефона', 'error'); return; }
    if (form.address.trim().length < 5) { toast('Укажите адрес доставки', 'error'); return; }

    // Проверка карты по алгоритму Луна — несуществующий номер отсекаем
    // ещё ДО отправки заказа, не дожидаясь отказа банка.
    if (isCardMethod && selectedCardId === null) {
      if (!luhnCheck(cardDigits)) { toast('Номер карты недействителен — такой карты не существует', 'error'); return; }
      if (!expiryValid(card.expiry)) { toast('Неверный срок действия карты', 'error'); return; }
      if (!/^\d{3,4}$/.test(card.cvv)) { toast('Введите CVV (3–4 цифры)', 'error'); return; }
    }

    setLoading(true);
    try {
      // Если выбрано «сохранить карту» — сохраняем маскированные данные
      if (isCardMethod && selectedCardId === null && saveCard && user && getToken()) {
        const { month, year } = parseExpiry(card.expiry);
        await fetch(`${API}/users/cards`, {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ number: cardDigits, holder: card.holder, exp_month: month, exp_year: year }),
        }).catch(() => {});
      }

      const res = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name,
          phone: form.phone,
          address: form.address,
          comment: form.comment,
          payment_method: method,
          promo_code: promo ? promo.code : null,
          // полный номер используется только для проверки и НЕ сохраняется на сервере
          ...(isCardMethod && selectedCardId === null ? { card_number: cardDigits } : {}),
          total: finalTotal,
          user_id: user?.id || null,
          items: cart.map(i => ({
            product_id: i.product_id,
            name: i.name,
            price: i.price,
            qty: i.qty,
            image_url: i.image_url,
          })),
        }),
      });
      const data = await res.json();
      if (!data.success) { toast(data.message || 'Ошибка', 'error'); setLoading(false); return; }
      setOrderId(data.data.id);
      setStep(2);
      onSuccess();
    } catch { toast('Ошибка сети', 'error'); }
    setLoading(false);
  }

  function handleClose() {
    setStep(1); setForm({ name: '', phone: '', address: '', comment: '' });
    setOrderId(null);
    setPromo(null); setPromoInput(''); setPromoError('');
    setCard({ number: '', expiry: '', cvv: '', holder: '' });
    setSelectedCardId(null); setSaveCard(false);
    onClose();
  }

  if (!open) return null;

  const inp = { padding: '.7rem 1rem', border: '1.5px solid var(--border)', borderRadius: '10px', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '.92rem', outline: 'none', width: '100%' };

  return (
    <div style={paymentOverlayStyle} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="payment-modal" style={{ maxWidth: '540px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}>
        <button className="modal-close" onClick={handleClose}><FiX /></button>

        {step === 2 ? (
          <div className="order-success">
            <div className="checkmark">✓</div>
            <h2>Заказ №{orderId} оформлен!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '.5rem' }}>{fmt(total)}</p>
            <p style={{ fontSize: '.88rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Мы уже начали собирать ваш букет<br/>Доставка по Еревану: 1–2 часа
            </p>
            <div style={{ background: 'var(--bg-subtle)', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', fontSize: '.85rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              Отслеживайте статус заказа по номеру:<br/>
              <strong style={{ fontSize: '1.3rem', color: 'var(--pink-400)' }}>#{orderId}</strong>
            </div>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleClose}>
              Продолжить покупки
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', marginBottom: '1.5rem' }}>
              Оформление заказа
            </h2>

            <div style={{ background: 'var(--bg-subtle)', borderRadius: '10px', padding: '.75rem 1rem', marginBottom: '1.25rem' }}>
              {cart.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', padding: '.25rem 0', color: 'var(--text-secondary)', borderBottom: i < cart.length-1 ? '1px solid var(--border)' : 'none' }}>
                  <span>{item.name} × {item.qty}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fmt(item.price * item.qty)}</span>
                </div>
              ))}
              {promo && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.5rem', fontSize: '.85rem', color: '#10b981', fontWeight: 600 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}><FiTag /> Промокод {promo.code} (−{promo.discount_percent}%)</span>
                  <span>−{fmt(discountAmount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.5rem', fontWeight: 700, color: 'var(--pink-400)', fontSize: '1rem' }}>
                <span>Итого</span><span>{fmt(finalTotal)}</span>
              </div>
            </div>

            {/* ── Промокод ── */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.4rem', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                <FiTag /> Промокод
              </div>
              {promo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', background: 'rgba(16,185,129,.1)', border: '1.5px solid rgba(16,185,129,.4)', borderRadius: '10px', padding: '.6rem .9rem' }}>
                  <FiCheckCircle style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: 700, letterSpacing: '.1em', color: '#10b981' }}>{promo.code}</span>
                  <span style={{ fontSize: '.82rem', color: 'var(--text-secondary)' }}>скидка {promo.discount_percent}%</span>
                  <button onClick={() => { setPromo(null); setPromoInput(''); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><FiX /></button>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '.5rem' }}>
                    <input style={{ ...inp, flex: 1, textTransform: 'uppercase', letterSpacing: '.08em' }} placeholder="например: A7KX29QZ"
                      value={promoInput} onChange={e => { setPromoInput(e.target.value); setPromoError(''); }}
                      onKeyDown={e => e.key === 'Enter' && applyPromo()} />
                    <button onClick={applyPromo} disabled={promoChecking}
                      style={{ padding: '.6rem 1.1rem', borderRadius: '10px', border: 'none', background: 'var(--pink-400)', color: '#fff', fontWeight: 600, fontSize: '.85rem', cursor: 'pointer', fontFamily: 'inherit', opacity: promoChecking ? .7 : 1 }}>
                      {promoChecking ? '...' : 'Применить'}
                    </button>
                  </div>
                  {promoError && <div style={{ marginTop: '.4rem', fontSize: '.8rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '.3rem' }}><FiAlertCircle /> {promoError}</div>}
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem' }}>
                <div><label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.35rem' }}>Имя *</label>
                  <input style={inp} placeholder="Ваше имя" value={form.name} onChange={e => setF('name', e.target.value)} /></div>
                <div><label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.35rem' }}>Телефон *</label>
                  <input style={inp} placeholder="+374 XX XXX XXX" value={form.phone} onChange={e => setF('phone', e.target.value)} /></div>
              </div>
              <div><label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.35rem' }}>Адрес доставки *</label>
                <input style={inp} placeholder="Ереван, ул. Маштоца 25, кв. 3" value={form.address} onChange={e => setF('address', e.target.value)} /></div>
              <div><label style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '.35rem' }}>Комментарий</label>
                <input style={inp} placeholder="Позвоните за 30 мин, домофон не работает..." value={form.comment} onChange={e => setF('comment', e.target.value)} /></div>
            </div>

            <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.6rem' }}>Способ оплаты</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.5rem', marginBottom: '1.25rem' }}>
              {methods.map((m) => (
                <div key={m.key} onClick={() => setMethod(m.key)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.3rem', padding: '.6rem .4rem', borderRadius: '10px', cursor: 'pointer', border: `2px solid ${method === m.key ? m.color : 'var(--border)'}`, background: method === m.key ? `${m.color}15` : 'var(--bg-surface)', transition: 'all .15s' }}>
                  <span style={{ fontSize: '1.3rem' }}>{m.icon}</span>
                  <span style={{ fontSize: '.7rem', fontWeight: 600, color: method === m.key ? m.color : 'var(--text-secondary)' }}>{m.label}</span>
                </div>
              ))}
            </div>

            {/* ── Данные карты (Visa/MC/ArCa) с проверкой по алгоритму Луна ── */}
            {isCardMethod && (
              <div style={{ marginBottom: '1.25rem', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '1rem', background: 'var(--bg-subtle)' }}>
                <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '.6rem', display: 'flex', alignItems: 'center', gap: '.35rem' }}>
                  <FiCreditCard /> Данные карты
                </div>

                {savedCards.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem', marginBottom: '.75rem' }}>
                    {savedCards.map(c => (
                      <div key={c.id} onClick={() => setSelectedCardId(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.55rem .8rem', borderRadius: '10px', cursor: 'pointer', border: `1.5px solid ${selectedCardId === c.id ? 'var(--pink-400)' : 'var(--border)'}`, background: selectedCardId === c.id ? 'var(--pink-100)' : 'var(--bg-surface)' }}>
                        {c.brand === 'visa' ? <FaCcVisa /> : c.brand === 'mastercard' ? <FaCcMastercard /> : <FiCreditCard />}
                        <span style={{ fontSize: '.85rem', fontWeight: 600 }}>{BRAND_LABELS[c.brand] || 'Карта'} •••• {c.last4}</span>
                        <span style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{String(c.exp_month).padStart(2, '0')}/{String(c.exp_year).slice(-2)}</span>
                      </div>
                    ))}
                    <div onClick={() => setSelectedCardId(null)}
                      style={{ padding: '.55rem .8rem', borderRadius: '10px', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600, textAlign: 'center', border: `1.5px dashed ${selectedCardId === null ? 'var(--pink-400)' : 'var(--border)'}`, color: selectedCardId === null ? 'var(--pink-400)' : 'var(--text-secondary)' }}>
                      + Новая карта
                    </div>
                  </div>
                )}

                {selectedCardId === null && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                    <div style={{ position: 'relative' }}>
                      <input style={{ ...inp, paddingRight: '7.5rem', borderColor: luhnFail ? '#ef4444' : luhnOk ? '#10b981' : 'var(--border)' }}
                        placeholder="Номер карты" inputMode="numeric" autoComplete="cc-number"
                        value={card.number} onChange={e => setCard(p => ({ ...p, number: formatCardNumber(e.target.value) }))} />
                      <span style={{ position: 'absolute', right: '.7rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.75rem', fontWeight: 600, color: luhnOk ? '#10b981' : luhnFail ? '#ef4444' : 'var(--text-muted)' }}>
                        {luhnOk && <><FiCheckCircle /> {BRAND_LABELS[cardBrand]}</>}
                        {luhnFail && <><FiAlertCircle /> не существует</>}
                      </span>
                    </div>
                    {luhnFail && (
                      <div style={{ fontSize: '.75rem', color: '#ef4444', lineHeight: 1.4 }}>
                        Контрольная сумма номера не сходится — карты с таким номером не может существовать. Проверьте цифры.
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                      <input style={inp} placeholder="ММ/ГГ" inputMode="numeric" autoComplete="cc-exp"
                        value={card.expiry} onChange={e => setCard(p => ({ ...p, expiry: formatExpiry(e.target.value) }))} />
                      <input style={inp} placeholder="CVV" inputMode="numeric" type="password" maxLength={4} autoComplete="cc-csc"
                        value={card.cvv} onChange={e => setCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))} />
                    </div>
                    <input style={inp} placeholder="Имя на карте" autoComplete="cc-name"
                      value={card.holder} onChange={e => setCard(p => ({ ...p, holder: e.target.value }))} />
                    {user && getToken() && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={saveCard} onChange={e => setSaveCard(e.target.checked)} />
                        Сохранить карту для будущих заказов (храним только последние 4 цифры)
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', gap: '.5rem' }} onClick={placeOrder} disabled={loading}>
              {loading ? 'Оформляем...' : <>Оформить заказ · {fmt(finalTotal)} <FiLock /></>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Catalog ── */
export default function Catalog({ categories, onAddToCart, toast, cartItems, cartTotal, onCartSuccess, t, user, lang }) {
  const [products, setProducts]             = useState([]);
  const [loading, setLoading]               = useState(true);
  const [detailOpen, setDetailOpen]         = useState(false);
  const [detailId, setDetailId]             = useState(null);
  const [paymentOpen, setPaymentOpen]       = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const [sort, setSort]                     = useState('newest');
  const [minPrice, setMinPrice]             = useState('');
  const [maxPrice, setMaxPrice]             = useState('');
  const [appliedMin, setAppliedMin]         = useState('');
  const [appliedMax, setAppliedMax]         = useState('');

  function loadProducts(cat = activeCategory, s = sort, minP = appliedMin, maxP = appliedMax) {
    setLoading(true);
    const params = new URLSearchParams();
    if (cat)  params.set('category', cat);
    if (s)    params.set('sort', s);
    if (minP) params.set('min_price', minP);
    if (maxP) params.set('max_price', maxP);
    fetchJSON(`${API}/products?${params}`).then((d) => {
      if (d.success) setProducts(d.data);
      setLoading(false);
    });
  }

  useEffect(() => { loadProducts(); }, []);

  useEffect(() => {
    const handler = (e) => { setDetailId(e.detail.id); setDetailOpen(true); };
    document.addEventListener('florista:openProduct', handler);
    return () => document.removeEventListener('florista:openProduct', handler);
  }, []);

  function handleCategoryChange(catId) { setActiveCategory(catId); loadProducts(catId, sort, appliedMin, appliedMax); }
  function handleSortChange(s)         { setSort(s);               loadProducts(activeCategory, s, appliedMin, appliedMax); }

  function applyPriceFilter() {
    setAppliedMin(minPrice); setAppliedMax(maxPrice);
    loadProducts(activeCategory, sort, minPrice, maxPrice);
  }
  function resetPriceFilter() {
    setMinPrice(''); setMaxPrice(''); setAppliedMin(''); setAppliedMax('');
    loadProducts(activeCategory, sort, '', '');
  }

  const sortOptions = [
    { key: 'newest',     label: t?.sortNewest    || 'Новинки' },
    { key: 'price_asc',  label: t?.sortPriceAsc  || 'Цена ↑'  },
    { key: 'price_desc', label: t?.sortPriceDesc || 'Цена ↓'  },
    { key: 'discount',   label: t?.sortDiscount  || 'Скидки'  },
  ];

  const btnBase = { padding: '.4rem 1rem', borderRadius: '20px', border: '1.5px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.85rem', fontWeight: 500, transition: 'all .15s' };

  return (
    <>
      <section className="section" id="shop">
        <div className="section-header">
          <h2 className="section-title">{t?.collectionTitle || 'Наша'} <em>{t?.collectionEm || 'коллекция'}</em></h2>
          <a href="#shop" className="section-link">{t?.collectionLink || 'Магазин →'}</a>
        </div>

        {/* Категории + сортировка */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => handleCategoryChange('')}
              style={{ ...btnBase, background: activeCategory === '' ? 'var(--pink-400)' : 'var(--bg-surface)', color: activeCategory === '' ? '#fff' : 'var(--text-primary)' }}>
              {t?.allCategories || 'Все'}
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => handleCategoryChange(String(cat.id))}
                style={{ ...btnBase, background: activeCategory === String(cat.id) ? 'var(--pink-400)' : 'var(--bg-surface)', color: activeCategory === String(cat.id) ? '#fff' : 'var(--text-primary)' }}>
                {cName(cat, lang)}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '.4rem', marginLeft: 'auto' }}>
            {sortOptions.map((opt) => (
              <button key={opt.key} onClick={() => handleSortChange(opt.key)}
                style={{ ...btnBase, background: sort === opt.key ? 'var(--bg-subtle)' : 'var(--bg-surface)', color: sort === opt.key ? 'var(--pink-400)' : 'var(--text-secondary)', fontWeight: sort === opt.key ? 600 : 400 }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Ценовой фильтр */}
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>{t?.priceFilter || 'Цена'} (֏):</span>
          <input type="number" placeholder={t?.priceFrom || 'от'}
            value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
            style={{ width: '90px', padding: '.35rem .7rem', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '.85rem', fontFamily: 'inherit', outline: 'none' }} />
          <input type="number" placeholder={t?.priceTo || 'до'}
            value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
            style={{ width: '90px', padding: '.35rem .7rem', border: '1.5px solid var(--border)', borderRadius: '8px', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: '.85rem', fontFamily: 'inherit', outline: 'none' }} />
          <button onClick={applyPriceFilter}
            style={{ padding: '.35rem .85rem', borderRadius: '8px', background: 'var(--pink-400)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '.85rem', fontFamily: 'inherit', fontWeight: 500 }}>
            {t?.filterApply || 'Применить'}
          </button>
          {(appliedMin || appliedMax) && (
            <button onClick={resetPriceFilter}
              style={{ padding: '.35rem .85rem', borderRadius: '8px', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1.5px solid var(--border)', cursor: 'pointer', fontSize: '.85rem', fontFamily: 'inherit' }}>
              {t?.filterReset || 'Сбросить'}
            </button>
          )}
        </div>

        <div className="product-grid" id="product-grid">
          {loading
            ? <div className="spinner" />
            : !products.length
              ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem', gridColumn: '1/-1' }}>
                  {t?.noProducts || 'Товары не найдены'}
                </p>
              : products.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    lang={lang}
                    onAddToCart={onAddToCart}
                    onView={(id) => { setDetailId(id); setDetailOpen(true); }}
                    t={t}
                    avgRating={parseFloat(p.avg_rating) || 0}
                    reviewCount={parseInt(p.review_count) || 0}
                  />
                ))}
        </div>
      </section>

      <ProductModal
        open={detailOpen}
        productId={detailId}
        onClose={() => setDetailOpen(false)}
        onAddToCart={onAddToCart}
        toast={toast}
        user={user}
        t={t}
        lang={lang}
      />

      <PaymentModal
        open={paymentOpen}
        cart={cartItems}
        total={cartTotal}
        onClose={() => setPaymentOpen(false)}
        onSuccess={onCartSuccess}
        toast={toast}
        t={t}
      />
    </>
  );
}
