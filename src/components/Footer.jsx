import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <h3>DecorFesto</h3>
          <p>
            Premium decoration services for birthdays, anniversaries, weddings,
            and meaningful celebrations across India.
          </p>
        </div>

        <div>
          <h4>Explore</h4>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/catalog">Catalog</Link></li>
            <li><Link to="/catalog">Customizations</Link></li>
          </ul>
        </div>

        <div>
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:hello@decorfesto.com">hello@decorfesto.com</a></li>
            <li><a href="tel:+918000000000">+91 80000 00000</a></li>
            <li>Delhi NCR • Mumbai • Bengaluru • Across India</li>
          </ul>
        </div>
      </div>
      <div className="container footer__bottom">
        <span>© 2026 DecorFesto. Crafted for beautiful celebrations.</span>
        <span>Designed for premium event experiences.</span>
      </div>
    </footer>
  );
}

export default Footer;
