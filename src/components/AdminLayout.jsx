import { Outlet } from 'react-router-dom';
import AdminNavbar from './AdminNavbar';

function AdminLayout() {
  return (
    <div className="app-shell">
      <AdminNavbar />
      <Outlet />
    </div>
  );
}

export default AdminLayout;
