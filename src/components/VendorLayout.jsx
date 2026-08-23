import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';

export default function VendorLayout() {
  const { vendorUser, logoutVendor } = useVendorAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logoutVendor();
    navigate('/vendor/login');
  };

  return (
    <div className="app-shell vendor-app-shell" style={{ background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* VENDOR PORTAL NAVBAR */}
      <header
        style={{
          background: '#0f172a',
          color: '#ffffff',
          padding: '0 24px',
          height: '70px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '3px solid #e11d48',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/vendor/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em' }}>DecorFesto</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', background: '#e11d48', color: '#fff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vendor Portal
            </span>
          </Link>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NavLink
            to="/vendor/dashboard"
            end
            style={({ isActive }) => ({
              color: isActive ? '#ffffff' : '#94a3b8',
              background: isActive ? '#1e293b' : 'transparent',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            })}
          >
            📊 Dashboard
          </NavLink>

          <NavLink
            to="/vendor/orders"
            style={({ isActive }) => ({
              color: isActive ? '#ffffff' : '#94a3b8',
              background: isActive ? '#1e293b' : 'transparent',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            })}
          >
            📦 My Orders
          </NavLink>

          <NavLink
            to="/vendor/profile"
            style={({ isActive }) => ({
              color: isActive ? '#ffffff' : '#94a3b8',
              background: isActive ? '#1e293b' : 'transparent',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '0.9rem',
              transition: 'all 0.2s',
            })}
          >
            👤 Profile
          </NavLink>

          <div style={{ width: '1px', height: '24px', background: '#334155', margin: '0 4px' }} />

          {vendorUser && (
            <span style={{ fontSize: '0.85rem', color: '#e2e8f0', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
              {vendorUser.name || 'Vendor'}
            </span>
          )}

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: 'rgba(225, 29, 72, 0.15)',
              color: '#fda4af',
              border: '1px solid rgba(225, 29, 72, 0.3)',
              padding: '6px 14px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem',
              cursor: 'pointer',
              marginLeft: '8px',
              transition: 'all 0.2s',
            }}
          >
            Logout 🚪
          </button>
        </nav>
      </header>

      {/* VENDOR MAIN CONTENT */}
      <main style={{ flex: 1, padding: '24px', maxWidth: '1280px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        <Outlet />
      </main>

      {/* VENDOR FOOTER */}
      <footer style={{ background: '#0f172a', color: '#64748b', textAlign: 'center', padding: '16px', fontSize: '0.82rem', borderTop: '1px solid #1e293b' }}>
        DecorFesto Partner Portal &copy; {new Date().getFullYear()} — Secure Business Operations & Event Setup Management
      </footer>
    </div>
  );
}
