import { useState } from 'react';
import {
  createAdminUser,
  getAllUsersForAdmin,
  resetUserPassword,
  toggleUserStatus,
  verifyAdminReauthPassword,
} from '../services/mockAuth';

function AdminUsers() {
  const [isVerified, setIsVerified] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');
  const [reauthError, setReauthError] = useState('');

  const [users, setUsers] = useState(() => getAllUsersForAdmin());

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ fullName: '', email: '', mobile: '', password: '', role: 'Admin' });
  const [addError, setAddError] = useState('');

  const [resetModalUserId, setResetModalUserId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const refreshUsers = () => {
    setUsers(getAllUsersForAdmin());
  };

  const handleVerify = (e) => {
    e.preventDefault();
    setReauthError('');
    if (!reauthPassword) {
      setReauthError('Please enter your admin password.');
      return;
    }
    if (verifyAdminReauthPassword(reauthPassword)) {
      setIsVerified(true);
      setReauthError('');
    } else {
      setReauthError('Invalid admin password. Default demo password is password123.');
    }
  };

  const handleToggleStatus = (userId) => {
    toggleUserStatus(userId);
    refreshUsers();
    setSuccessMsg('User status updated successfully.');
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.fullName || !addForm.email || !addForm.password) {
      setAddError('Full name, email, and initial password are required.');
      return;
    }
    const res = createAdminUser(addForm);
    if (!res.ok) {
      setAddError(res.error || 'Failed to create user.');
      return;
    }
    setShowAddModal(false);
    setAddForm({ fullName: '', email: '', mobile: '', password: '', role: 'Admin' });
    refreshUsers();
    setSuccessMsg('New admin user created successfully.');
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    setResetError('');
    if (!newPassword || newPassword.length < 4) {
      setResetError('Password must be at least 4 characters.');
      return;
    }
    resetUserPassword(resetModalUserId, newPassword);
    setResetModalUserId(null);
    setNewPassword('');
    refreshUsers();
    setSuccessMsg('User password updated successfully. Password remains hidden.');
  };

  if (!isVerified) {
    return (
      <main className="page">
        <section className="container section section--tight" style={{ maxWidth: '460px', margin: '0 auto' }}>
          <div className="card-panel" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <span className="eyebrow">Security Check</span>
            <h1 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Admin Re-Authentication</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.92rem' }}>
              Please enter your admin password to unlock user management.
            </p>

            <form onSubmit={handleVerify} noValidate>
              <label className="search-field" style={{ textAlign: 'left', marginBottom: '16px' }}>
                <span>Admin Password *</span>
                <input
                  type="password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                  placeholder="Enter password (e.g. password123 or admin123)"
                  required
                />
              </label>

              {reauthError && (
                <div className="admin-error-banner" style={{ marginBottom: '16px', padding: '10px' }}>
                  ✕ {reauthError}
                </div>
              )}

              <button type="submit" className="button button--full">
                Verify & Unlock Users
              </button>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <span className="eyebrow">Admin Panel</span>
            <h1>User Management</h1>
            <p>Manage system users, roles, account statuses, and credentials securely.</p>
          </div>
          <button type="button" className="button" onClick={() => setShowAddModal(true)}>
            + Create Admin User
          </button>
        </div>

        {successMsg && (
          <div className="admin-success-banner" style={{ marginBottom: '16px', padding: '12px 16px' }}>
            ✓ {successMsg}
          </div>
        )}

        <div className="card-panel admin-orders__table-wrap">
          <table className="admin-orders__table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email / Mobile</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.id}</strong></td>
                  <td>{u.fullName}</td>
                  <td>
                    {u.email}
                    {u.mobile ? <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{u.mobile}</div> : null}
                  </td>
                  <td>
                    <span className={`status-pill ${u.role === 'Admin' ? 'status-pill--active' : ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td>
                    <span className={`dash-pill dash-pill--${u.status === 'Active' ? 'success' : 'danger'}`}>
                      {u.status}
                    </span>
                  </td>
                  <td>{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="button button--small button--ghost"
                        onClick={() => handleToggleStatus(u.id)}
                      >
                        {u.status === 'Active' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        className="button button--small button--ghost"
                        onClick={() => { setResetModalUserId(u.id); setNewPassword(''); setResetError(''); }}
                      >
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Create Modal */}
        {showAddModal && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '440px' }}>
              <h2>Create Admin User</h2>
              <form onSubmit={handleAddSubmit} style={{ marginTop: '16px' }}>
                <label className="search-field">
                  <span>Full Name *</span>
                  <input
                    type="text"
                    value={addForm.fullName}
                    onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                    required
                  />
                </label>
                <label className="search-field" style={{ marginTop: '12px' }}>
                  <span>Email Address *</span>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    required
                  />
                </label>
                <label className="search-field" style={{ marginTop: '12px' }}>
                  <span>Mobile Number</span>
                  <input
                    type="text"
                    value={addForm.mobile}
                    onChange={(e) => setAddForm({ ...addForm, mobile: e.target.value })}
                  />
                </label>
                <label className="search-field" style={{ marginTop: '12px' }}>
                  <span>Initial Password *</span>
                  <input
                    type="password"
                    value={addForm.password}
                    onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                    required
                  />
                </label>
                <label className="search-field" style={{ marginTop: '12px' }}>
                  <span>Role *</span>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Customer">Customer</option>
                  </select>
                </label>

                {addError && <div className="admin-error-banner" style={{ marginTop: '12px' }}>✕ {addError}</div>}

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button type="submit" className="button">Create User</button>
                  <button type="button" className="button button--ghost" onClick={() => setShowAddModal(false)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Reset Password Modal */}
        {resetModalUserId && (
          <div className="modal-backdrop">
            <div className="modal-card" style={{ maxWidth: '400px' }}>
              <h2>Reset User Password</h2>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Set a new password for User ID: {resetModalUserId}. Existing passwords remain hidden.
              </p>
              <form onSubmit={handleResetSubmit} style={{ marginTop: '16px' }}>
                <label className="search-field">
                  <span>New Password *</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </label>

                {resetError && <div className="admin-error-banner" style={{ marginTop: '12px' }}>✕ {resetError}</div>}

                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button type="submit" className="button">Save New Password</button>
                  <button type="button" className="button button--ghost" onClick={() => setResetModalUserId(null)}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminUsers;
