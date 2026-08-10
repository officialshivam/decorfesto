import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminNavItems = [
  { label: 'Dashboard', to: '/admin' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Vendors', to: '/admin/vendors' },
  { label: 'Service Areas', to: '/admin/service-areas' },
  { label: 'Decorations', to: '/admin/decorations' },
  { label: 'Customizations', to: '/admin/customizations' },
];

function AdminNavbar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
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
