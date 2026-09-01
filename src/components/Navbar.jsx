import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { itemCount } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: scrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(250, 248, 245, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid #e2e8f0' : '1px solid rgba(226, 232, 240, 0.6)',
        boxShadow: scrolled ? '0 4px 20px rgba(0, 0, 0, 0.05)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: scrolled ? '12px 16px' : '18px 16px', transition: 'padding 0.3s ease' }}>
        
        {/* Brand */}
        <Link to="/" onClick={closeMobileMenu} style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: '800',
              fontSize: '20px',
              boxShadow: '0 4px 10px rgba(194, 65, 12, 0.3)',
            }}
          >
            D
          </div>
          <div>
            <strong style={{ display: 'block', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.1' }}>
              DecorFesto
            </strong>
            <small style={{ fontSize: '11px', color: '#64748b', fontWeight: '500' }}>
              Premium Celebrations
            </small>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <NavLink to="/" end style={({ isActive }) => ({ textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '700' : '500', color: isActive ? '#c2410c' : '#334155' })}>
            Home
          </NavLink>
          <NavLink to="/catalog" style={({ isActive }) => ({ textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '700' : '500', color: isActive ? '#c2410c' : '#334155' })}>
            Decorations
          </NavLink>
          <a href="/#how-it-works" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            How It Works
          </a>
          <a href="/#service-areas" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: '500', color: '#334155' }}>
            Service Areas
          </a>
          {isAuthenticated && (
            <NavLink to="/my-orders" style={({ isActive }) => ({ textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '700' : '500', color: isActive ? '#c2410c' : '#334155' })}>
              My Orders
            </NavLink>
          )}
        </nav>

        {/* Actions (Cart & Auth) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/cart"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '20px',
              background: '#fff7ed',
              border: '1px solid #ffedd5',
              color: '#c2410c',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <span>🛒</span>
            <span>Cart</span>
            {itemCount > 0 && (
              <span style={{ background: '#c2410c', color: '#ffffff', borderRadius: '50%', padding: '2px 7px', fontSize: '11px', fontWeight: '800' }}>
                {itemCount}
              </span>
            )}
          </Link>

          {/* Desktop Auth Controls */}
          <div className="desktop-auth" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isAuthenticated ? (
              <>
                <Link to="/profile" style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', textDecoration: 'none', background: '#f1f5f9', padding: '8px 14px', borderRadius: '10px' }}>
                  👤 {user?.fullName?.split(' ')[0] || 'Profile'}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    background: 'none',
                    border: '1px solid #cbd5e1',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" style={{ fontSize: '14px', fontWeight: '600', color: '#334155', textDecoration: 'none', padding: '8px 14px' }}>
                  Login
                </Link>
                <Link
                  to="/signup"
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '8px 18px',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: '#0f172a',
              padding: '6px',
              display: 'none',
            }}
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
          }}
        >
          <NavLink to="/" onClick={closeMobileMenu} style={({ isActive }) => ({ fontSize: '15px', fontWeight: isActive ? '700' : '600', color: isActive ? '#c2410c' : '#0f172a', textDecoration: 'none' })}>
            Home
          </NavLink>
          <NavLink to="/catalog" onClick={closeMobileMenu} style={({ isActive }) => ({ fontSize: '15px', fontWeight: isActive ? '700' : '600', color: isActive ? '#c2410c' : '#0f172a', textDecoration: 'none' })}>
            Decorations
          </NavLink>
          <a href="/#how-it-works" onClick={closeMobileMenu} style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', textDecoration: 'none' }}>
            How It Works
          </a>
          <a href="/#service-areas" onClick={closeMobileMenu} style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', textDecoration: 'none' }}>
            Service Areas
          </a>
          {isAuthenticated && (
            <NavLink to="/my-orders" onClick={closeMobileMenu} style={({ isActive }) => ({ fontSize: '15px', fontWeight: isActive ? '700' : '600', color: isActive ? '#c2410c' : '#0f172a', textDecoration: 'none' })}>
              My Orders
            </NavLink>
          )}

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {isAuthenticated ? (
              <>
                <Link to="/profile" onClick={closeMobileMenu} style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>👤</span>
                  <span>Profile ({user?.fullName?.split(' ')[0] || 'Account'})</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    logout();
                  }}
                  style={{
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '15px',
                    fontWeight: '600',
                    color: '#e11d48',
                    cursor: 'pointer',
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#334155',
                    textDecoration: 'none',
                  }}
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={closeMobileMenu}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: '#0f172a',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#ffffff',
                    textDecoration: 'none',
                  }}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
