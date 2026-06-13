import { useState } from 'react';
import { FiClipboard, FiTruck, FiCheck, FiX, FiSearch } from 'react-icons/fi';
import { LuFlower } from 'react-icons/lu';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const STATUSES = [
  { key: 'new',         icon: <FiClipboard />, label: 'Заказ принят', color: '#6366f1' },
  { key: 'assembling',  icon: <LuFlower />,    label: 'Собирается',   color: '#f59e0b' },
  { key: 'on_the_way',  icon: <FiTruck />,     label: 'В пути',       color: '#3b82f6' },
  { key: 'delivered',   icon: <FiCheck />,     label: 'Доставлен',    color: '#10b981' },
  { key: 'cancelled',   icon: <FiX />,         label: 'Отменён',      color: '#ef4444' },
];

function statusIndex(key) {
  const normal = ['new', 'assembling', 'on_the_way', 'delivered'];
  return normal.indexOf(key);
}

export default function OrderTrack() {
  const [orderId, setOrderId] = useState('');
  const [order, setOrder]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [cancelling, setCancelling] = useState(false);

  async function cancelOrder() {
    if (!order) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API}/orders/${order.id}/cancel`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) { setOrder(p => ({ ...p, status: 'cancelled' })); }
      else setError(data.message || 'Нельзя отменить заказ');
    } catch { setError('Ошибка соединения'); }
    setCancelling(false);
  }

  async function track() {
    if (!orderId.trim()) return;
    setLoading(true); setError(''); setOrder(null);
    try {
      const res = await fetch(`${API}/orders/${orderId}/status`);
      const data = await res.json();
      if (!data.success) { setError('Заказ не найден. Проверьте номер.'); }
      else setOrder(data.data);
    } catch { setError('Ошибка соединения'); }
    setLoading(false);
  }

  const st = order ? STATUSES.find(s => s.key === order.status) : null;
  const idx = order ? statusIndex(order.status) : -1;
  const steps = STATUSES.filter(s => s.key !== 'cancelled');

  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '520px', width: '100%' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '.5rem', textAlign: 'center' }}>
          Отследить <em style={{ color: 'var(--pink-400)' }}>заказ</em>
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '.9rem' }}>
          Введите номер заказа из письма подтверждения
        </p>

        <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem' }}>
          <input
            value={orderId}
            onChange={e => setOrderId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && track()}
            placeholder="Номер заказа, например: 42"
            style={{ flex: 1, padding: '.85rem 1.1rem', border: '1.5px solid var(--border)', borderRadius: '12px', fontSize: '1rem', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }}
          />
          <button className="btn-primary" onClick={track} disabled={loading} style={{ whiteSpace: 'nowrap' }}>
            {loading ? '...' : <><FiSearch style={{ verticalAlign: '-2px' }} /> Найти</>}
          </button>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#dc2626', padding: '1rem', borderRadius: '12px', textAlign: 'center', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {order && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.75rem', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.07em' }}>Заказ</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--pink-400)' }}>#{order.id}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginBottom: '.2rem' }}>
                  {new Date(order.created_at).toLocaleString('ru-RU', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: st?.color + '18', color: st?.color, padding: '.3rem .8rem', borderRadius: '99px', fontWeight: 600, fontSize: '.82rem' }}>
                  {st?.icon} {st?.label}
                </div>
              </div>
            </div>

            {/* Прогресс */}
            {order.status !== 'cancelled' && (
              <div style={{ marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginBottom: '.75rem' }}>
                  {/* Линия */}
                  <div style={{ position: 'absolute', top: '16px', left: '16px', right: '16px', height: '3px', background: 'var(--border)', borderRadius: '99px', zIndex: 0 }} />
                  <div style={{ position: 'absolute', top: '16px', left: '16px', height: '3px', borderRadius: '99px', zIndex: 1, background: 'var(--pink-400)', width: idx >= 0 ? `${(idx / (steps.length - 1)) * (100 - 0)}%` : '0%', transition: 'width .5s ease' }} />
                  {steps.map((s, i) => (
                    <div key={s.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.4rem', zIndex: 2, width: '60px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', background: i <= idx ? 'var(--pink-400)' : 'var(--bg-subtle)', border: `2px solid ${i <= idx ? 'var(--pink-400)' : 'var(--border)'}`, transition: 'all .3s' }}>
                        {i <= idx ? s.icon : <span style={{ fontSize: '.65rem', color: 'var(--text-muted)' }}>{i + 1}</span>}
                      </div>
                      <div style={{ fontSize: '.65rem', color: i <= idx ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === idx ? 700 : 400, textAlign: 'center', lineHeight: 1.3 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Специальное сообщение */}
            {order.status === 'on_the_way' && (
              <div style={{ background: '#eff6ff', border: '1px solid #93c5fd', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '.88rem', color: '#1d4ed8', lineHeight: 1.6, textAlign: 'center' }}>
                Ваш букет уже едет к вам!<br/>
                <strong>Свяжитесь с курьером и заберите ваш заказ</strong>
              </div>
            )}
            {order.status === 'delivered' && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '.88rem', color: '#15803d', lineHeight: 1.6, textAlign: 'center' }}>
                Заказ доставлен! Спасибо, что выбрали Florista
              </div>
            )}
            {order.status === 'cancelled' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '1rem', marginBottom: '1rem', fontSize: '.88rem', color: '#dc2626', lineHeight: 1.6, textAlign: 'center' }}>
                Заказ отменён. Свяжитесь с нами по телефону для уточнения.
              </div>
            )}

            {order && !['delivered','cancelled'].includes(order.status) && (
              <button onClick={cancelOrder} disabled={cancelling}
                style={{ width: '100%', marginTop: '.75rem', padding: '.7rem', background: 'none', border: '1.5px solid #ef4444', color: '#ef4444', borderRadius: '10px', fontWeight: 600, fontSize: '.85rem', cursor: 'pointer', opacity: cancelling ? .6 : 1 }}>
                {cancelling ? 'Отменяем...' : 'Отменить заказ'}
              </button>
            )}
            <div style={{ fontSize: '.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '.75rem' }}>
              Обновлено: {new Date(order.updated_at).toLocaleString('ru-RU', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
