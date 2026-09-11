import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../context/BrandingContext';

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
        background: scrolled ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 252, 249, 0.88)',
        backdropFilter: 'blur(16px)',
        borderBottom: scrolled ? '1px solid rgba(241, 245, 249, 0.9)' : '1px solid rgba(234, 88, 12, 0.08)',
        boxShadow: scrolled ? '0 10px 30px -10px rgba(15, 23, 42, 0.08)' : 'none',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: scrolled ? '10px 20px' : '14px 20px', transition: 'padding 0.3s ease' }}>
        
        {/* Brand */}
        <Link to="/" onClick={closeMobileMenu} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <BrandLogo height={42} alt="DecorFesto" />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <NavLink to="/" end style={({ isActive }) => ({ textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '700' : '600', color: isActive ? '#ea580c' : '#334155' })}>
            Home
          </NavLink>
          <NavLink to="/catalog" style={({ isActive }) => ({ textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '700' : '600', color: isActive ? '#ea580c' : '#334155' })}>
            Decorations
          </NavLink>
          <a href="/#how-it-works" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
            How It Works
          </a>
          <a href="/#service-areas" style={{ textDecoration: 'none', fontSize: '14px', fontWeight: '600', color: '#334155' }}>
            Service Areas
          </a>
          {isAuthenticated && (
            <NavLink to="/my-orders" style={({ isActive }) => ({ textDecoration: 'none', fontSize: '14px', fontWeight: isActive ? '700' : '600', color: isActive ? '#ea580c' : '#334155' })}>
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
              padding: '8px 16px',
              borderRadius: '999px',
              background: '#fff4ed',
              border: '1px solid rgba(234, 88, 12, 0.2)',
              color: '#c2410c',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(194, 65, 12, 0.06)',
            }}
          >
            <span>🛒</span>
            <span>Cart</span>
            {itemCount > 0 && (
              <span style={{ background: '#ea580c', color: '#ffffff', borderRadius: '50%', padding: '2px 7px', fontSize: '11px', fontWeight: '800' }}>
                {itemCount}
              </span>
            )}
          </Link>

          {/* Desktop Auth Controls */}
          <div className="desktop-auth" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isAuthenticated ? (
              <>
                <Link to="/profile" style={{ fontSize: '14px', fontWeight: '600', color: '#0f172a', textDecoration: 'none', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '12px' }}>
                  👤 {user?.fullName?.split(' ')[0] || 'Profile'}
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  style={{
                    background: 'none',
                    border: '1px solid #e2e8f0',
                    padding: '8px 16px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: '#64748b',
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
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                    color: '#ffffff',
                    padding: '9px 20px',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
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
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open navigation menu'}
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
          <NavLink to="/" onClick={closeMobileMenu} style={({ isActive }) => ({ fontSize: '15px', fontWeight: isActive ? '700' : '600', color: isActive ? '#ea580c' : '#0f172a', textDecoration: 'none' })}>
            Home
          </NavLink>
          <NavLink to="/catalog" onClick={closeMobileMenu} style={({ isActive }) => ({ fontSize: '15px', fontWeight: isActive ? '700' : '600', color: isActive ? '#ea580c' : '#0f172a', textDecoration: 'none' })}>
            Decorations
          </NavLink>
          <a href="/#how-it-works" onClick={closeMobileMenu} style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', textDecoration: 'none' }}>
            How It Works
          </a>
          <a href="/#service-areas" onClick={closeMobileMenu} style={{ fontSize: '15px', fontWeight: '600', color: '#0f172a', textDecoration: 'none' }}>
            Service Areas
          </a>
          {isAuthenticated && (
            <NavLink to="/my-orders" onClick={closeMobileMenu} style={({ isActive }) => ({ fontSize: '15px', fontWeight: isActive ? '700' : '600', color: isActive ? '#ea580c' : '#0f172a', textDecoration: 'none' })}>
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
