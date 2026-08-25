import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Confirmation from './pages/Confirmation';
import AIAssistant from './pages/AIAssistant';
import NIFTConsultation from './pages/NIFTConsultation';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Profile from './pages/Profile';
import MyOrders from './pages/MyOrders';
import MyOrderDetail from './pages/MyOrderDetail';
import AdminOrders from './pages/AdminOrders';
import AdminOrderDetails from './pages/AdminOrderDetails';
import AdminVendors from './pages/AdminVendors';
import AdminVendorDetails from './pages/AdminVendorDetails';
import AdminServiceAreas from './pages/AdminServiceAreas';
import AdminDecorations from './pages/AdminDecorations';
import AdminCategories from './pages/AdminCategories';
import AdminCustomizations from './pages/AdminCustomizations';
import AdminUsers from './pages/AdminUsers';
import AdminDashboard from './pages/AdminDashboard';
import AdminLayout from './components/AdminLayout';

// ADMIN PORTAL IMPORTS
import AdminLogin from './pages/AdminLogin';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';

// VENDOR PORTAL IMPORTS
import VendorLayout from './components/VendorLayout';
import VendorLogin from './pages/VendorLogin';
import VendorDashboard from './pages/VendorDashboard';
import VendorOrders from './pages/VendorOrders';
import VendorOrderDetails from './pages/VendorOrderDetails';
import VendorProfile from './pages/VendorProfile';
import { VendorAuthProvider, useVendorAuth } from './context/VendorAuthContext';

import { CartProvider } from './context/CartContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function RequireVendorAuth({ children }) {
  const { isVendorAuthenticated } = useVendorAuth();
  const location = useLocation();

  if (!isVendorAuthenticated) {
    return <Navigate to="/vendor/login" replace state={{ from: location }} />;
  }

  return children;
}

function RequireAdminAuth({ children }) {
  const { isAdminAuthenticated, loadingSession } = useAdminAuth();
  const location = useLocation();

  if (loadingSession) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', color: '#64748b' }}>
        <p>Verifying admin session...</p>
      </div>
    );
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  return children;
}

function CustomerLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <Outlet />
      <Footer />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <VendorAuthProvider>
        <AdminAuthProvider>
          <CartProvider>
            <Router>
              <Routes>
                {/* VENDOR PORTAL ROUTES */}
                <Route path="/vendor/login" element={<VendorLogin />} />
                <Route
                  path="/vendor"
                  element={
                    <RequireVendorAuth>
                      <VendorLayout />
                    </RequireVendorAuth>
                  }
                >
                  <Route index element={<Navigate to="/vendor/dashboard" replace />} />
                  <Route path="dashboard" element={<VendorDashboard />} />
                  <Route path="orders" element={<VendorOrders />} />
                  <Route path="orders/:orderId" element={<VendorOrderDetails />} />
                  <Route path="profile" element={<VendorProfile />} />
                  <Route path="*" element={<Navigate to="/vendor/dashboard" replace />} />
                </Route>

                {/* ADMIN ROUTES */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route
                  path="/admin"
                  element={
                    <RequireAdminAuth>
                      <AdminLayout />
                    </RequireAdminAuth>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/:id" element={<AdminOrderDetails />} />
                  <Route path="vendors" element={<AdminVendors />} />
                  <Route path="vendors/:vendorId" element={<AdminVendorDetails />} />
                  <Route path="service-areas" element={<AdminServiceAreas />} />
                  <Route path="decorations" element={<AdminDecorations />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="customizations" element={<AdminCustomizations />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="*" element={<Navigate to="/admin" replace />} />
                </Route>

              {/* CUSTOMER ROUTES */}
              <Route path="/" element={<CustomerLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/product/:id" element={<ErrorBoundary><ProductDetail /></ErrorBoundary>} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
                <Route path="/confirmation" element={<RequireAuth><Confirmation /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/my-orders" element={<RequireAuth><MyOrders /></RequireAuth>} />
                <Route path="/my-orders/:id" element={<RequireAuth><MyOrderDetail /></RequireAuth>} />
                <Route path="/ai-assistant" element={<AIAssistant />} />
                <Route path="/consultation" element={<NIFTConsultation />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Router>
        </CartProvider>
      </AdminAuthProvider>
    </VendorAuthProvider>
    </AuthProvider>
  );
}

export default App;
