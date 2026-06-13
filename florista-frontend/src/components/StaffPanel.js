import { useState, useEffect, useCallback } from 'react';
import {
  FiClipboard, FiTruck, FiCheck, FiX, FiSun, FiMoon, FiRefreshCw, FiLogOut,
  FiMapPin, FiMessageCircle, FiCreditCard, FiBarChart2, FiDollarSign,
  FiCalendar, FiPackage, FiChevronDown, FiChevronUp, FiTag,
} from 'react-icons/fi';
import { LuFlower } from 'react-icons/lu';
import { getUser, getToken } from '../lib/auth';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'staff_token';

const STATUSES = [
  { key: 'new',        icon: <FiClipboard />, label: 'Новый',      color: '#6366f1', next: 'assembling' },
  { key: 'assembling', icon: <LuFlower />,    label: 'Собирается', color: '#f59e0b', next: 'on_the_way' },
  { key: 'on_the_way', icon: <FiTruck />,     label: 'В пути',     color: '#3b82f6', next: 'delivered'  },
  { key: 'delivered',  icon: <FiCheck />,     label: 'Доставлен',  color: '#10b981', next: null          },
  { key: 'cancelled',  icon: <FiX />,         label: 'Отменён',    color: '#ef4444', next: null          },
];

const NEXT_LABEL = {
  assembling: 'Начать сборку',
  on_the_way: 'Отправить',
  delivered:  'Доставлен',
};

const fmt = (n) => '֏' + Number(n).toLocaleString('en-US');

function getStaffToken() { return sessionStorage.getItem(TOKEN_KEY) || getToken(); }
function staffHeaders(extra = {}) {
  const token = getStaffToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

/* Тема: все цвета — переменные. На тёмной теме текст светлый, на светлой — тёмный. */
function themeVars(dark) {
  return dark ? {
    bg: '#1a1715', card: '#211e1b', bord: '#3a3330',
    txt: '#f0ece8', txt2: '#a8a09c', txt3: '#7a736f',
    inputBg: '#2a2622', soft: '#262220', hover: '#2e2a26',
  } : {
    bg: '#faf8f7', card: '#ffffff', bord: '#e8e2df',
    txt: '#1a1a1a', txt2: '#666666', txt3: '#999999',
    inputBg: '#faf8f7', soft: '#faf8f7', hover: '#f4f0ee',
  };
}

function OrderCard({ order, onStatusChange, T }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading]   = useState(false);
  const st = STATUSES.find(s => s.key === order.status) || STATUSES[0];

  async function changeStatus(newStatus) {
    setLoading(true);
    await onStatusChange(order.id, newStatus);
    setLoading(false);
  }

  return (
    <div style={{ background: T.card, border: `1.5px solid ${st.color}40`, borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.05)', transition: 'box-shadow .2s' }}>
      {/* Шапка */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', cursor: 'pointer', background: `${st.color}08` }} onClick={() => setExpanded(e => !e)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `${st.color}20`, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
            {st.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: T.txt }}>Заказ #{order.id}</div>
            <div style={{ fontSize: '.8rem', color: T.txt2, marginTop: '.1rem' }}>
              {order.customer_name} · {order.phone}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, color: st.color, fontSize: '1rem' }}>{fmt(order.total)}</div>
            <div style={{ fontSize: '.72rem', color: T.txt3 }}>
              {new Date(order.created_at).toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <span style={{ color: T.txt3, fontSize: '1.2rem', display: 'flex' }}>{expanded ? <FiChevronUp /> : <FiChevronDown />}</span>
        </div>
      </div>

      {/* Детали */}
      {expanded && (
        <div style={{ padding: '1.25rem', borderTop: `1px solid ${T.bord}` }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: T.txt3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.3rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}><FiMapPin /> Адрес</div>
              <div style={{ fontSize: '.88rem', color: T.txt, lineHeight: 1.5 }}>{order.address}</div>
            </div>
            <div>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: T.txt3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.3rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}><FiMessageCircle /> Комментарий</div>
              <div style={{ fontSize: '.88rem', color: T.txt, lineHeight: 1.5 }}>{order.comment || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: T.txt3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.3rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}><FiCreditCard /> Оплата</div>
              <div style={{ fontSize: '.88rem', color: T.txt }}>{order.payment_method}</div>
            </div>
            <div>
              <div style={{ fontSize: '.72rem', fontWeight: 700, color: T.txt3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.3rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}><FiBarChart2 /> Статус</div>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', background: `${st.color}18`, color: st.color, padding: '.25rem .7rem', borderRadius: '99px', fontSize: '.78rem', fontWeight: 700 }}>
                {st.icon} {st.label}
              </span>
            </div>
            {order.promo_code && (
              <div>
                <div style={{ fontSize: '.72rem', fontWeight: 700, color: T.txt3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.3rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}><FiTag /> Промокод</div>
                <div style={{ fontSize: '.88rem', color: '#10b981', fontWeight: 700 }}>{order.promo_code} (−{fmt(order.discount_amount)})</div>
              </div>
            )}
          </div>

          {/* Состав */}
          <div style={{ background: T.soft, border: `1px solid ${T.bord}`, borderRadius: '10px', padding: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, color: T.txt3, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.75rem' }}>Состав заказа</div>
            {(order.items || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem', padding: '.5rem 0', borderBottom: i < order.items.length - 1 ? `1px solid ${T.bord}` : 'none' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: T.hover, color: '#c0474a', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.image_url
                    ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none'; }} />
                    : <LuFlower />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.88rem', fontWeight: 600, color: T.txt }}>{item.name}</div>
                  <div style={{ fontSize: '.78rem', color: T.txt2 }}>{fmt(item.price)} × {item.qty} шт.</div>
                </div>
                <div style={{ fontWeight: 700, color: '#c0474a', fontSize: '.9rem' }}>{fmt(item.price * item.qty)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.75rem', fontWeight: 700, fontSize: '1rem', color: '#c0474a' }}>
              <span>Итого</span><span>{fmt(order.total)}</span>
            </div>
          </div>

          {/* Кнопки */}
          <div style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap' }}>
            {st.next && (
              <button
                onClick={() => changeStatus(st.next)}
                disabled={loading}
                style={{ padding: '.7rem 1.5rem', background: st.color, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '.88rem', cursor: 'pointer', opacity: loading ? .7 : 1, transition: 'opacity .2s' }}>
                {loading ? '...' : NEXT_LABEL[st.next]}
              </button>
            )}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <button
                onClick={() => changeStatus('cancelled')}
                disabled={loading}
                style={{ padding: '.7rem 1.2rem', background: 'none', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: '10px', fontWeight: 600, fontSize: '.85rem', cursor: 'pointer', opacity: loading ? .7 : 1 }}>
                Отменить
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffPanel() {
  // Доступ только для аккаунтов с ролью staff или admin
  const [auth, setAuth] = useState(() => {
    if (sessionStorage.getItem(TOKEN_KEY)) return true;
    const u = getUser();
    return !!(u && ['staff', 'admin'].includes(u.role) && getToken());
  });
  const [staffName, setStaffName] = useState(() => getUser()?.name || '');

  const [theme, setTheme] = useState(() => localStorage.getItem('staff_theme') || 'light');
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next); localStorage.setItem('staff_theme', next);
  }
  const dark = theme === 'dark';
  const T = themeVars(dark);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter]   = useState('active'); // active | all | delivered
  const [toast, setToast]     = useState(null);

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  const [stats, setStats] = useState(null);
  const loadStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/stats`, { headers: staffHeaders() });
      const d = await res.json();
      if (d.success) setStats(d.data);
    } catch {}
  }, []);

  useEffect(() => { if (auth) loadStats(); }, [auth, loadStats]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === 'delivered'
        ? `${API}/staff/orders?status=delivered`
        : `${API}/staff/orders`;
      const res  = await fetch(url, { headers: staffHeaders() });
      if (res.status === 401 || res.status === 403) {
        sessionStorage.removeItem(TOKEN_KEY);
        setAuth(false);
        setLoginErr('Сессия истекла или нет прав. Войдите снова.');
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        const list = data.data;
        setOrders(filter === 'active'
          ? list.filter(o => !['delivered','cancelled'].includes(o.status))
          : list
        );
      }
    } catch { showToast('Ошибка загрузки', false); }
    setLoading(false);
  }, [filter]);

  useEffect(() => { if (auth) load(); }, [auth, load]);

  // Автообновление каждые 30 сек
  useEffect(() => {
    if (!auth) return;
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [auth, load]);

  async function handleStatusChange(id, status) {
    try {
      const res = await fetch(`${API}/staff/orders/${id}/status`, {
        method: 'PUT',
        headers: staffHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) { showToast('Статус обновлён'); load(); }
      else showToast(data.message || 'Ошибка', false);
    } catch { showToast('Ошибка сети', false); }
  }

  // Вход: только аккаунты со статусом «работник» (staff) или «админ»
  async function login(e) {
    e.preventDefault();
    setLoginErr('');
    if (!email || !password) { setLoginErr('Введите email и пароль'); return; }
    setLoggingIn(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!data.success) { setLoginErr(data.message || 'Ошибка входа'); }
      else if (!['staff', 'admin'].includes(data.data.role)) {
        setLoginErr('Доступ только для сотрудников. Попросите администратора выдать вам статус работника.');
      } else {
        sessionStorage.setItem(TOKEN_KEY, data.token);
        setStaffName(data.data.name);
        setAuth(true);
      }
    } catch { setLoginErr('Нет связи с сервером'); }
    setLoggingIn(false);
  }

  const counts = {
    new:        orders.filter(o => o.status === 'new').length,
    assembling: orders.filter(o => o.status === 'assembling').length,
    on_the_way: orders.filter(o => o.status === 'on_the_way').length,
  };

  if (!auth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1a1b 100%)' }}>
      <div style={{ background: '#fff', borderRadius: '20px', padding: '3rem', width: '380px', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,.3)' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '.5rem', color: '#c0474a', display: 'flex', justifyContent: 'center' }}><LuFlower /></div>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: '1.6rem', fontWeight: 600, marginBottom: '.25rem' }}>Florista</div>
        <div style={{ fontSize: '.78rem', letterSpacing: '.15em', textTransform: 'uppercase', color: '#aaa', marginBottom: '.75rem' }}>Панель сотрудника</div>
        <div style={{ fontSize: '.8rem', color: '#888', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Вход только для аккаунтов со статусом «работник» или «админ»
        </div>
        <form onSubmit={login}>
          {loginErr && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '.6rem', borderRadius: '8px', fontSize: '.83rem', marginBottom: '1rem' }}>{loginErr}</div>}
          <input
            type="email" placeholder="Email"
            value={email} onChange={e => setEmail(e.target.value)}
            style={{ width: '100%', padding: '.85rem 1rem', border: '1.5px solid #e8e2df', borderRadius: '10px', fontSize: '.95rem', fontFamily: 'inherit', outline: 'none', marginBottom: '.75rem', background: '#faf8f7' }}
            autoFocus
          />
          <input
            type="password" placeholder="Пароль"
            value={password} onChange={e => setPassword(e.target.value)}
            style={{ width: '100%', padding: '.85rem 1rem', border: '1.5px solid #e8e2df', borderRadius: '10px', fontSize: '.95rem', fontFamily: 'inherit', outline: 'none', marginBottom: '1rem', background: '#faf8f7' }}
          />
          <button type="submit" disabled={loggingIn} style={{ width: '100%', padding: '.9rem', background: '#c0474a', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '.95rem', cursor: 'pointer', opacity: loggingIn ? .7 : 1 }}>
            {loggingIn ? 'Вход...' : 'Войти →'}
          </button>
        </form>
        <a href="/" style={{ display: 'inline-block', marginTop: '1rem', fontSize: '.8rem', color: '#aaa' }}>← На сайт</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: 'system-ui, sans-serif', color: T.txt, transition: 'background .3s, color .3s' }}>
      {/* Header */}
      <div style={{ background: '#1a1a1a', color: '#fff', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '1.4rem', display: 'flex', color: '#c0474a' }}><LuFlower /></span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Florista — Заказы</div>
            <div style={{ fontSize: '.72rem', color: '#888' }}>Панель сотрудника{staffName ? ` · ${staffName}` : ''} · обновляется автоматически</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <button onClick={toggleTheme} style={{ padding: '.5rem 1rem', background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.15)', borderRadius: '8px', cursor: 'pointer', fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
            {dark ? <FiSun /> : <FiMoon />} {dark ? 'Светлая' : 'Тёмная'}
          </button>
          <button onClick={load} style={{ padding: '.5rem 1rem', background: 'rgba(255,255,255,.1)', color: '#fff', border: '1px solid rgba(255,255,255,.15)', borderRadius: '8px', cursor: 'pointer', fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
            <FiRefreshCw /> Обновить
          </button>
          <button onClick={() => { sessionStorage.removeItem(TOKEN_KEY); setAuth(false); }} style={{ padding: '.5rem 1rem', background: 'rgba(192,71,74,.3)', color: '#f87171', border: '1px solid rgba(192,71,74,.4)', borderRadius: '8px', cursor: 'pointer', fontSize: '.82rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
            <FiLogOut /> Выйти
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Выручка */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ background: T.card, border: `1px solid ${T.bord}`, borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <div style={{ fontSize: '1.6rem', color: '#10b981', display: 'flex' }}><FiDollarSign /></div>
              <div><div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#10b981' }}>{'֏' + Number(stats.orders.revenue || 0).toLocaleString('en-US')}</div><div style={{ fontSize: '.72rem', color: T.txt2 }}>Общая выручка</div></div>
            </div>
            <div style={{ background: T.card, border: `1px solid ${T.bord}`, borderRadius: '12px', padding: '1rem', display: 'flex', alignItems: 'center', gap: '.75rem' }}>
              <div style={{ fontSize: '1.6rem', color: '#3b82f6', display: 'flex' }}><FiCalendar /></div>
              <div><div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#3b82f6' }}>{'֏' + Number(stats.today.revenue || 0).toLocaleString('en-US')}</div><div style={{ fontSize: '.72rem', color: T.txt2 }}>Сегодня</div></div>
            </div>
          </div>
        )}

        {/* Счётчики */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { icon: <FiClipboard />, label: 'Новые',      count: counts.new,        color: '#6366f1' },
            { icon: <LuFlower />,    label: 'Собираются', count: counts.assembling,  color: '#f59e0b' },
            { icon: <FiTruck />,     label: 'В пути',     count: counts.on_the_way,  color: '#3b82f6' },
          ].map(s => (
            <div key={s.label} style={{ background: T.card, borderRadius: '12px', padding: '1.1rem', border: `1.5px solid ${s.color}30`, textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', marginBottom: '.25rem', color: s.color, display: 'flex', justifyContent: 'center' }}>{s.icon}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.count}</div>
              <div style={{ fontSize: '.75rem', color: T.txt2, marginTop: '.2rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Фильтры */}
        <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.5rem' }}>
          {[
            { key: 'active',    label: 'Активные' },
            { key: 'all',       label: 'Все' },
            { key: 'delivered', label: 'Доставленные' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '.5rem 1.1rem', borderRadius: '99px', border: '1.5px solid', borderColor: filter === f.key ? '#c0474a' : T.bord, background: filter === f.key ? '#c0474a' : T.card, color: filter === f.key ? '#fff' : T.txt2, fontWeight: 600, fontSize: '.82rem', cursor: 'pointer', transition: 'all .15s' }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Список */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: T.txt3 }}>Загрузка...</div>
        ) : !orders.length ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: T.txt3 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', display: 'flex', justifyContent: 'center', color: '#c0474a' }}><LuFlower /></div>
            <div style={{ fontSize: '1rem', fontWeight: 500 }}>Заказов нет</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map(order => (
              <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} T={T} />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: toast.ok ? '#f0fdf4' : '#fef2f2', color: toast.ok ? '#15803d' : '#dc2626', border: `1px solid ${toast.ok ? '#86efac' : '#fca5a5'}`, padding: '.8rem 1.3rem', borderRadius: '10px', fontWeight: 600, fontSize: '.88rem', boxShadow: '0 4px 20px rgba(0,0,0,.1)', zIndex: 9999 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
