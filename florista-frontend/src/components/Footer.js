import { FiInstagram, FiFacebook, FiTwitter, FiYoutube, FiLock } from 'react-icons/fi';
import { cName } from '../lib/i18n';

export default function Footer({ categories = [], lang = 'ru' }) {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="logo">Flori<em>sta</em></div>
          <p>Цветы, которые говорят. Премиальные букеты, доставка с душой.</p>
          <div className="social-links" style={{ marginTop: '1.2rem' }}>
            <a href="#" className="social-link" aria-label="Instagram"><FiInstagram /></a>
            <a href="#" className="social-link" aria-label="Facebook"><FiFacebook /></a>
            <a href="#" className="social-link" aria-label="Twitter"><FiTwitter /></a>
            <a href="#" className="social-link" aria-label="YouTube"><FiYoutube /></a>
          </div>
        </div>

        <div className="footer-col">
          <h4>Магазин</h4>
          {categories.map((cat) => (
            <a key={cat.id} href="#">{cName(cat, lang)}</a>
          ))}
        </div>

        <div className="footer-col">
          <h4>Информация</h4>
          <a href="#about">О нас</a>
          <a href="#contact">Контакты</a>
          <a href="#">FAQ</a>
          <a href="#">Доставка</a>
        </div>

        <div className="footer-col">
          <h4>Часы работы</h4>
          <p>Ежедневно 09:00 – 22:00</p>
          <p style={{ marginTop: '.5rem' }}>+374 10 XXX XXX</p>
          <p>hello@florista.am</p>
          <p style={{ marginTop: '.5rem' }}>Ереван, Армения</p>
        </div>
      </div>

      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 2rem' }}>
        <div className="footer-bottom">
          <span>© 2024 Florista. Все права защищены.</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}><FiLock /> Secured payments · SSL Encrypted</span>
        </div>
      </div>
    </footer>
  );
}
