import { useState, useRef, useEffect } from 'react';
import {
  FiSearch, FiShoppingCart, FiSun, FiMoon, FiX, FiUser, FiLogOut, FiLogIn, FiMenu,
  FiCreditCard, FiCamera, FiTrash2, FiPackage, FiShield, FiUsers,
  FiPlus, FiMinus, FiChevronRight, FiCheckCircle, FiAlertCircle,
} from 'react-icons/fi';
import { LuFlower } from 'react-icons/lu';
import { API, authHeaders, saveSession } from '../lib/auth';
import { luhnCheck, detectBrand, BRAND_LABELS, formatCardNumber, formatExpiry, parseExpiry, expiryValid } from '../lib/cards';

const fmt = (n) => '֏' + Number(n).toLocaleString('en-US');

/* Стили для новых элементов (вставляются из JS — CSS-файлы не трогаем) */
const drawerStyles = `
  .fl-udrawer-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); opacity:0; pointer-events:none; transition:opacity .3s; z-index:1100; }
  .fl-udrawer-overlay.open { opacity:1; pointer-events:auto; }
  .fl-udrawer { position:fixed; top:0; right:0; height:100vh; width:380px; max-width:92vw; background:var(--bg-surface,#fff); z-index:1101; transform:translateX(105%); transition:transform .35s cubic-bezier(.22,1,.36,1); box-shadow:-12px 0 48px rgba(0,0,0,.18); display:flex; flex-direction:column; }
  .fl-udrawer.open { transform:translateX(0); }
  .fl-udrawer-scroll { overflow-y:auto; flex:1; padding:1.5rem; }
  .fl-avatar-ring { position:relative; width:96px; height:96px; margin:0 auto; }
  .fl-avatar-ring img, .fl-avatar-fallback { width:96px; height:96px; border-radius:50%; object-fit:cover; border:3px solid var(--pink-400,#c0474a); }
  .fl-avatar-fallback { display:flex; align-items:center; justify-content:center; background:var(--pink-100,#f7e8e8); color:var(--pink-400,#c0474a); font-size:2.2rem; }
  .fl-avatar-cam { position:absolute; bottom:0; right:0; width:32px; height:32px; border-radius:50%; background:var(--pink-400,#c0474a); color:#fff; border:2px solid var(--bg-surface,#fff); display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform .15s; }
  .fl-avatar-cam:hover { transform:scale(1.1); }
  .fl-umenu-item { display:flex; align-items:center; gap:.8rem; width:100%; padding:.85rem 1rem; border:1px solid var(--border,#e8e2df); background:var(--bg-subtle,#faf8f7); color:var(--text-primary,#1a1a1a); border-radius:12px; cursor:pointer; font-family:inherit; font-size:.9rem; font-weight:500; transition:border-color .15s, transform .15s; text-decoration:none; }
  .fl-umenu-item:hover { border-color:var(--pink-400,#c0474a); transform:translateX(3px); }
  .fl-ucard { display:flex; align-items:center; gap:.75rem; padding:.75rem 1rem; border:1px solid var(--border,#e8e2df); border-radius:12px; background:var(--bg-subtle,#faf8f7); color:var(--text-primary,#1a1a1a); }
  @keyframes flFadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  .fl-fade-up { animation:flFadeUp .35s ease; }
`;

/* ── Search Bar ── */
function SearchBar({ onOpenProduct, t }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const timer = useRef(null);

  function handleInput(e) {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setShow(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/products`);
        const data = await res.json();
        if (data.success) {
          const filtered = data.data.filter((p) =>
            p.name.toLowerCase().includes(q.toLowerCase())
          );
          setResults(filtered.slice(0, 5));
          setShow(filtered.length > 0);
        }
      } catch { setShow(false); }
    }, 300);
  }

  return (
    <div className="search-bar" onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setShow(false); }}>
      <span className="search-icon"><FiSearch /></span>
      <input type="text" placeholder="Поиск цветов..." value={query} onChange={handleInput} />
      <div className={`search-results${show ? ' show' : ''}`}>
        {results.map((p) => (
          <div key={p.id} className="search-result-item" tabIndex={0}
            onClick={() => { setShow(false); setQuery(''); onOpenProduct(p.id); }}>
            <div className="cart-item-img" style={{ fontSize: '1.5rem' }}>
              {p.image_url
                ? <img src={p.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} alt={p.name}
                    onError={(e) => { e.target.style.display = 'none'; }} />
                : <LuFlower />}
            </div>
            <div>
              <div className="name">{p.name}</div>
              <div className="price">{fmt(p.price)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Auth Modal (реальная регистрация + вход) ── */
function AuthModal({ open, onClose, onSuccess }) {
  const [tab, setTab] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() { setName(''); setEmail(''); setPassword(''); setError(''); }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('Введите email и пароль'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) { onSuccess(data.data, data.token); reset(); }
      else setError(data.message || 'Ошибка входа');
    } catch { setError('Нет связи с сервером'); }
    finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    if (!name || !email || !password) { setError('Заполните все поля'); return; }
    if (password.length < 6) { setError('Пароль минимум 6 символов'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (data.success) { onSuccess(data.data, data.token); reset(); }
      else setError(data.message || 'Ошибка регистрации');
    } catch { setError('Нет связи с сервером'); }
    finally { setLoading(false); }
  }

  if (!open) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal">
        <button className="modal-close" onClick={onClose}><FiX /></button>
        <div className="auth-tabs">
          <button className={`auth-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); reset(); }}>Войти</button>
          <button className={`auth-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); reset(); }}>Регистрация</button>
        </div>

        {tab === 'login' ? (
          <form className="auth-form active" onSubmit={handleLogin} noValidate>
            <div className="form-field">
              <label>Email</label>
              <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Пароль</label>
              <input type="password" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="form-error" style={{ display: 'block' }}>{error}</p>}
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        ) : (
          <form className="auth-form active" onSubmit={handleRegister} noValidate>
            <div className="form-field">
              <label>Имя</label>
              <input type="text" placeholder="Ваше имя" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Email</label>
              <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-field">
              <label>Пароль</label>
              <input type="password" placeholder="Минимум 6 символов" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="form-error" style={{ display: 'block' }}>{error}</p>}
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Регистрация...' : 'Создать аккаунт'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Форма добавления карты (с проверкой по алгоритму Луна) ── */
function AddCardForm({ onAdded, toastLocal }) {
  const [number, setNumber] = useState('');
  const [holder, setHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [saving, setSaving] = useState(false);

  const digits = number.replace(/\s/g, '');
  const luhnOk = digits.length >= 12 && luhnCheck(digits);
  const luhnFail = digits.length >= 13 && !luhnCheck(digits);
  const brand = detectBrand(digits);

  async function save() {
    if (!luhnOk) { toastLocal('Номер карты недействителен — такой карты не существует', false); return; }
    if (!expiryValid(expiry)) { toastLocal('Неверный срок действия', false); return; }
    const { month, year } = parseExpiry(expiry);
    setSaving(true);
    try {
      const res = await fetch(`${API}/users/cards`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ number: digits, holder, exp_month: month, exp_year: year }),
      });
      const data = await res.json();
      if (data.success) { onAdded(data.data); setNumber(''); setHolder(''); setExpiry(''); toastLocal('Карта сохранена'); }
      else toastLocal(data.message || 'Ошибка', false);
    } catch { toastLocal('Ошибка сети', false); }
    setSaving(false);
  }

  const inp = { width: '100%', padding: '.7rem .9rem', border: '1.5px solid var(--border)', borderRadius: '10px', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '.9rem', outline: 'none' };

  return (
    <div className="fl-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginTop: '.75rem' }}>
      <div style={{ position: 'relative' }}>
        <input style={{ ...inp, borderColor: luhnFail ? '#ef4444' : luhnOk ? '#10b981' : 'var(--border)' }}
          placeholder="Номер карты" inputMode="numeric"
          value={number} onChange={e => setNumber(formatCardNumber(e.target.value))} />
        <span style={{ position: 'absolute', right: '.8rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.78rem', color: luhnOk ? '#10b981' : luhnFail ? '#ef4444' : 'var(--text-muted)' }}>
          {luhnOk && <><FiCheckCircle /> {BRAND_LABELS[brand]}</>}
          {luhnFail && <><FiAlertCircle /> не существует</>}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
        <input style={inp} placeholder="ММ/ГГ" inputMode="numeric" value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} />
        <input style={inp} placeholder="Имя на карте" value={holder} onChange={e => setHolder(e.target.value)} />
      </div>
      <button className="btn-primary" style={{ justifyContent: 'center' }} onClick={save} disabled={saving}>
        {saving ? 'Сохранение...' : 'Сохранить карту'}
      </button>
      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
        Мы храним только бренд и последние 4 цифры. Полный номер и CVV не сохраняются.
      </div>
    </div>
  );
}

/* ── Боковая панель пользователя: аватар, настройки, способы оплаты ── */
function UserDrawer({ open, onClose, user, onUserUpdate, onLogout, theme, onThemeToggle, lang, onLangSwitch }) {
  const [cards, setCards] = useState([]);
  const [showAddCard, setShowAddCard] = useState(false);
  const [note, setNote] = useState(null); // {msg, ok}
  const fileRef = useRef();

  function toastLocal(msg, ok = true) {
    setNote({ msg, ok });
    setTimeout(() => setNote(null), 3000);
  }

  useEffect(() => {
    if (!open || !user) return;
    fetch(`${API}/users/cards`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setCards(d.data); })
      .catch(() => {});
  }, [open, user]);

  function pickAvatar() { fileRef.current && fileRef.current.click(); }

  function handleAvatarFile(file) {
    if (!file || !String(file.type).startsWith('image/')) return;
    // сжимаем до 256x256, чтобы влезало в БД
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const size = 256;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(img.width, img.height);
      ctx.drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, size, size);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      try {
        const res = await fetch(`${API}/users/avatar`, {
          method: 'PUT',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ avatar: dataUrl }),
        });
        const d = await res.json();
        if (d.success) { onUserUpdate(d.data); toastLocal('Аватар обновлён'); }
        else toastLocal(d.message || 'Ошибка', false);
      } catch { toastLocal('Ошибка сети', false); }
    };
    img.src = URL.createObjectURL(file);
  }

  async function removeCard(id) {
    try {
      const res = await fetch(`${API}/users/cards/${id}`, { method: 'DELETE', headers: authHeaders() });
      const d = await res.json();
      if (d.success) { setCards(p => p.filter(c => c.id !== id)); toastLocal('Карта удалена'); }
    } catch { toastLocal('Ошибка сети', false); }
  }

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'staff' || isAdmin;

  return (
    <>
      <div className={`fl-udrawer-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`fl-udrawer${open ? ' open' : ''}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>Мой аккаунт</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', display: 'flex' }}><FiX /></button>
        </div>

        {user && (
          <div className="fl-udrawer-scroll">
            {/* Аватар */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div className="fl-avatar-ring">
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} />
                  : <div className="fl-avatar-fallback"><FiUser /></div>}
                <div className="fl-avatar-cam" onClick={pickAvatar} title="Сменить аватар"><FiCamera size={15} /></div>
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleAvatarFile(e.target.files[0])} />
              <div style={{ marginTop: '.75rem', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{user.name}</div>
              <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>{user.email}</div>
              {user.role !== 'user' && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', marginTop: '.4rem', fontSize: '.72rem', fontWeight: 700, padding: '.2rem .7rem', borderRadius: '99px', background: 'var(--pink-100)', color: 'var(--pink-400)' }}>
                  <FiShield size={11} /> {user.role === 'admin' ? 'Администратор' : 'Сотрудник'}
                </span>
              )}
            </div>

            {/* Настройки сайта */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', marginBottom: '1.5rem' }}>
              <button className="fl-umenu-item" onClick={onThemeToggle}>
                {theme === 'dark' ? <FiSun /> : <FiMoon />}
                {theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                <FiChevronRight style={{ marginLeft: 'auto', opacity: .4 }} />
              </button>
              <a className="fl-umenu-item" href="#track" onClick={onClose}>
                <FiPackage /> Мои заказы — отслеживание
                <FiChevronRight style={{ marginLeft: 'auto', opacity: .4 }} />
              </a>
              {isStaff && (
                <a className="fl-umenu-item" href="/staff">
                  <FiUsers /> Панель сотрудника
                  <FiChevronRight style={{ marginLeft: 'auto', opacity: .4 }} />
                </a>
              )}
              {isAdmin && (
                <a className="fl-umenu-item" href="/admin">
                  <FiShield /> Админ-панель
                  <FiChevronRight style={{ marginLeft: 'auto', opacity: .4 }} />
                </a>
              )}
              <div className="fl-umenu-item" style={{ cursor: 'default' }}>
                <span style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Язык</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '.3rem' }}>
                  {[['en', 'EN'], ['ru', 'RU'], ['hy', 'ՀՅ']].map(([code, label]) => (
                    <button key={code} onClick={() => onLangSwitch(code)}
                      style={{ padding: '.25rem .6rem', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 600, background: lang === code ? 'var(--pink-400)' : 'transparent', color: lang === code ? '#fff' : 'var(--text-secondary)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Способы оплаты */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
                <div style={{ fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <FiCreditCard /> Способы оплаты
                </div>
                <button onClick={() => setShowAddCard(s => !s)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pink-400)', fontWeight: 600, fontSize: '.8rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '.25rem' }}>
                  {showAddCard ? <><FiMinus /> Скрыть</> : <><FiPlus /> Добавить</>}
                </button>
              </div>
              {!cards.length && !showAddCard && (
                <div style={{ fontSize: '.82rem', color: 'var(--text-muted)' }}>Сохранённых карт нет</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                {cards.map(c => (
                  <div key={c.id} className="fl-ucard">
                    <FiCreditCard style={{ color: 'var(--pink-400)' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{BRAND_LABELS[c.brand] || 'Карта'} •••• {c.last4}</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>до {String(c.exp_month).padStart(2, '0')}/{String(c.exp_year).slice(-2)}{c.holder ? ` · ${c.holder}` : ''}</div>
                    </div>
                    <button onClick={() => removeCard(c.id)} title="Удалить"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                      <FiTrash2 />
                    </button>
                  </div>
                ))}
              </div>
              {showAddCard && <AddCardForm onAdded={(c) => setCards(p => [c, ...p])} toastLocal={toastLocal} />}
            </div>

            {/* Выход */}
            <button className="fl-umenu-item" style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,.35)' }} onClick={() => { onLogout(); onClose(); }}>
              <FiLogOut /> Выйти из аккаунта
            </button>

            {note && (
              <div className="fl-fade-up" style={{ marginTop: '1rem', padding: '.6rem .9rem', borderRadius: '10px', fontSize: '.82rem', fontWeight: 600, background: note.ok ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)', color: note.ok ? '#10b981' : '#ef4444' }}>
                {note.msg}
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}

/* ── Cart Drawer ── */
function CartDrawer({ open, cart, total, onClose, onUpdate, onRemove, onCheckout }) {
  return (
    <>
      <div className={`cart-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`cart-drawer${open ? ' open' : ''}`}>
        <div className="cart-header">
          <div className="cart-title" style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><FiShoppingCart /> Ваша корзина</div>
          <button className="cart-close" onClick={onClose}><FiX /></button>
        </div>
        <div className="cart-items">
          {!cart.length ? (
            <div className="cart-empty-msg">
              <div className="empty-icon"><FiShoppingCart /></div>
              <p>Корзина пуста</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product_id} className="cart-item">
                <div className="cart-item-img">
                  {item.image_url
                    ? <img src={item.image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '6px' }} alt={item.name}
                        onError={(e) => { e.target.style.display = 'none'; }} />
                    : <LuFlower />}
                </div>
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-price">{fmt(item.price || 0)}</div>
                  <div className="cart-item-controls">
                    <button className="qty-btn" onClick={() => onUpdate(item.product_id, Math.max(0, item.qty - 1))}><FiMinus size={12} /></button>
                    <span className="qty-val">{item.qty}</span>
                    <button className="qty-btn" onClick={() => onUpdate(item.product_id, item.qty + 1)}><FiPlus size={12} /></button>
                  </div>
                </div>
                <button className="cart-item-remove" onClick={() => onRemove(item.product_id)}><FiX /></button>
              </div>
            ))
          )}
        </div>
        <div className="cart-footer">
          <div className="cart-subtotal">
            <span>Итого</span>
            <span className="amount">{fmt(total)}</span>
          </div>
          <button className="btn-checkout" onClick={onCheckout}>Оформить заказ →</button>
        </div>
      </aside>
    </>
  );
}

/* ── Header ── */
export default function Header({
  lang, onLangSwitch,
  theme, onThemeToggle,
  user, onLogout,
  onAuthSuccess, onUserUpdate,
  cartCount, onOpenCart,
  cart, cartTotal,
  onCartUpdate, onCartRemove,
  onCartCheckout,
  onOpenProduct,
  t,
}) {
  const [scrolled, setScrolled] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{drawerStyles}</style>
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <div className="header-inner">
          <button className="nav-burger" aria-label="menu" onClick={() => setMobileNav(true)}>
            <FiMenu />
          </button>

          <a href="/" className="logo">Flori<em>sta</em></a>

          <nav className="main-nav">
            <a href="#" className="active">
              {lang === 'ru' ? 'Главная' : lang === 'en' ? 'Home' : 'Գլխ.'}
            </a>
            <a href="#shop">
              {lang === 'ru' ? 'Магазин' : lang === 'en' ? 'Shop' : 'Խանութ'}
            </a>
            <a href="#about">
              {lang === 'ru' ? 'О нас' : lang === 'en' ? 'About' : 'Մեր մասին'}
            </a>
            <a href="#contact">
              {lang === 'ru' ? 'Контакты' : lang === 'en' ? 'Contact' : 'Կապ'}
            </a>
          </nav>

          <SearchBar onOpenProduct={onOpenProduct} t={t} />

          <div className="header-actions">
            {/* Переключатель языков */}
            <div className="lang-switcher">
              {[['en', 'EN'], ['ru', 'RU'], ['hy', 'ՀՅ']].map(([code, label]) => (
                <button
                  key={code}
                  className={`lang-btn${lang === code ? ' active' : ''}`}
                  onClick={() => onLangSwitch(code)}
                >
                  {label}
                </button>
              ))}
            </div>

            <button className="theme-toggle" onClick={onThemeToggle}>
              {theme === 'dark' ? <FiSun /> : <FiMoon />}
            </button>

            <div>
              {user ? (
                // Кнопка пользователя — открывает боковую панель настроек
                <button onClick={() => setUserOpen(true)} title={user.name}
                  style={{ display: 'flex', alignItems: 'center', gap: '.5rem', background: 'none', border: '1.5px solid var(--border)', borderRadius: '99px', padding: '.25rem .8rem .25rem .25rem', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)', transition: 'border-color .2s' }}>
                  {user.avatar
                    ? <img src={user.avatar} alt={user.name} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                    : <span style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--pink-100)', color: 'var(--pink-400)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiUser size={15} /></span>}
                  <span style={{ fontSize: '.85rem', fontWeight: 600, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</span>
                </button>
              ) : (
                <button className="btn-auth" onClick={() => setAuthOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
                  <FiLogIn />
                  {lang === 'ru' ? 'Войти' : lang === 'en' ? 'Login' : 'Մուտք'}
                </button>
              )}
            </div>

            <button className="cart-btn" onClick={() => { setCartOpen(true); if (onOpenCart) onOpenCart(); }}>
              <FiShoppingCart />
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Мобильное выезжающее меню (бургер) */}
      {mobileNav && (
        <div className="mobile-nav-overlay" onClick={(e) => { if (e.target === e.currentTarget) setMobileNav(false); }}>
          <div className="mobile-nav-panel">
            <div className="mobile-nav-head">
              <span className="logo">Flori<em>sta</em></span>
              <button className="mobile-nav-close" aria-label="close" onClick={() => setMobileNav(false)}><FiX /></button>
            </div>
            <nav className="mobile-nav-links">
              <a href="#" onClick={() => setMobileNav(false)}>{lang === 'ru' ? 'Главная' : lang === 'en' ? 'Home' : 'Գլխավոր'}</a>
              <a href="#shop" onClick={() => setMobileNav(false)}>{lang === 'ru' ? 'Магазин' : lang === 'en' ? 'Shop' : 'Խանութ'}</a>
              <a href="#about" onClick={() => setMobileNav(false)}>{lang === 'ru' ? 'О нас' : lang === 'en' ? 'About' : 'Մեր մասին'}</a>
              <a href="#contact" onClick={() => setMobileNav(false)}>{lang === 'ru' ? 'Контакты' : lang === 'en' ? 'Contact' : 'Կապ'}</a>
              <a href="#track" onClick={() => setMobileNav(false)}>{lang === 'ru' ? 'Отслеживание' : lang === 'en' ? 'Tracking' : 'Հետևել'}</a>
            </nav>
          </div>
        </div>
      )}

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={(userData, token) => { onAuthSuccess(userData, token); setAuthOpen(false); }}
      />

      <UserDrawer
        open={userOpen}
        onClose={() => setUserOpen(false)}
        user={user}
        onUserUpdate={onUserUpdate}
        onLogout={onLogout}
        theme={theme}
        onThemeToggle={onThemeToggle}
        lang={lang}
        onLangSwitch={onLangSwitch}
      />

      <CartDrawer
        open={cartOpen}
        cart={cart}
        total={cartTotal}
        onClose={() => setCartOpen(false)}
        onUpdate={onCartUpdate}
        onRemove={onCartRemove}
        onCheckout={() => { setCartOpen(false); onCartCheckout(); }}
      />
    </>
  );
}
