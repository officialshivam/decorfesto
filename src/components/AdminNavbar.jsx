import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const adminNavItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Vendors', to: '/admin/vendors' },
  { label: 'Service Areas', to: '/admin/service-areas' },
  { label: 'Decorations', to: '/admin/decorations' },
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
        <NavLink to="/admin" end className="brand" aria-label="DecorFesto admin dashboard">
          <span className="brand__mark">D</span>
          <span>
            <strong>DecorFesto</strong>
            <small>Admin</small>
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
