import { Link, NavLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Catalog', to: '/catalog' },
  { label: 'How It Works', to: '/catalog#how-it-works' },
];

function Navbar() {
  const { itemCount } = useCart();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="container navbar__inner">
        <Link to="/" className="brand" aria-label="DecorFesto home">
          <span className="brand__mark">D</span>
          <span>
            <strong>DecorFesto</strong>
            <small>Premium celebrations</small>
          </span>
        </Link>

        <nav className="navbar__links" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `navbar__link${isActive ? ' navbar__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="navbar__actions">
          <Link to="/cart" className="navbar__cart" aria-label="View cart">
            <span className="navbar__cart-icon" aria-hidden="true">🛒</span>
            <span>Cart ({itemCount})</span>
          </Link>
          {isAuthenticated ? (
            <>
              <Link to="/profile" className="button button--small button--ghost" aria-label="View your profile">
                {user?.fullName?.split(' ')[0] || 'Profile'}
              </Link>
              <Link to="/my-orders" className="button button--small button--ghost">My Orders</Link>
              <button type="button" className="button button--small navbar__cta" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="button button--small button--ghost">Login</Link>
              <Link to="/signup" className="button button--small navbar__cta">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
