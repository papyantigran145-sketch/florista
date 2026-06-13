import { useState } from 'react';
import { FiEye, FiHeart, FiPlus, FiGift, FiStar } from 'react-icons/fi';
import { LuFlower, LuFlower2 } from 'react-icons/lu';
import { pName } from '../lib/i18n';

// React-иконки вместо эмодзи: подбираются по категории товара
const CATEGORY_ICONS = {
  1: <LuFlower2 />,  // Розы
  2: <LuFlower />,   // Полевые цветы
  3: <LuFlower2 />,  // Букеты
  4: <FiGift />,     // Подарки
  default: <LuFlower />,
};
const fmt = (n) => '֏' + Number(n).toLocaleString('en-US');

function Stars({ rating, count }) {
  return (
    <div className="product-rating">
      <div className="stars">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={`star${i < Math.round(rating || 0) ? '' : ' empty'}`}><FiStar style={{ fill: i < Math.round(rating || 0) ? 'currentColor' : 'none' }} /></span>
        ))}
      </div>
      {count !== undefined && <span className="rating-count">({count})</span>}
    </div>
  );
}

export default function ProductCard({ p, onAddToCart, onView, t, avgRating, reviewCount, lang }) {
  const [btnState, setBtnState] = useState('idle');

  async function handleAdd(e) {
    e.stopPropagation();
    if (p.stock === 0) return; // нет на складе — покупка недоступна
    if (btnState === 'loading') return;
    setBtnState('loading');
    const ok = await onAddToCart(p.id, 1);
    if (ok) {
      setBtnState('success');
      setTimeout(() => setBtnState('idle'), 1500);
    } else {
      setBtnState('idle');
    }
  }

  const hasDiscount = p.discount > 0;
  const outOfStock = p.stock === 0; // 0 = кончился; null = не отслеживается
  const imgSrc = p.image_url || null;
  const icon = CATEGORY_ICONS[p.category_id] || CATEGORY_ICONS.default;

  const addToCartText   = t?.addToCart   || 'Корзина';
  const addedToCartText = t?.addedToCart || '✓ Добавлено!';
  const viewText        = t?.viewProduct || 'Просмотр';
  const wishlistText    = t?.wishlist    || 'Избранное';

  return (
    <div className="product-card" onClick={() => onView(p.id)}>
      <div className="product-card-image">
        {imgSrc && (
          <img
            src={imgSrc}
            alt={pName(p, lang)}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              const fb = e.target.nextSibling;
              if (fb) fb.style.display = 'flex';
            }}
          />
        )}
        <div className="product-emoji" style={{ display: imgSrc ? 'none' : 'flex', color: 'var(--pink-400)' }}>{icon}</div>

        {outOfStock
          ? <div className="product-badge" style={{ background: '#6b7280' }}>Нет в наличии</div>
          : hasDiscount && <div className="product-badge">-{p.discount}%</div>}

        <div className="product-actions">
          <button className="action-btn" title={viewText} onClick={(e) => { e.stopPropagation(); onView(p.id); }}><FiEye /></button>
          <button className="action-btn" title={wishlistText} onClick={(e) => e.stopPropagation()}><FiHeart /></button>
        </div>
      </div>

      <div className="product-body">
        <Stars rating={avgRating || p.avg_rating || 0} count={reviewCount ?? p.review_count ?? 0} />
        <div className="product-name">{pName(p, lang)}</div>
        <div className="product-footer">
          <div className="price-group">
            {hasDiscount && p.old_price && <span className="price-old">{fmt(p.old_price)}</span>}
            <span className="price-new">{fmt(p.price)}</span>
          </div>
          <button
            className={`btn-add-to-cart${btnState === 'loading' ? ' loading' : ''}${btnState === 'success' ? ' success' : ''}`}
            onClick={handleAdd}
            disabled={outOfStock}
            style={outOfStock ? { opacity: .45, cursor: 'not-allowed' } : undefined}
          >
            {outOfStock ? 'Нет в наличии' : btnState === 'success' ? addedToCartText : <><FiPlus size={13} /> {addToCartText}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
