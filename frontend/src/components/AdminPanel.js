import { useState, useEffect, useRef } from 'react';
import AdminChat from './AdminChat';
import {
  FiBarChart2, FiTrendingUp, FiPackage, FiMessageSquare, FiUsers, FiMessageCircle,
  FiTag, FiSend, FiSun, FiMoon, FiLogOut, FiX, FiPlus, FiEdit2, FiTrash2,
  FiCamera, FiStar, FiCopy, FiMail, FiKey, FiUser, FiShield, FiToggleLeft, FiToggleRight,
  FiDollarSign, FiCalendar, FiClock, FiAward, FiGift, FiCheckCircle, FiGrid,
} from 'react-icons/fi';
import { LuFlower } from 'react-icons/lu';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const ADMIN_API = (process.env.REACT_APP_API_URL || 'http://localhost:5000/api') + '/admin';
const THEME_KEY = 'adm_theme';
const TOKEN_KEY = 'adm_token';

// Заголовки с токеном админа для всех запросов панели
function admHeaders(extra = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

const fmt = (n) => '֏' + Number(n).toLocaleString('en-US');

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .adm-root {
    --rose:#c0474a; --rose-light:#f7e8e8; --rose-dark:#8b2e30;
    --ink:#1a1a1a; --ink-2:#444; --ink-3:#888;
    --surface:#fff; --surface-2:#faf8f7; --surface-3:#f2eeec;
    --border:#e8e2df;
    --green:#3a7d5a; --green-light:#e8f5ee;
    --red:#c0474a; --red-light:#fdf0f0;
    --blue:#1a56db; --blue-light:#e8f0fe;
    --sidebar-bg:#1a1a1a; --sidebar-text:rgba(255,255,255,0.6); --sidebar-border:rgba(255,255,255,.08);
    --shadow-sm:0 1px 4px rgba(0,0,0,.06); --shadow-md:0 4px 20px rgba(0,0,0,.08); --shadow-lg:0 12px 48px rgba(0,0,0,.12);
    --radius:12px; --radius-sm:8px;
    font-family:'DM Sans',sans-serif; background:var(--surface-2); color:var(--ink); min-height:100vh;
  }
  .adm-login { min-height:100vh; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#1a1a1a 0%,#2d1a1b 50%,#1a1a1a 100%); }
  .adm-login-box { background:var(--surface); border-radius:20px; padding:3rem; width:380px; box-shadow:var(--shadow-lg); text-align:center; animation:fadeUp .5s ease; }
  .adm-login-logo { font-family:'Cormorant Garamond',serif; font-size:2.4rem; color:var(--ink); margin-bottom:.3rem; }
  .adm-login-logo em { color:var(--rose); font-style:italic; }
  .adm-login-sub { font-size:.8rem; letter-spacing:.15em; text-transform:uppercase; color:var(--ink-3); margin-bottom:2.5rem; }
  .adm-input { width:100%; padding:.85rem 1.1rem; border:1.5px solid var(--border); border-radius:var(--radius-sm); font-family:inherit; font-size:.95rem; color:var(--ink); background:var(--surface-2); outline:none; transition:border-color .2s; margin-bottom:1rem; }
  .adm-input:focus { border-color:var(--rose); }
  .adm-btn { width:100%; padding:.9rem; background:var(--rose); color:#fff; border:none; border-radius:var(--radius-sm); font-family:inherit; font-size:.95rem; font-weight:600; cursor:pointer; transition:background .2s,transform .1s; }
  .adm-btn:hover { background:var(--rose-dark); }
  .adm-btn:active { transform:scale(.98); }
  .adm-btn:disabled { opacity:.6; cursor:not-allowed; }
  .adm-error { background:var(--red-light); color:var(--red); padding:.7rem 1rem; border-radius:var(--radius-sm); font-size:.85rem; margin-bottom:1rem; text-align:left; }
  .adm-layout { display:flex; min-height:100vh; }

  /* ── Sidebar — always dark regardless of theme ── */
  .adm-sidebar { width:240px; background:var(--sidebar-bg); color:#fff; display:flex; flex-direction:column; flex-shrink:0; position:sticky; top:0; height:100vh; overflow-y:auto; }
  .adm-sidebar-logo { padding:2rem 1.5rem 1.5rem; font-family:'Cormorant Garamond',serif; font-size:1.8rem; border-bottom:1px solid var(--sidebar-border); color:#fff; }
  .adm-sidebar-logo em { color:var(--rose); font-style:italic; }
  .adm-sidebar-label { font-size:.65rem; letter-spacing:.15em; text-transform:uppercase; color:rgba(255,255,255,.3); padding:1.5rem 1.5rem .5rem; }
  .adm-nav-item { display:flex; align-items:center; gap:.75rem; padding:.75rem 1.5rem; cursor:pointer; color:rgba(255,255,255,.6); font-size:.9rem; transition:all .15s; border:none; background:none; width:100%; text-align:left; }
  .adm-nav-item:hover { color:#fff; background:rgba(255,255,255,.06); }
  .adm-nav-item.active { color:#fff; background:rgba(192,71,74,.25); border-right:3px solid var(--rose); }
  .adm-nav-icon { font-size:1.1rem; width:20px; text-align:center; }
  .adm-sidebar-footer { margin-top:auto; padding:1.5rem; border-top:1px solid var(--sidebar-border); }
  .adm-logout-btn { width:100%; padding:.7rem; background:rgba(192,71,74,.2); color:#f87171; border:1px solid rgba(192,71,74,.3); border-radius:var(--radius-sm); font-family:inherit; font-size:.85rem; cursor:pointer; transition:background .2s; }
  .adm-logout-btn:hover { background:rgba(192,71,74,.35); }

  .adm-main { flex:1; padding:2.5rem; overflow-y:auto; animation:fadeUp .35s ease; background:var(--surface-2); color:var(--ink); }
  .adm-page-title { font-family:'Cormorant Garamond',serif; font-size:2rem; font-weight:600; margin-bottom:.3rem; }
  .adm-page-title em { color:var(--rose); font-style:italic; }
  .adm-page-sub { color:var(--ink-3); font-size:.88rem; margin-bottom:2rem; }
  .adm-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:1.2rem; margin-bottom:2.5rem; }
  .adm-stat-card { background:var(--surface); border-radius:var(--radius); padding:1.5rem; border:1px solid var(--border); box-shadow:var(--shadow-sm); }
  .adm-stat-icon { font-size:1.8rem; margin-bottom:.7rem; }
  .adm-stat-val { font-family:'Cormorant Garamond',serif; font-size:2rem; font-weight:600; color:var(--rose); line-height:1; margin-bottom:.3rem; }
  .adm-stat-label { font-size:.8rem; color:var(--ink-3); text-transform:uppercase; letter-spacing:.08em; }
  .adm-card { background:var(--surface); border-radius:var(--radius); border:1px solid var(--border); box-shadow:var(--shadow-sm); overflow:hidden; margin-bottom:1.5rem; }
  .adm-card-header { padding:1.2rem 1.5rem; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
  .adm-card-title { font-weight:600; font-size:.95rem; }
  .adm-table { width:100%; border-collapse:collapse; font-size:.88rem; }
  .adm-table th { background:var(--surface-3); padding:.75rem 1rem; text-align:left; font-size:.75rem; font-weight:600; letter-spacing:.06em; text-transform:uppercase; color:var(--ink-3); border-bottom:1px solid var(--border); }
  .adm-table td { padding:.9rem 1rem; border-bottom:1px solid var(--border); color:var(--ink-2); vertical-align:middle; }
  .adm-table tr:last-child td { border-bottom:none; }
  .adm-table tr:hover td { background:var(--surface-2); }
  .adm-prod-img { width:48px; height:48px; border-radius:var(--radius-sm); background:var(--surface-3); display:flex; align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0; overflow:hidden; }
  .adm-prod-img img { width:100%; height:100%; object-fit:cover; }
  .adm-badge { display:inline-flex; align-items:center; padding:.2rem .65rem; border-radius:99px; font-size:.75rem; font-weight:600; }
  .adm-badge-green { background:var(--green-light); color:var(--green); }
  .adm-badge-red   { background:var(--red-light);   color:var(--red); }
  .adm-badge-blue  { background:var(--blue-light);  color:var(--blue); }
  .adm-badge-gray  { background:var(--surface-3);   color:var(--ink-3); }
  .adm-action-btn { padding:.4rem .8rem; border-radius:var(--radius-sm); border:1.5px solid var(--border); background:none; font-family:inherit; font-size:.78rem; cursor:pointer; transition:all .15s; font-weight:500; color:var(--ink-2); }
  .adm-action-btn:hover { border-color:var(--rose); color:var(--rose); }
  .adm-action-btn.danger:hover { background:var(--red-light); border-color:var(--red); color:var(--red); }
  .adm-action-btn.promote:hover { background:var(--green-light); border-color:var(--green); color:var(--green); }
  .adm-form { padding:1.5rem; display:flex; flex-direction:column; gap:1.2rem; }
  .adm-form-row { display:grid; grid-template-columns:1fr 1fr; gap:1.2rem; }
  .adm-form-field { display:flex; flex-direction:column; gap:.4rem; }
  .adm-label { font-size:.8rem; font-weight:600; color:var(--ink-2); text-transform:uppercase; letter-spacing:.06em; }
  .adm-form-input { padding:.75rem 1rem; border:1.5px solid var(--border); border-radius:var(--radius-sm); font-family:inherit; font-size:.92rem; color:var(--ink); background:var(--surface-2); outline:none; transition:border-color .2s; }
  .adm-form-input:focus { border-color:var(--rose); background:var(--surface); }
  textarea.adm-form-input { resize:vertical; min-height:90px; }
  .adm-upload-area { border:2px dashed var(--border); border-radius:var(--radius); padding:2rem; text-align:center; cursor:pointer; transition:all .2s; background:var(--surface-2); }
  .adm-upload-area:hover,.adm-upload-area.drag { border-color:var(--rose); background:var(--rose-light); }
  .adm-upload-icon { font-size:2.5rem; margin-bottom:.5rem; }
  .adm-upload-text { font-size:.88rem; color:var(--ink-3); }
  .adm-upload-text strong { color:var(--rose); }
  .adm-preview { width:100%; max-height:200px; object-fit:contain; border-radius:var(--radius-sm); margin-top:1rem; }
  .adm-form-actions { display:flex; gap:1rem; padding-top:.5rem; }
  .adm-btn-primary { padding:.8rem 2rem; background:var(--rose); color:#fff; border:none; border-radius:var(--radius-sm); font-family:inherit; font-size:.9rem; font-weight:600; cursor:pointer; transition:background .2s; display:flex; align-items:center; gap:.5rem; }
  .adm-btn-primary:hover { background:var(--rose-dark); }
  .adm-btn-primary:disabled { opacity:.6; cursor:not-allowed; }
  .adm-btn-secondary { padding:.8rem 1.5rem; background:none; color:var(--ink-2); border:1.5px solid var(--border); border-radius:var(--radius-sm); font-family:inherit; font-size:.9rem; cursor:pointer; transition:border-color .2s; }
  .adm-btn-secondary:hover { border-color:var(--ink-2); }
  .adm-toast-wrap { position:fixed; bottom:2rem; right:2rem; display:flex; flex-direction:column; gap:.5rem; z-index:9999; }
  .adm-toast { padding:.8rem 1.3rem; border-radius:var(--radius-sm); font-size:.88rem; font-weight:500; box-shadow:var(--shadow-md); animation:slideIn .3s ease; display:flex; align-items:center; gap:.5rem; }
  .adm-toast.ok  { background:var(--green-light); color:var(--green); border:1px solid #b2d9c4; }
  .adm-toast.err { background:var(--red-light);   color:var(--red);   border:1px solid #f0b8b8; }
  .adm-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.5); display:flex; align-items:center; justify-content:center; z-index:1000; animation:fadeIn .2s ease; }
  .adm-modal { background:var(--surface); border-radius:var(--radius); width:560px; max-width:95vw; max-height:90vh; overflow-y:auto; box-shadow:var(--shadow-lg); animation:fadeUp .25s ease; }
  .adm-modal-header { padding:1.3rem 1.5rem; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
  .adm-modal-title { font-weight:600; font-size:1rem; }
  .adm-modal-close { background:none; border:none; font-size:1.2rem; cursor:pointer; color:var(--ink-3); line-height:1; }
  .adm-modal-close:hover { color:var(--ink); }
  .adm-confirm { padding:2rem 1.5rem; text-align:center; }
  .adm-confirm-icon { font-size:3rem; margin-bottom:1rem; }
  .adm-confirm h3 { font-size:1.1rem; margin-bottom:.5rem; }
  .adm-confirm p { color:var(--ink-3); font-size:.88rem; margin-bottom:1.5rem; }
  .adm-confirm-actions { display:flex; gap:.8rem; justify-content:center; }
  .adm-btn-danger { padding:.7rem 1.5rem; background:var(--red); color:#fff; border:none; border-radius:var(--radius-sm); font-family:inherit; font-size:.9rem; font-weight:600; cursor:pointer; }
  .adm-btn-danger:hover { background:#a33a3d; }
  .adm-discount-hint { font-size:.78rem; color:var(--green); margin-top:.3rem; font-weight:500; }
  .adm-review-text { font-size:.85rem; color:var(--ink-2); max-width:280px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .adm-spinner { width:32px; height:32px; border:3px solid var(--border); border-top-color:var(--rose); border-radius:50%; animation:spin .7s linear infinite; margin:3rem auto; }
  .adm-empty { text-align:center; padding:3rem; color:var(--ink-3); font-size:.9rem; }
  .adm-empty-icon { font-size:2.5rem; margin-bottom:.8rem; }

  /* ── Dark theme — только основной контент, sidebar всегда тёмный ── */
  .adm-root[data-theme='dark'] {
    --ink:#f0ece8; --ink-2:#c8c0bc; --ink-3:#8a8480;
    --surface:#1e1b18; --surface-2:#252118; --surface-3:#2e2a22;
    --border:#3d3830;
    --rose-light:#2d1a1b;
    --green-light:#162b20; --green:#4ade80;
    --red-light:#2d1515; --red:#f87171;
    --blue-light:#162030; --blue:#60a5fa;
    --shadow-sm:0 1px 4px rgba(0,0,0,.3); --shadow-md:0 4px 20px rgba(0,0,0,.4); --shadow-lg:0 12px 48px rgba(0,0,0,.5);
    /* sidebar остаётся темнее чем основной контент */
    --sidebar-bg:#121110; --sidebar-border:rgba(255,255,255,.06);
  }
  .adm-root[data-theme='dark'] .adm-form-input { background:var(--surface-3); color:var(--ink); border-color:var(--border); }
  .adm-root[data-theme='dark'] .adm-form-input:focus { background:var(--surface-2); border-color:var(--rose); }
  .adm-root[data-theme='dark'] .adm-upload-area { background:var(--surface-3); }
  .adm-root[data-theme='dark'] .adm-modal { background:var(--surface-2); }
  .adm-root[data-theme='dark'] .adm-modal-header { border-color:var(--border); }
  .adm-root[data-theme='dark'] .adm-input { background:var(--surface-3); color:var(--ink); border-color:var(--border); }
  .adm-root[data-theme='dark'] .adm-login-box { background:var(--surface-2); }

  .adm-theme-btn { padding:.45rem .9rem; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.08); color:rgba(255,255,255,.7); font-size:.8rem; cursor:pointer; transition:all .2s; width:100%; margin-bottom:.5rem; }
  .adm-theme-btn:hover { background:rgba(255,255,255,.15); color:#fff; }

  @keyframes spin    { to { transform:rotate(360deg); } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:none; } }
`;

function useToast() {
  const [toasts, setToasts] = useState([]);
  function toast(msg, type = 'ok') {
    const id = Date.now();
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500);
  }
  return { toasts, toast };
}

function Stars({ rating }) {
  return (
    <span>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < rating ? '#f59e0b' : '#d1d5db' }}>★</span>
      ))}
    </span>
  );
}

/* ─── ProductForm ─── */
function ProductForm({ initial, onSave, onCancel, loading, categories = [] }) {
  const [form, setForm] = useState({
    name: initial?.name || '', name_hy: initial?.name_hy || '', name_en: initial?.name_en || '',
    price: initial?.price || '',
    old_price: initial?.old_price || '', discount: initial?.discount || '',
    category_id: initial?.category_id || '',
    description: initial?.description || '', description_hy: initial?.description_hy || '', description_en: initial?.description_en || '',
    stock: initial?.stock ?? '',
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial?.image_url || null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef();

  function set(k, v) {
    setForm((p) => {
      const next = { ...p, [k]: v };
      const price    = parseFloat(k === 'price'    ? v : next.price)    || 0;
      const discount = parseFloat(k === 'discount' ? v : next.discount) || 0;
      next.old_price = (price > 0 && discount > 0) ? Math.round(price / (1 - discount / 100)) : '';
      return next;
    });
  }

  function handleFile(f) { if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)); }
  function handleDrop(e) { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }
  function handleSubmit() {
    if (!form.name || !form.price) return;
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (k === 'stock' || v !== '') fd.append(k, v); });
    if (file) fd.append('image', file);
    onSave(fd);
  }

  const saving = form.old_price && form.price ? Math.round(form.old_price - form.price) : 0;

  return (
    <div className="adm-form">
      <div className="adm-form-row">
        <div className="adm-form-field">
          <label className="adm-label">Название (RU) *</label>
          <input className="adm-form-input" placeholder="Букет роз" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div className="adm-form-field">
          <label className="adm-label">Цена (֏) *</label>
          <input className="adm-form-input" type="number" placeholder="12000" value={form.price} onChange={(e) => set('price', e.target.value)} />
        </div>
      </div>
      <div className="adm-form-row">
        <div className="adm-form-field">
          <label className="adm-label">Название (HY) — հայերեն</label>
          <input className="adm-form-input" placeholder="Վարդերի փունջ" value={form.name_hy} onChange={(e) => set('name_hy', e.target.value)} />
        </div>
        <div className="adm-form-field">
          <label className="adm-label">Название (EN) — English</label>
          <input className="adm-form-input" placeholder="Rose Bouquet" value={form.name_en} onChange={(e) => set('name_en', e.target.value)} />
        </div>
      </div>
      <div className="adm-form-row">
        <div className="adm-form-field">
          <label className="adm-label">На складе (шт., пусто = безлимит)</label>
          <input className="adm-form-input" type="number" min="0" placeholder="например: 1000"
            value={form.stock} onChange={(e) => setForm(p => ({ ...p, stock: e.target.value }))} />
        </div>
        <div className="adm-form-field">
          <label className="adm-label">Скидка (%)</label>
          <input className="adm-form-input" type="number" placeholder="20" min="0" max="99" value={form.discount} onChange={(e) => set('discount', e.target.value)} />
        </div>
        <div className="adm-form-field">
          <label className="adm-label">Старая цена (֏) — авто</label>
          <input className="adm-form-input" type="number" value={form.old_price} readOnly style={{ background: 'var(--surface-3)', color: 'var(--ink-3)', cursor: 'not-allowed' }} />
          {saving > 0 && <div className="adm-discount-hint">Экономия: ֏{saving.toLocaleString('en-US')}</div>}
        </div>
      </div>
      <div className="adm-form-field">
        <label className="adm-label">Категория</label>
        <select className="adm-form-input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
          <option value="">— без категории —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.name_en ? ` / ${c.name_en}` : ''}</option>)}
        </select>
      </div>
      <div className="adm-form-field">
        <label className="adm-label">Описание (RU)</label>
        <textarea className="adm-form-input" placeholder="Опишите букет..." value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div className="adm-form-row">
        <div className="adm-form-field">
          <label className="adm-label">Описание (HY) — հայերեն</label>
          <textarea className="adm-form-input" placeholder="Նկարագրություն..." value={form.description_hy} onChange={(e) => set('description_hy', e.target.value)} />
        </div>
        <div className="adm-form-field">
          <label className="adm-label">Описание (EN) — English</label>
          <textarea className="adm-form-input" placeholder="Description..." value={form.description_en} onChange={(e) => set('description_en', e.target.value)} />
        </div>
      </div>
      <div className="adm-form-field">
        <label className="adm-label">Фото товара</label>
        <div className={`adm-upload-area${drag ? ' drag' : ''}`} onClick={() => fileRef.current.click()} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={handleDrop}>
          <div className="adm-upload-icon"><FiCamera /></div>
          <div className="adm-upload-text"><strong>Кликни</strong> или перетащи фото сюда<br /><span style={{ fontSize: '.75rem' }}>JPG, PNG, WebP — до 5 МБ</span></div>
          {preview && <img src={preview} className="adm-preview" alt="preview" />}
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>
      <div className="adm-form-actions">
        <button className="adm-btn-primary" onClick={handleSubmit} disabled={loading || !form.name || !form.price}>
          {loading ? 'Сохранение...' : (initial ? <><FiCheckCircle style={{ verticalAlign: '-2px' }} /> Сохранить</> : <><FiPlus style={{ verticalAlign: '-2px' }} /> Добавить товар</>)}
        </button>
        {onCancel && <button className="adm-btn-secondary" onClick={onCancel}>Отмена</button>}
      </div>
    </div>
  );
}

/* ─── ProductsPage ─── */
function ProductsPage({ toast }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [view, setView]         = useState('list');
  const [editProduct, setEditProduct]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { load(); loadCats(); }, []);
  async function load() {
    setLoading(true);
    try { const r = await fetch(`${API}/products`); const d = await r.json(); if (d.success) setProducts(d.data); }
    catch { toast('Ошибка загрузки', 'err'); }
    setLoading(false);
  }
  async function loadCats() {
    try { const r = await fetch(`${API}/categories`); const d = await r.json(); if (d.success) setCategories(d.data); } catch {}
  }
  // Пополнение склада: «пришло пополнение на N штук»
  async function handleRestock(p) {
    const raw = window.prompt(`Пополнить «${p.name}». Сколько штук добавить?` + (p.stock === null ? '\n(сейчас безлимит — после пополнения остаток начнёт отслеживаться)' : `\nСейчас на складе: ${p.stock} шт.`), '100');
    if (raw === null) return;
    const amount = parseInt(raw);
    if (!(amount >= 1)) { toast('Введите число от 1', 'err'); return; }
    try {
      const r = await fetch(`${ADMIN_API}/products/${p.id}/restock`, {
        method: 'PUT',
        headers: admHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ amount }),
      });
      const d = await r.json();
      if (d.success) { toast(`Остаток: ${d.data.stock} шт.`); load(); }
      else toast(d.message || 'Ошибка', 'err');
    } catch { toast('Ошибка сети', 'err'); }
  }

  async function handleAdd(fd) {
    setSaving(true);
    try { const r = await fetch(`${ADMIN_API}/products`, { method: 'POST', headers: admHeaders(), body: fd }); const d = await r.json(); if (d.success) { toast('Товар добавлен!'); setView('list'); load(); } else toast(d.message || 'Ошибка', 'err'); }
    catch { toast('Ошибка сети', 'err'); }
    setSaving(false);
  }
  async function handleEdit(fd) {
    setSaving(true);
    try { await fetch(`${ADMIN_API}/products/${editProduct.id}`, { method: 'DELETE', headers: admHeaders() }); const r = await fetch(`${ADMIN_API}/products`, { method: 'POST', headers: admHeaders(), body: fd }); const d = await r.json(); if (d.success) { toast('Товар обновлён!'); setEditProduct(null); load(); } else toast(d.message || 'Ошибка', 'err'); }
    catch { toast('Ошибка сети', 'err'); }
    setSaving(false);
  }
  async function handleDelete(id) {
    try { const r = await fetch(`${ADMIN_API}/products/${id}`, { method: 'DELETE', headers: admHeaders() }); const d = await r.json(); if (d.success) { toast('Удалён'); setDeleteTarget(null); load(); } else toast(d.message || 'Ошибка', 'err'); }
    catch { toast('Ошибка сети', 'err'); }
  }

  return (
    <>
      <div className="adm-page-title">Управление <em>товарами</em></div>
      <div className="adm-page-sub">Добавляй, редактируй и удаляй товары магазина</div>
      {view === 'add' && (
        <div className="adm-card">
          <div className="adm-card-header"><span className="adm-card-title"><FiPlus style={{ verticalAlign: '-2px' }} /> Новый товар</span><button className="adm-btn-secondary" style={{ padding: '.4rem .9rem', fontSize: '.8rem' }} onClick={() => setView('list')}><FiX style={{ verticalAlign: '-2px' }} /> Закрыть</button></div>
          <ProductForm onSave={handleAdd} onCancel={() => setView('list')} loading={saving} categories={categories} />
        </div>
      )}
      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title"><FiPackage style={{ verticalAlign: '-2px' }} /> Все товары ({products.length})</span>
          {view !== 'add' && <button className="adm-btn-primary" style={{ padding: '.5rem 1.2rem', fontSize: '.85rem' }} onClick={() => setView('add')}><FiPlus style={{ verticalAlign: '-2px' }} /> Добавить</button>}
        </div>
        {loading ? <div className="adm-spinner" /> : !products.length ? (
          <div className="adm-empty"><div className="adm-empty-icon"><LuFlower /></div><p>Товаров пока нет</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>Фото</th><th>Название</th><th>Цена</th><th>Скидка</th><th>Остаток</th><th>Категория</th><th>Действия</th></tr></thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td><div className="adm-prod-img">{p.image_url ? <img src={p.image_url} alt={p.name} onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }} /> : <LuFlower />}</div></td>
                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{p.name}</td>
                    <td>{fmt(p.price)}</td>
                    <td>{p.discount > 0 ? <span className="adm-badge adm-badge-green">-{p.discount}%</span> : <span className="adm-badge adm-badge-gray">—</span>}</td>
                    <td>
                      {p.stock === null
                        ? <span className="adm-badge adm-badge-gray">безлимит</span>
                        : p.stock === 0
                          ? <span className="adm-badge adm-badge-red">нет в наличии</span>
                          : <span className="adm-badge adm-badge-green">{p.stock} шт.</span>}
                    </td>
                    <td>{p.category_id || '—'}</td>
                    <td><div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}><button className="adm-action-btn" onClick={() => setEditProduct(p)}><FiEdit2 style={{ verticalAlign: '-2px' }} /> Изменить</button><button className="adm-action-btn promote" onClick={() => handleRestock(p)}><FiPlus style={{ verticalAlign: '-2px' }} /> Пополнить</button><button className="adm-action-btn danger" onClick={() => setDeleteTarget(p)}><FiTrash2 style={{ verticalAlign: '-2px' }} /> Удалить</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {editProduct && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditProduct(null)}>
          <div className="adm-modal">
            <div className="adm-modal-header"><span className="adm-modal-title"><FiEdit2 style={{ verticalAlign: '-2px' }} /> {editProduct.name}</span><button className="adm-modal-close" onClick={() => setEditProduct(null)}><FiX /></button></div>
            <ProductForm initial={editProduct} onSave={handleEdit} onCancel={() => setEditProduct(null)} loading={saving} categories={categories} />
          </div>
        </div>
      )}
      {deleteTarget && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="adm-modal" style={{ width: '400px' }}>
            <div className="adm-confirm">
              <div className="adm-confirm-icon"><FiTrash2 /></div><h3>Удалить товар?</h3>
              <p>«{deleteTarget.name}» будет удалён навсегда.</p>
              <div className="adm-confirm-actions"><button className="adm-btn-danger" onClick={() => handleDelete(deleteTarget.id)}>Да, удалить</button><button className="adm-btn-secondary" onClick={() => setDeleteTarget(null)}>Отмена</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── ReviewsPage ─── */
function ReviewsPage({ toast }) {
  const [reviews, setReviews]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { const r = await fetch(`${ADMIN_API}/reviews`, { headers: admHeaders() }); const d = await r.json(); if (d.success) setReviews(d.data); }
    catch { toast('Ошибка загрузки', 'err'); }
    setLoading(false);
  }
  async function handleDelete(id) {
    try { const r = await fetch(`${ADMIN_API}/reviews/${id}`, { method: 'DELETE', headers: admHeaders() }); const d = await r.json(); if (d.success) { toast('Отзыв удалён'); setDeleteTarget(null); load(); } else toast(d.message || 'Ошибка', 'err'); }
    catch { toast('Ошибка сети', 'err'); }
  }

  return (
    <>
      <div className="adm-page-title">Модерация <em>отзывов</em></div>
      <div className="adm-page-sub">Просматривай и удаляй отзывы пользователей</div>
      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title"><FiMessageSquare style={{ verticalAlign: '-2px' }} /> Все отзывы ({reviews.length})</span></div>
        {loading ? <div className="adm-spinner" /> : !reviews.length ? (
          <div className="adm-empty"><div className="adm-empty-icon"><FiMessageSquare /></div><p>Отзывов пока нет</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>Товар</th><th>Автор</th><th>Оценка</th><th>Отзыв</th><th>Дата</th><th>Действия</th></tr></thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{r.product_name || '—'}</td>
                    <td>{r.author}</td>
                    <td><Stars rating={r.rating} /> <span style={{ fontSize: '.78rem', color: 'var(--ink-3)' }}>{r.rating}/5</span></td>
                    <td><div className="adm-review-text">{r.comment}</div></td>
                    <td style={{ fontSize: '.8rem', color: 'var(--ink-3)' }}>{new Date(r.created_at).toLocaleDateString('ru-RU')}</td>
                    <td><button className="adm-action-btn danger" onClick={() => setDeleteTarget(r)}><FiTrash2 style={{ verticalAlign: '-2px' }} /> Удалить</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {deleteTarget && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="adm-modal" style={{ width: '420px' }}>
            <div className="adm-confirm">
              <div className="adm-confirm-icon"><FiTrash2 /></div><h3>Удалить отзыв?</h3>
              <p>Отзыв от «{deleteTarget.author}» будет удалён навсегда.</p>
              <div style={{ background: 'var(--surface-2)', borderRadius: '8px', padding: '.75rem 1rem', margin: '0 0 1.5rem', fontSize: '.85rem', color: 'var(--ink-2)', fontStyle: 'italic' }}>"{deleteTarget.comment}"</div>
              <div className="adm-confirm-actions"><button className="adm-btn-danger" onClick={() => handleDelete(deleteTarget.id)}>Да, удалить</button><button className="adm-btn-secondary" onClick={() => setDeleteTarget(null)}>Отмена</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── UsersPage ─── */
function UsersPage({ toast }) {
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { const r = await fetch(`${ADMIN_API}/users`, { headers: admHeaders() }); const d = await r.json(); if (d.success) setUsers(d.data); }
    catch { toast('Ошибка загрузки', 'err'); }
    setLoading(false);
  }
  async function handleRoleChange(id, role) {
    try {
      const r = await fetch(`${ADMIN_API}/users/${id}/role`, { method: 'PUT', headers: admHeaders({ 'Content-Type': 'application/json' }), body: JSON.stringify({ role }) });
      const d = await r.json();
      if (d.success) { toast(`Роль изменена на ${role}`); load(); } else toast(d.message || 'Ошибка', 'err');
    } catch { toast('Ошибка сети', 'err'); }
  }
  async function handleDelete(id) {
    try { const r = await fetch(`${ADMIN_API}/users/${id}`, { method: 'DELETE', headers: admHeaders() }); const d = await r.json(); if (d.success) { toast('Пользователь удалён'); setDeleteTarget(null); load(); } else toast(d.message || 'Ошибка', 'err'); }
    catch { toast('Ошибка сети', 'err'); }
  }

  return (
    <>
      <div className="adm-page-title">Модерация <em>пользователей</em></div>
      <div className="adm-page-sub">Назначай работников (доступ к staff-панели), админов и удаляй пользователей</div>
      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title"><FiUsers style={{ verticalAlign: '-2px' }} /> Все пользователи ({users.length})</span></div>
        {loading ? <div className="adm-spinner" /> : !users.length ? (
          <div className="adm-empty"><div className="adm-empty-icon"><FiUsers /></div><p>Пользователей пока нет</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>#</th><th>Имя</th><th>Email</th><th>Роль</th><th>Дата регистрации</th><th>Действия</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ color: 'var(--ink-3)', fontSize: '.8rem' }}>{u.id}</td>
                    <td style={{ fontWeight: 500, color: 'var(--ink)' }}>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.role === 'admin' && <span className="adm-badge adm-badge-red"><FiShield style={{ marginRight: 4 }} /> админ</span>}
                      {u.role === 'staff' && <span className="adm-badge adm-badge-green"><FiAward style={{ marginRight: 4 }} /> работник</span>}
                      {u.role === 'user'  && <span className="adm-badge adm-badge-blue"><FiUser style={{ marginRight: 4 }} /> user</span>}
                    </td>
                    <td style={{ fontSize: '.8rem', color: 'var(--ink-3)' }}>{new Date(u.created_at).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                        {u.role !== 'staff' && (
                          <button className="adm-action-btn promote" onClick={() => handleRoleChange(u.id, 'staff')}>
                            <FiAward style={{ verticalAlign: '-2px' }} /> Сделать работником
                          </button>
                        )}
                        {u.role !== 'admin' && (
                          <button className="adm-action-btn promote" onClick={() => handleRoleChange(u.id, 'admin')}>
                            <FiShield style={{ verticalAlign: '-2px' }} /> Сделать админом
                          </button>
                        )}
                        {u.role !== 'user' && (
                          <button className="adm-action-btn" onClick={() => handleRoleChange(u.id, 'user')}>
                            <FiUser style={{ verticalAlign: '-2px' }} /> Снять права
                          </button>
                        )}
                        <button className="adm-action-btn danger" onClick={() => setDeleteTarget(u)}>
                          <FiTrash2 style={{ verticalAlign: '-2px' }} /> Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {deleteTarget && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="adm-modal" style={{ width: '400px' }}>
            <div className="adm-confirm">
              <div className="adm-confirm-icon"><FiTrash2 /></div><h3>Удалить пользователя?</h3>
              <p>«{deleteTarget.name}» ({deleteTarget.email}) будет удалён навсегда.</p>
              <div className="adm-confirm-actions"><button className="adm-btn-danger" onClick={() => handleDelete(deleteTarget.id)}>Да, удалить</button><button className="adm-btn-secondary" onClick={() => setDeleteTarget(null)}>Отмена</button></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── StatsPage ─── */
function StatsPage({ toast }) {
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/stats`, { headers: admHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); else toast('Ошибка загрузки статистики', 'err'); })
      .catch(() => toast('Ошибка сети', 'err'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="adm-spinner" />;
  if (!data) return <div className="adm-empty"><div className="adm-empty-icon"><FiBarChart2 /></div><p>Нет данных</p></div>;

  const fmtLocal = (n) => '֏' + Number(n || 0).toLocaleString('en-US');
  const statusLabels = { new: 'Новые', assembling: 'Собираются', on_the_way: 'В пути', delivered: 'Доставлены', cancelled: 'Отменены' };
  const statusColors = { new: '#6366f1', assembling: '#f59e0b', on_the_way: '#3b82f6', delivered: '#10b981', cancelled: '#ef4444' };

  return (
    <>
      <div className="adm-page-title">Статистика <em>продаж</em></div>
      <div className="adm-page-sub">Данные о заказах и доходах магазина</div>

      <div className="adm-stats">
        <div className="adm-stat-card"><div className="adm-stat-icon"><FiDollarSign /></div><div className="adm-stat-val">{fmtLocal(data.orders.revenue)}</div><div className="adm-stat-label">Общая выручка</div></div>
        <div className="adm-stat-card"><div className="adm-stat-icon"><FiPackage /></div><div className="adm-stat-val">{data.orders.total}</div><div className="adm-stat-label">Всего заказов</div></div>
        <div className="adm-stat-card"><div className="adm-stat-icon"><FiCalendar /></div><div className="adm-stat-val">{fmtLocal(data.today.revenue)}</div><div className="adm-stat-label">Сегодня</div></div>
        <div className="adm-stat-card"><div className="adm-stat-icon"><FiClock /></div><div className="adm-stat-val">{data.pending.total}</div><div className="adm-stat-label">В обработке</div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="adm-card">
          <div className="adm-card-header"><span className="adm-card-title"><FiBarChart2 style={{ verticalAlign: '-2px' }} /> Заказы по статусам</span></div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {data.byStatus.map(s => (
              <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColors[s.status] || '#aaa', flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: '.88rem', color: 'var(--ink-2)' }}>{statusLabels[s.status] || s.status}</div>
                <div style={{ fontWeight: 700, color: statusColors[s.status] || '#aaa' }}>{s.cnt}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-card-header"><span className="adm-card-title"><FiAward style={{ verticalAlign: '-2px' }} /> Топ товаров</span></div>
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {data.topProducts.length ? data.topProducts.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--rose)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.75rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, fontSize: '.85rem', color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                <div style={{ fontSize: '.78rem', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>{p.sold} шт · {fmtLocal(p.revenue)}</div>
              </div>
            )) : <div className="adm-empty" style={{ padding: '1rem' }}><p>Заказов пока нет</p></div>}
          </div>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title"><FiCalendar style={{ verticalAlign: '-2px' }} /> За последние 7 дней</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="adm-table">
            <thead><tr><th>Дата</th><th>Заказов</th><th>Выручка</th></tr></thead>
            <tbody>
              {data.byDay.length ? data.byDay.map((d, i) => (
                <tr key={i}>
                  <td>{new Date(d.day).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' })}</td>
                  <td><span className="adm-badge adm-badge-blue">{d.orders}</span></td>
                  <td style={{ fontWeight: 600, color: 'var(--green)' }}>{fmtLocal(d.revenue)}</td>
                </tr>
              )) : <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--ink-3)', padding: '2rem' }}>Нет данных за этот период</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title"><FiStar style={{ verticalAlign: '-2px' }} /> Отзывы</span></div>
        <div style={{ padding: '1.5rem', display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia,serif', fontSize: '3rem', fontWeight: 600, color: 'var(--rose)', lineHeight: 1 }}>{parseFloat(data.reviews.avg || 0).toFixed(1)}</div>
            <div style={{ fontSize: '.8rem', color: 'var(--ink-3)', marginTop: '.3rem' }}>Средняя оценка</div>
          </div>
          <div style={{ fontSize: '1.8rem', letterSpacing: '.1em' }}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ color: i < Math.round(data.reviews.avg) ? '#f59e0b' : 'var(--border)' }}>★</span>
            ))}
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: '.9rem' }}>на основе <strong style={{ color: 'var(--ink)' }}>{data.reviews.total}</strong> отзывов</div>
        </div>
      </div>
    </>
  );
}

/* ─── DashboardPage ─── */
function DashboardPage() {
  const [stats, setStats]       = useState({ products: 0, withDiscount: 0, reviews: 0, users: 0 });
  const [products, setProducts] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch(`${API}/products`).then(r => r.json()),
      fetch(`${ADMIN_API}/reviews`, { headers: admHeaders() }).then(r => r.json()),
      fetch(`${ADMIN_API}/users`, { headers: admHeaders() }).then(r => r.json()),
    ]).then(([pd, rd, ud]) => {
      const list = pd.success ? pd.data : [];
      setProducts(list);
      setStats({ products: list.length, withDiscount: list.filter(p => p.discount > 0).length, reviews: rd.success ? rd.data.length : 0, users: ud.success ? ud.data.length : 0 });
    });
  }, []);

  return (
    <>
      <div className="adm-page-title">Добро пожаловать в <em>Florista</em></div>
      <div className="adm-page-sub">Обзор магазина</div>
      <div className="adm-stats">
        <div className="adm-stat-card"><div className="adm-stat-icon"><FiPackage /></div><div className="adm-stat-val">{stats.products}</div><div className="adm-stat-label">Товаров</div></div>
        <div className="adm-stat-card"><div className="adm-stat-icon"><FiTag /></div><div className="adm-stat-val">{stats.withDiscount}</div><div className="adm-stat-label">Со скидкой</div></div>
        <div className="adm-stat-card"><div className="adm-stat-icon"><FiMessageSquare /></div><div className="adm-stat-val">{stats.reviews}</div><div className="adm-stat-label">Отзывов</div></div>
        <div className="adm-stat-card"><div className="adm-stat-icon"><FiUsers /></div><div className="adm-stat-val">{stats.users}</div><div className="adm-stat-label">Пользователей</div></div>
      </div>
      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title"><FiPackage style={{ verticalAlign: '-2px' }} /> Последние товары</span></div>
        {!products.length ? <div className="adm-empty"><div className="adm-empty-icon"><LuFlower /></div><p>Товаров нет</p></div> : (
          <table className="adm-table">
            <thead><tr><th>Фото</th><th>Название</th><th>Цена</th><th>Скидка</th></tr></thead>
            <tbody>
              {products.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td><div className="adm-prod-img">{p.image_url ? <img src={p.image_url} alt={p.name} /> : <LuFlower />}</div></td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td>{fmt(p.price)}</td>
                  <td>{p.discount > 0 ? <span className="adm-badge adm-badge-green">-{p.discount}%</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}


/* ─── CategoriesPage — управление категориями с переводами ─── */
function CategoriesPage({ toast }) {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // объект категории или {} для новой
  const [form, setForm] = useState({ name: '', name_hy: '', name_en: '' });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { const r = await fetch(`${API}/categories`); const d = await r.json(); if (d.success) setCats(d.data); }
    catch { toast('Ошибка загрузки', 'err'); }
    setLoading(false);
  }

  function openNew() { setForm({ name: '', name_hy: '', name_en: '' }); setEditing({}); }
  function openEdit(c) { setForm({ name: c.name || '', name_hy: c.name_hy || '', name_en: c.name_en || '' }); setEditing(c); }

  async function save() {
    if (!form.name.trim()) { toast('Введите название (RU)', 'err'); return; }
    setSaving(true);
    try {
      const isNew = !editing.id;
      const url = isNew ? `${ADMIN_API}/categories` : `${ADMIN_API}/categories/${editing.id}`;
      const r = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: admHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) { toast(isNew ? 'Категория добавлена' : 'Категория обновлена'); setEditing(null); load(); }
      else toast(d.message || 'Ошибка', 'err');
    } catch { toast('Ошибка сети', 'err'); }
    setSaving(false);
  }

  async function remove(id) {
    try {
      const r = await fetch(`${ADMIN_API}/categories/${id}`, { method: 'DELETE', headers: admHeaders() });
      const d = await r.json();
      if (d.success) { toast('Категория удалена'); setDeleteTarget(null); load(); }
      else toast(d.message || 'Ошибка', 'err');
    } catch { toast('Ошибка сети', 'err'); }
  }

  return (
    <>
      <div className="adm-page-title">Управление <em>категориями</em></div>
      <div className="adm-page-sub">Добавляй категории и задавай их перевод на русский, армянский и английский</div>

      {editing && (
        <div className="adm-card">
          <div className="adm-card-header">
            <span className="adm-card-title">{editing.id ? <><FiEdit2 style={{ verticalAlign: '-2px' }} /> Редактирование</> : <><FiPlus style={{ verticalAlign: '-2px' }} /> Новая категория</>}</span>
            <button className="adm-btn-secondary" style={{ padding: '.4rem .9rem', fontSize: '.8rem' }} onClick={() => setEditing(null)}><FiX style={{ verticalAlign: '-2px' }} /> Закрыть</button>
          </div>
          <div className="adm-form">
            <div className="adm-form-row">
              <div className="adm-form-field">
                <label className="adm-label">Название (RU) *</label>
                <input className="adm-form-input" placeholder="Розы" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="adm-form-field">
                <label className="adm-label">Название (HY) — հայերեն</label>
                <input className="adm-form-input" placeholder="Վարդեր" value={form.name_hy} onChange={(e) => setForm(p => ({ ...p, name_hy: e.target.value }))} />
              </div>
              <div className="adm-form-field">
                <label className="adm-label">Название (EN) — English</label>
                <input className="adm-form-input" placeholder="Roses" value={form.name_en} onChange={(e) => setForm(p => ({ ...p, name_en: e.target.value }))} />
              </div>
            </div>
            <div className="adm-form-actions">
              <button className="adm-btn-primary" onClick={save} disabled={saving || !form.name.trim()}>
                {saving ? 'Сохранение...' : <><FiCheckCircle /> Сохранить</>}
              </button>
              <button className="adm-btn-secondary" onClick={() => setEditing(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      <div className="adm-card">
        <div className="adm-card-header">
          <span className="adm-card-title"><FiGrid style={{ verticalAlign: '-2px' }} /> Все категории ({cats.length})</span>
          {!editing && <button className="adm-btn-primary" style={{ padding: '.5rem 1rem', fontSize: '.82rem' }} onClick={openNew}><FiPlus style={{ verticalAlign: '-2px' }} /> Добавить</button>}
        </div>
        {loading ? <div className="adm-spinner" /> : !cats.length ? (
          <div className="adm-empty"><div className="adm-empty-icon"><FiGrid /></div><p>Категорий пока нет</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>ID</th><th>Русский</th><th>Հայերեն</th><th>English</th><th>Действия</th></tr></thead>
              <tbody>
                {cats.map((c) => (
                  <tr key={c.id}>
                    <td style={{ color: 'var(--ink-3)' }}>{c.id}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.name_hy || <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                    <td>{c.name_en || <span style={{ color: 'var(--ink-3)' }}>—</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.5rem' }}>
                        <button className="adm-action-btn" onClick={() => openEdit(c)}><FiEdit2 style={{ verticalAlign: '-2px' }} /> Изменить</button>
                        <button className="adm-action-btn danger" onClick={() => setDeleteTarget(c)}><FiTrash2 style={{ verticalAlign: '-2px' }} /> Удалить</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setDeleteTarget(null)}>
          <div className="adm-modal" style={{ maxWidth: '380px' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div className="adm-confirm-icon"><FiTrash2 /></div>
              <p style={{ margin: '1rem 0' }}>Удалить категорию «{deleteTarget.name}»? Товары этой категории останутся, но без категории.</p>
              <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center' }}>
                <button className="adm-btn-primary" style={{ background: '#ef4444' }} onClick={() => remove(deleteTarget.id)}>Удалить</button>
                <button className="adm-btn-secondary" onClick={() => setDeleteTarget(null)}>Отмена</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── PromocodesPage ─── */
function PromocodesPage({ toast }) {
  const [promos, setPromos]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [discount, setDiscount] = useState('10');
  const [maxUses, setMaxUses]   = useState('1');
  const [sendTarget, setSendTarget] = useState(null); // промокод, который отправляем
  const [users, setUsers]           = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending]       = useState(false);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { const r = await fetch(`${ADMIN_API}/promocodes`, { headers: admHeaders() }); const d = await r.json(); if (d.success) setPromos(d.data); }
    catch { toast('Ошибка загрузки', 'err'); }
    setLoading(false);
  }

  // Создание: символы генерируются случайно на сервере,
  // скидку и количество использований задаём здесь
  async function create() {
    const dp = parseInt(discount), mu = parseInt(maxUses);
    if (!(dp >= 1 && dp <= 99)) { toast('Скидка от 1 до 99%', 'err'); return; }
    if (!(mu >= 1)) { toast('Минимум 1 использование', 'err'); return; }
    setCreating(true);
    try {
      const r = await fetch(`${ADMIN_API}/promocodes`, {
        method: 'POST',
        headers: admHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ discount_percent: dp, max_uses: mu }),
      });
      const d = await r.json();
      if (d.success) { toast(`Промокод ${d.data.code} создан!`); load(); }
      else toast(d.message || 'Ошибка', 'err');
    } catch { toast('Ошибка сети', 'err'); }
    setCreating(false);
  }

  // Добавить активаций к промокоду («пополнение лимита»)
  async function addUses(p) {
    const raw = window.prompt(`Промокод ${p.code}: использовано ${p.used_count} из ${p.max_uses}.\nСколько активаций добавить?`, '10');
    if (raw === null) return;
    const amount = parseInt(raw);
    if (!(amount >= 1)) { toast('Введите число от 1', 'err'); return; }
    try {
      const r = await fetch(`${ADMIN_API}/promocodes/${p.id}/add-uses`, {
        method: 'PUT',
        headers: admHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ amount }),
      });
      const d = await r.json();
      if (d.success) { toast(`Добавлено ${amount} активаций`); load(); }
      else toast(d.message || 'Ошибка', 'err');
    } catch { toast('Ошибка сети', 'err'); }
  }

  async function toggle(id) {
    try { await fetch(`${ADMIN_API}/promocodes/${id}/toggle`, { method: 'PUT', headers: admHeaders() }); load(); }
    catch { toast('Ошибка сети', 'err'); }
  }
  async function remove(id) {
    try { await fetch(`${ADMIN_API}/promocodes/${id}`, { method: 'DELETE', headers: admHeaders() }); toast('Промокод удалён'); load(); }
    catch { toast('Ошибка сети', 'err'); }
  }
  function copy(code) {
    navigator.clipboard?.writeText(code).then(() => toast(`${code} скопирован`)).catch(() => {});
  }

  // Открыть окно отправки: грузим пользователей и решаем, кому отправить
  async function openSend(promo) {
    setSendTarget(promo); setSelectedIds([]);
    try { const r = await fetch(`${ADMIN_API}/users`, { headers: admHeaders() }); const d = await r.json(); if (d.success) setUsers(d.data); }
    catch { toast('Ошибка загрузки пользователей', 'err'); }
  }
  function toggleUser(id) {
    setSelectedIds((p) => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  }
  async function sendPromo() {
    if (!selectedIds.length) { toast('Выберите пользователей', 'err'); return; }
    setSending(true);
    try {
      const r = await fetch(`${ADMIN_API}/promocodes/${sendTarget.id}/send`, {
        method: 'POST',
        headers: admHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userIds: selectedIds }),
      });
      const d = await r.json();
      if (d.success) { toast(`Отправлено: ${d.sent} из ${d.total}`); setSendTarget(null); }
      else toast(d.message || 'Ошибка', 'err');
    } catch { toast('Ошибка сети', 'err'); }
    setSending(false);
  }

  return (
    <>
      <div className="adm-page-title">Промо<em>коды</em></div>
      <div className="adm-page-sub">Код генерируется случайно. Скидку в % и количество использований выбираешь ты, затем решаешь, кому отправить</div>

      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title"><FiPlus style={{ verticalAlign: '-2px' }} /> Новый промокод</span></div>
        <div className="adm-form" style={{ flexDirection: 'row', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="adm-form-field" style={{ width: '160px' }}>
            <label className="adm-label">Скидка (%)</label>
            <input className="adm-form-input" type="number" min="1" max="99" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
          <div className="adm-form-field" style={{ width: '200px' }}>
            <label className="adm-label">Кол-во использований</label>
            <input className="adm-form-input" type="number" min="1" value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
          <button className="adm-btn-primary" onClick={create} disabled={creating}>
            {creating ? 'Создание...' : <><FiTag /> Сгенерировать код</>}
          </button>
        </div>
      </div>

      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title"><FiTag style={{ verticalAlign: '-2px' }} /> Все промокоды ({promos.length})</span></div>
        {loading ? <div className="adm-spinner" /> : !promos.length ? (
          <div className="adm-empty"><div className="adm-empty-icon"><FiTag /></div><p>Промокодов пока нет</p></div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead><tr><th>Код</th><th>Скидка</th><th>Использовано</th><th>Статус</th><th>Создан</th><th>Действия</th></tr></thead>
              <tbody>
                {promos.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '.12em', color: 'var(--rose)', fontSize: '.95rem' }}>{p.code}</span>
                      <button className="adm-action-btn" style={{ marginLeft: '.5rem', padding: '.2rem .5rem' }} onClick={() => copy(p.code)} title="Скопировать"><FiCopy /></button>
                    </td>
                    <td><span className="adm-badge adm-badge-green">−{p.discount_percent}%</span></td>
                    <td>{p.used_count} / {p.max_uses}</td>
                    <td>{p.active
                      ? (p.used_count >= p.max_uses
                          ? <span className="adm-badge adm-badge-gray">исчерпан</span>
                          : <span className="adm-badge adm-badge-green">активен</span>)
                      : <span className="adm-badge adm-badge-red">отключён</span>}</td>
                    <td style={{ fontSize: '.8rem', color: 'var(--ink-3)' }}>{new Date(p.created_at).toLocaleDateString('ru-RU')}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                        <button className="adm-action-btn promote" onClick={() => openSend(p)}><FiMail style={{ verticalAlign: '-2px' }} /> Отправить</button>
                        <button className="adm-action-btn promote" onClick={() => addUses(p)}>
                          <FiPlus style={{ verticalAlign: '-2px' }} /> Активации
                        </button>
                        <button className="adm-action-btn" onClick={() => toggle(p.id)}>
                          {p.active ? <><FiToggleRight style={{ verticalAlign: '-2px' }} /> Откл.</> : <><FiToggleLeft style={{ verticalAlign: '-2px' }} /> Вкл.</>}
                        </button>
                        <button className="adm-action-btn danger" onClick={() => remove(p.id)}><FiTrash2 style={{ verticalAlign: '-2px' }} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {sendTarget && (
        <div className="adm-modal-overlay" onClick={(e) => e.target === e.currentTarget && setSendTarget(null)}>
          <div className="adm-modal">
            <div className="adm-modal-header">
              <span className="adm-modal-title"><FiMail style={{ verticalAlign: '-2px' }} /> Отправить {sendTarget.code} (−{sendTarget.discount_percent}%)</span>
              <button className="adm-modal-close" onClick={() => setSendTarget(null)}><FiX /></button>
            </div>
            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                <span style={{ fontSize: '.82rem', color: 'var(--ink-3)' }}>Кому отправить промокод на почту:</span>
                <button className="adm-action-btn" onClick={() => setSelectedIds(selectedIds.length === users.length ? [] : users.map(u => u.id))}>
                  {selectedIds.length === users.length ? 'Снять всё' : 'Выбрать всех'}
                </button>
              </div>
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                {users.map(u => (
                  <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '.6rem', padding: '.5rem .75rem', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', background: selectedIds.includes(u.id) ? 'var(--rose-light)' : 'transparent' }}>
                    <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleUser(u.id)} />
                    <span style={{ fontWeight: 600, fontSize: '.86rem' }}>{u.name}</span>
                    <span style={{ fontSize: '.78rem', color: 'var(--ink-3)', marginLeft: 'auto' }}>{u.email}</span>
                  </label>
                ))}
              </div>
              <button className="adm-btn-primary" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }} onClick={sendPromo} disabled={sending}>
                {sending ? 'Отправка...' : <><FiSend /> Отправить выбранным ({selectedIds.length})</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ─── NewsletterPage — рассылка акций на почту всем зарегистрированным ─── */
function NewsletterPage({ toast }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [promoId, setPromoId] = useState('');
  const [promos, setPromos]   = useState([]);
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    fetch(`${ADMIN_API}/promocodes`, { headers: admHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setPromos(d.data.filter(p => p.active && p.used_count < p.max_uses)); })
      .catch(() => {});
  }, []);

  async function send() {
    if (!subject.trim() || !message.trim()) { toast('Заполните тему и текст', 'err'); return; }
    setSending(true); setResult(null);
    try {
      const r = await fetch(`${ADMIN_API}/newsletter`, {
        method: 'POST',
        headers: admHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ subject, message, promo_id: promoId || null }),
      });
      const d = await r.json();
      if (d.success) { setResult(d); toast(`Рассылка отправлена: ${d.sent} из ${d.total}`); setSubject(''); setMessage(''); setPromoId(''); }
      else toast(d.message || 'Ошибка', 'err');
    } catch { toast('Ошибка сети', 'err'); }
    setSending(false);
  }

  return (
    <>
      <div className="adm-page-title">Email-<em>рассылка</em></div>
      <div className="adm-page-sub">Отправка писем с акциями и промокодами на почту всех зарегистрированных пользователей</div>

      <div className="adm-card">
        <div className="adm-card-header"><span className="adm-card-title"><FiSend style={{ verticalAlign: '-2px' }} /> Новая рассылка</span></div>
        <div className="adm-form">
          <div className="adm-form-field">
            <label className="adm-label">Тема письма *</label>
            <input className="adm-form-input" placeholder="Скидки недели в Florista!" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="adm-form-field">
            <label className="adm-label">Текст письма *</label>
            <textarea className="adm-form-input" rows={6} placeholder="Расскажите об акции..." value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <div className="adm-form-field">
            <label className="adm-label">Прикрепить промокод (необязательно)</label>
            <select className="adm-form-input" value={promoId} onChange={(e) => setPromoId(e.target.value)}>
              <option value="">— без промокода —</option>
              {promos.map(p => (
                <option key={p.id} value={p.id}>{p.code} · −{p.discount_percent}% · осталось {p.max_uses - p.used_count}</option>
              ))}
            </select>
          </div>
          <div className="adm-form-actions">
            <button className="adm-btn-primary" onClick={send} disabled={sending}>
              {sending ? 'Отправка...' : <><FiMail /> Отправить всем</>}
            </button>
          </div>
          {result && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--green)', fontSize: '.88rem', fontWeight: 600 }}>
              <FiCheckCircle /> Доставлено {result.sent} из {result.total} писем
            </div>
          )}
          <div style={{ fontSize: '.78rem', color: 'var(--ink-3)', lineHeight: 1.5 }}>
            Письма уходят через Gmail, указанный в настройках сервера (GMAIL_USER / GMAIL_APP_PASSWORD).
            Если Gmail не настроен, письма выводятся в консоль сервера — удобно для локального теста.
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── ChatPage ─── */
function ChatPage() {
  return (
    <>
      <div className="adm-page-title">Чаты с <em>клиентами</em></div>
      <div className="adm-page-sub">Отвечай клиентам в реальном времени</div>
      <AdminChat />
    </>
  );
}

/* ─── AdminPanel (главный) ─── */
export default function AdminPanel() {
  const [isAdmin, setIsAdmin] = useState(() => !!sessionStorage.getItem(TOKEN_KEY));
  const [theme, setTheme]     = useState(() => localStorage.getItem(THEME_KEY) || 'light');
  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next); localStorage.setItem(THEME_KEY, next);
  }
  // Вход двумя способами: аккаунт с ролью admin ИЛИ специальный ключ-пароль
  const [loginTab, setLoginTab] = useState('account'); // account | key
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode]         = useState('');
  const [error, setError]       = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [page, setPage]         = useState('dashboard');
  const { toasts, toast }       = useToast();

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoggingIn(true);
    try {
      if (loginTab === 'key') {
        const res = await fetch(`${API}/auth/admin-key`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: code }),
        });
        const d = await res.json();
        if (d.success) { sessionStorage.setItem(TOKEN_KEY, d.token); setIsAdmin(true); }
        else setError(d.message || 'Неверный ключ доступа');
      } else {
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const d = await res.json();
        if (!d.success) setError(d.message || 'Ошибка входа');
        else if (d.data.role !== 'admin') setError('Доступ только для администраторов');
        else { sessionStorage.setItem(TOKEN_KEY, d.token); setIsAdmin(true); }
      }
    } catch { setError('Нет связи с сервером'); }
    setLoggingIn(false);
  }
  function logout() { sessionStorage.removeItem(TOKEN_KEY); setIsAdmin(false); setCode(''); setEmail(''); setPassword(''); }

  const nav = [
    { key: 'dashboard',  icon: <FiBarChart2 />,     label: 'Дашборд' },
    { key: 'stats',      icon: <FiTrendingUp />,    label: 'Статистика' },
    { key: 'products',   icon: <FiPackage />,       label: 'Товары' },
    { key: 'categories', icon: <FiGrid />,          label: 'Категории' },
    { key: 'reviews',    icon: <FiMessageSquare />, label: 'Отзывы' },
    { key: 'users',      icon: <FiUsers />,         label: 'Пользователи' },
    { key: 'promo',      icon: <FiTag />,           label: 'Промокоды' },
    { key: 'newsletter', icon: <FiSend />,          label: 'Рассылка' },
    { key: 'chat',       icon: <FiMessageCircle />, label: 'Чаты' },
  ];

  return (
    <div className="adm-root" data-theme={theme}>
      <style>{styles}</style>
      {!isAdmin && (
        <div className="adm-login">
          <div className="adm-login-box">
            <div className="adm-login-logo">Flori<em>sta</em></div>
            <div className="adm-login-sub">Admin Panel</div>
            <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1.25rem' }}>
              <button type="button" onClick={() => { setLoginTab('account'); setError(''); }}
                style={{ flex: 1, padding: '.55rem', borderRadius: '8px', border: '1.5px solid', borderColor: loginTab === 'account' ? 'var(--rose)' : 'var(--border)', background: loginTab === 'account' ? 'var(--rose-light)' : 'none', color: loginTab === 'account' ? 'var(--rose)' : 'var(--ink-3)', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.35rem' }}>
                <FiUser /> Аккаунт
              </button>
              <button type="button" onClick={() => { setLoginTab('key'); setError(''); }}
                style={{ flex: 1, padding: '.55rem', borderRadius: '8px', border: '1.5px solid', borderColor: loginTab === 'key' ? 'var(--rose)' : 'var(--border)', background: loginTab === 'key' ? 'var(--rose-light)' : 'none', color: loginTab === 'key' ? 'var(--rose)' : 'var(--ink-3)', fontWeight: 600, fontSize: '.8rem', cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.35rem' }}>
                <FiKey /> Ключ доступа
              </button>
            </div>
            <form onSubmit={handleLogin}>
              {error && <div className="adm-error">{error}</div>}
              {loginTab === 'account' ? (
                <>
                  <input className="adm-input" type="email" placeholder="Email администратора" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                  <input className="adm-input" type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} />
                </>
              ) : (
                <input className="adm-input" type="password" placeholder="Специальный ключ-пароль" value={code} onChange={(e) => setCode(e.target.value)} autoFocus />
              )}
              <button className="adm-btn" type="submit" disabled={loggingIn}>{loggingIn ? 'Вход...' : 'Войти →'}</button>
            </form>
          </div>
        </div>
      )}
      {isAdmin && (
        <div className="adm-layout">
          <aside className="adm-sidebar">
            <div className="adm-sidebar-logo">Flori<em>sta</em></div>
            <div className="adm-sidebar-label">Меню</div>
            {nav.map((n) => (
              <button key={n.key} className={`adm-nav-item${page === n.key ? ' active' : ''}`} onClick={() => setPage(n.key)}>
                <span className="adm-nav-icon">{n.icon}</span>{n.label}
              </button>
            ))}
            <div className="adm-sidebar-footer">
              <button className="adm-theme-btn" onClick={toggleTheme} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}>
                {theme === 'light' ? <><FiMoon /> Тёмная тема</> : <><FiSun /> Светлая тема</>}
              </button>
              <button className="adm-logout-btn" onClick={logout} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem' }}><FiLogOut /> Выйти</button>
            </div>
          </aside>
          <main className="adm-main">
            {page === 'dashboard' && <DashboardPage />}
            {page === 'stats'     && <StatsPage     toast={toast} />}
            {page === 'products'  && <ProductsPage  toast={toast} />}
            {page === 'categories' && <CategoriesPage toast={toast} />}
            {page === 'reviews'   && <ReviewsPage   toast={toast} />}
            {page === 'users'      && <UsersPage      toast={toast} />}
            {page === 'promo'      && <PromocodesPage toast={toast} />}
            {page === 'newsletter' && <NewsletterPage toast={toast} />}
            {page === 'chat'       && <ChatPage />}
          </main>
        </div>
      )}
      <div className="adm-toast-wrap">
        {toasts.map((t) => <div key={t.id} className={`adm-toast ${t.type}`}>{t.msg}</div>)}
      </div>
    </div>
  );
}
