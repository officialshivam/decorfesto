import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { BrandLogo } from '../context/BrandingContext';

const adminNavItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Vendors', to: '/admin/vendors' },
  { label: 'Service Areas', to: '/admin/service-areas' },
  { label: 'Decorations', to: '/admin/decorations' },
  { label: 'Categories', to: '/admin/categories' },
  { label: 'Coupons', to: '/admin/coupons' },
  { label: 'Customizations', to: '/admin/customizations' },
  { label: 'Users', to: '/admin/users' },
];

function AdminNavbar() {
  const navigate = useNavigate();
  const { logoutAdmin } = useAdminAuth();

  const handleLogout = async () => {
    await logoutAdmin();
    navigate('/admin/login', { replace: true });
  };

  return (
    <header className="navbar admin-navbar">
      <div className="container navbar__inner">
        <NavLink to="/admin" end aria-label="DecorFesto admin dashboard" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <BrandLogo height={34} alt="DecorFesto Admin" style={{ background: '#ffffff', padding: '3px 6px', borderRadius: '6px' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#0f172a', color: '#ffffff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Admin
          </span>
        </NavLink>

        <nav className="navbar__links" aria-label="Admin navigation">
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => `navbar__link${isActive ? ' navbar__link--active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          <button type="button" className="button button--small navbar__cta" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}

export default AdminNavbar;
