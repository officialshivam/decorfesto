import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer style={{ background: '#090d16', color: '#94a3b8', padding: '64px 0 32px 0', borderTop: '1px solid #1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '48px', marginBottom: '48px' }}>
        
        {/* Brand Column */}
        <div style={{ maxWidth: '320px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', marginBottom: '16px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)', color: '#ffffff', display: 'grid', placeItems: 'center', fontWeight: '800', fontSize: '18px' }}>
              D
            </div>
            <strong style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff' }}>DecorFesto</strong>
          </Link>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#64748b', margin: 0 }}>
            Premium decoration services for birthdays, anniversaries, weddings, and meaningful celebrations across India.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Quick Links
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <li><Link to="/" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Home</Link></li>
            <li><Link to="/catalog" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Decorations Catalog</Link></li>
            <li><a href="/#how-it-works" style={{ color: '#cbd5e1', textDecoration: 'none' }}>How It Works</a></li>
            <li><a href="/#service-areas" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Service Areas</a></li>
          </ul>
        </div>

        {/* User Account */}
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Account & Support
          </h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '14px' }}>
            <li><Link to="/my-orders" style={{ color: '#cbd5e1', textDecoration: 'none' }}>My Orders</Link></li>
            <li><Link to="/profile" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Profile Settings</Link></li>
            <li><Link to="/login" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Customer Login</Link></li>
            <li><Link to="/vendor/login" style={{ color: '#cbd5e1', textDecoration: 'none' }}>Vendor Portal</Link></li>
          </ul>
        </div>

        {/* Contact Information */}
        <div>
          <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#ffffff', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Service Coverage
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1', margin: '0 0 12px 0' }}>
            Delhi NCR • Mumbai • Bengaluru • Hyderabad • Pune • Across India
          </p>
          <span style={{ fontSize: '13px', color: '#64748b', display: 'block' }}>
            Support: <a href="mailto:support@decorfesto.com" style={{ color: '#fb923c', textDecoration: 'none' }}>support@decorfesto.com</a>
          </span>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '32px', borderTop: '1px solid #1e293b', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748b' }}>
        <span>© {new Date().getFullYear()} DecorFesto. Crafted for beautiful celebrations.</span>
        <span>Designed for premium event experiences.</span>
      </div>
    </footer>
  );
}

export default Footer;
