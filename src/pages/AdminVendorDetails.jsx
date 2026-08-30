import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  PRESET_SPECIALTIES,
} from '../services/mockVendors';
import { getVendorByIdApi, updateVendorApi } from '../services/vendorAuthService';
import { getOrdersApi } from '../services/orderService';

function AdminVendorDetails() {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [orderFilter, setOrderFilter] = useState('ALL');
  const [activeModal, setActiveModal] = useState(null); // 'edit' | 'resetPassword' | 'statusReason'

  const [editForm, setEditForm] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [statusTarget, setStatusTarget] = useState({ newStatus: '', reason: '' });
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vData, oData] = await Promise.all([
        getVendorByIdApi(vendorId),
        getOrdersApi(),
      ]);
      setVendor(vData);
      setAllOrders(oData || []);
    } catch (err) {
      console.error('Failed to load vendor details from API', err);
      setError('Failed to load vendor details from the backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [vendorId]);

  if (loading) {
    return (
      <main className="page">
        <section className="container section">
          <div className="card-panel text-center">
            <p>Loading vendor details from production backend...</p>
          </div>
        </section>
      </main>
    );
  }

  if (error || !vendor) {
    return (
      <main className="page">
        <section className="container section">
          <div className="card-panel text-center">
            <h1>{error ? 'API Error' : 'Vendor Not Found'}</h1>
            <p>{error || `The vendor partner ID "${vendorId}" could not be located in the production database.`}</p>
            <Link to="/admin/vendors" className="button button--small mt-3">Back to Vendor Control Center</Link>
          </div>
        </section>
      </main>
    );
  }

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const refreshData = () => {
    loadData();
  };

  const assignedOrders = allOrders.filter((o) => o.vendorId === vendor.id);
  const workload = {
    activeOrderCount: assignedOrders.filter((o) => o.bookingStatus !== 'COMPLETED' && o.bookingStatus !== 'CANCELLED').length,
    statusLabel: assignedOrders.length > 5 ? 'Heavy' : assignedOrders.length > 0 ? 'Moderate' : 'Available',
  };

  // Filtered orders
  const filteredOrders = assignedOrders.filter((o) => {
    if (orderFilter === 'ALL') return true;
    return o.bookingStatus === orderFilter;
  });

  // Financial metrics
  const totalBookingValue = assignedOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const completedBookingValue = assignedOrders
    .filter((o) => o.bookingStatus === 'COMPLETED')
    .reduce((sum, o) => sum + (o.total || 0), 0);

function normalizeServicePincodesInput(raw) {
  if (!raw) return '';
  if (Array.isArray(raw)) return raw.join(', ');
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch {
        // fallback
      }
    }
    return trimmed;
  }
  return '';
}

function parseServicePincodesOutput(input) {
  if (Array.isArray(input)) {
    return [...new Set(input.map((s) => String(s).trim()).filter(Boolean))];
  }
  if (typeof input === 'string') {
    let items = input;
    const trimmed = input.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        // fallback
      }
    }
    if (Array.isArray(items)) {
      return [...new Set(items.map((s) => String(s).trim()).filter(Boolean))];
    }
    return [...new Set(input.split(',').map((s) => s.trim()).filter(Boolean))];
  }
  return [];
}

  // Handlers for Modals
  const openEditModal = () => {
    setEditForm({
      ...vendor,
      servicePincodes: normalizeServicePincodesInput(vendor.servicePincodes),
      specialties: Array.isArray(vendor.specialties) ? vendor.specialties : [],
    });
    setFormError('');
    setActiveModal('edit');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      const updated = await updateVendorApi(vendor.id, {
        ...editForm,
        servicePincodes: parseServicePincodesOutput(editForm.servicePincodes),
      });

      if (updated) {
        setVendor(updated);
        refreshData();
        setActiveModal(null);
        showToast(`Vendor details updated for ${updated.name}`);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to update vendor via API');
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setFormError('');
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    resetVendorPassword(vendor.id, passwordForm.newPassword, 'ADMIN');
    refreshData();
    setActiveModal(null);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    showToast('Password reset successfully. Vendor sessions invalidated.');
  };

  const handleStatusChange = (newStatus) => {
    setStatusTarget({ newStatus, reason: '' });
    setActiveModal('statusReason');
  };

  const confirmStatusChange = (e) => {
    e.preventDefault();
    updateVendorStatus(vendor.id, statusTarget.newStatus, statusTarget.reason);
    refreshData();
    setActiveModal(null);
    showToast(`Vendor account status changed to ${statusTarget.newStatus.toUpperCase()}`);
  };

  const handleForceLogout = () => {
    forceLogoutVendor(vendor.id, 'ADMIN');
    refreshData();
    showToast('All active sessions for this vendor have been forcibly logged out.');
  };

  const handleDeleteOrArchive = () => {
    const hasHistory = assignedOrders.length > 0;
    const confirmMsg = hasHistory
      ? `Vendor ${vendor.name} has ${assignedOrders.length} assigned orders. Are you sure you want to ARCHIVE this vendor? Order history will be preserved.`
      : `Are you sure you want to PERMANENTLY DELETE vendor ${vendor.name}? This action cannot be undone.`;

    if (window.confirm(confirmMsg)) {
      const result = deleteOrArchiveVendor(vendor.id, hasHistory);
      showToast(result.message);
      if (result.mode === 'deleted') {
        navigate('/admin/vendors');
      } else {
        refreshData();
      }
    }
  };

  const toggleSpecialty = (spec) => {
    setEditForm((prev) => {
      const current = prev.specialties || [];
      const next = current.includes(spec)
        ? current.filter((s) => s !== spec)
        : [...current, spec];
      return { ...prev, specialties: next };
    });
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        {toastMessage && (
          <div className="alert alert--success mb-4">
            ✓ {toastMessage}
          </div>
        )}

        {/* Back Link & Header */}
        <div className="mb-4">
          <Link to="/admin/vendors" className="button button--small button--ghost">← Back to Vendor Control Center</Link>
        </div>

        <div className="card-panel mb-4">
          <div className="d-flex justify-between align-center wrap gap-3">
            <div>
              <div className="d-flex align-center gap-2 mb-1">
                <span className="eyebrow mb-0">{vendor.id}</span>
                <span className={`status-pill status-pill--${vendor.status}`}>{vendor.status.toUpperCase()}</span>
                <span className={`workload-pill ${workload.badgeClass}`}>Workload: {workload.level}</span>
              </div>
              <h1 className="h2 mb-1">{vendor.name}</h1>
              <p className="subtext mb-0">Contact: <strong>{vendor.contactName || 'N/A'}</strong> | {vendor.phone} | {vendor.email}</p>
            </div>

            <div className="d-flex wrap gap-2">
              <button type="button" className="button button--small" onClick={openEditModal}>✎ Edit Profile</button>
              <button type="button" className="button button--small button--ghost" onClick={() => setActiveModal('resetPassword')}>🔑 Reset Password</button>
              <button type="button" className="button button--small button--ghost" onClick={handleForceLogout}>🔒 Force Logout</button>
              {vendor.status === 'active' ? (
                <button type="button" className="button button--small button--ghost style-danger" onClick={() => handleStatusChange('suspended')}>Suspend Vendor</button>
              ) : (
                <button type="button" className="button button--small" onClick={() => handleStatusChange('active')}>Activate Vendor</button>
              )}
              <button type="button" className="button button--small button--ghost" onClick={handleDeleteOrArchive}>Archive / Delete</button>
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid--3 mb-4">
          <div className="metric-card">
            <span className="metric-card__title">Total Assigned Orders</span>
            <span className="metric-card__value">{workload.totalCount}</span>
            <span className="metric-card__subtext">Active: {workload.activeCount} | Completed: {workload.completedCount}</span>
          </div>

          <div className="metric-card">
            <span className="metric-card__title">Total Booking Value</span>
            <span className="metric-card__value">₹{totalBookingValue.toLocaleString('en-IN')}</span>
            <span className="metric-card__subtext">Completed Revenue: ₹{completedBookingValue.toLocaleString('en-IN')}</span>
          </div>

          <div className="metric-card">
            <span className="metric-card__title">Vendor Status & Login</span>
            <span className="metric-card__value">{vendor.status.toUpperCase()}</span>
            <span className="metric-card__subtext">Last Login: {vendor.lastLoginAt ? new Date(vendor.lastLoginAt).toLocaleString() : 'Never'}</span>
          </div>
        </div>

        {/* Overview & Business Info Grid */}
        <div className="grid grid--2 mb-4">
          <div className="card-panel">
            <h3 className="h4 mb-3">Vendor Overview & Credentials</h3>
            <div className="detail-list">
              <div className="detail-item"><span>Vendor ID:</span><strong>{vendor.id}</strong></div>
              <div className="detail-item"><span>Business Name:</span><strong>{vendor.name}</strong></div>
              <div className="detail-item"><span>Contact Person:</span><strong>{vendor.contactName || '—'}</strong></div>
              <div className="detail-item"><span>Email (Login ID):</span><strong>{vendor.email}</strong></div>
              <div className="detail-item"><span>Mobile Phone:</span><strong>{vendor.phone}</strong></div>
              <div className="detail-item"><span>Account Status:</span><span className={`status-pill status-pill--${vendor.status}`}>{vendor.status}</span></div>
              <div className="detail-item"><span>Created Date:</span><strong>{new Date(vendor.createdAt).toLocaleDateString()}</strong></div>
              <div className="detail-item"><span>Internal Notes:</span><span>{vendor.notes || 'None'}</span></div>
            </div>
          </div>

          <div className="card-panel">
            <h3 className="h4 mb-3">Business & Service Information</h3>
            <div className="detail-list mb-3">
              <div className="detail-item"><span>Business Address:</span><strong>{vendor.address || '—'}</strong></div>
              <div className="detail-item"><span>City / State / Pincode:</span><strong>{vendor.city || 'Delhi'}, {vendor.state || 'Delhi'} - {vendor.pincode || '—'}</strong></div>
              <div className="detail-item"><span>GSTIN:</span><strong>{vendor.gstin || '—'}</strong></div>
              <div className="detail-item"><span>PAN:</span><strong>{vendor.pan || '—'}</strong></div>
            </div>

            <h4 className="h5 mb-2">Specialties</h4>
            <div className="d-flex wrap gap-1 mb-3">
              {(vendor.specialties || []).length > 0 ? (
                vendor.specialties.map((s) => (
                  <span key={s} className="tag tag--primary">{s}</span>
                ))
              ) : (
                <span className="subtext">No specialties assigned</span>
              )}
            </div>

            <h4 className="h5 mb-2">Service Area Pincodes</h4>
            <div className="d-flex wrap gap-1">
              {(vendor.servicePincodes || []).length > 0 ? (
                vendor.servicePincodes.map((p) => (
                  <span key={p} className="tag">{p}</span>
                ))
              ) : (
                <span className="subtext">No service pincodes assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Assigned Orders Section */}
        <div className="card-panel mb-4">
          <div className="d-flex justify-between align-center wrap gap-2 mb-3">
            <h3 className="h4 mb-0">Assigned Orders ({assignedOrders.length})</h3>
            <div className="d-flex wrap gap-1">
              {['ALL', 'VENDOR_ASSIGNED', 'VENDOR_ACCEPTED', 'IN_PROGRESS', 'READY_FOR_SETUP', 'COMPLETED', 'VENDOR_DECLINED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  className={`button button--small ${orderFilter === st ? '' : 'button--ghost'}`}
                  onClick={() => setOrderFilter(st)}
                >
                  {st.replace('VENDOR_', '').replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-orders__table-wrap">
            <table className="admin-orders__table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Decoration Experience</th>
                  <th>Scheduled Date & Time</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td><strong>{o.id}</strong></td>
                      <td>
                        <div>{o.customerName || 'Customer'}</div>
                        <small className="subtext">{o.customerPhone || o.customerEmail}</small>
                      </td>
                      <td>{o.decorationName || 'DecorFesto Experience'}</td>
                      <td>
                        <div>{o.scheduledDate || o.eventDate || 'TBD'}</div>
                        <small className="subtext">{o.scheduledTime || o.timeSlot}</small>
                      </td>
                      <td>₹{(o.total || 0).toLocaleString('en-IN')}</td>
                      <td>
                        <span className={`status-pill status-pill--${String(o.bookingStatus || '').toLowerCase()}`}>
                          {typeof o.bookingStatus === 'string' ? o.bookingStatus : String(o.bookingStatus?.label || o.bookingStatus || 'VENDOR_ASSIGNED')}
                        </span>
                      </td>
                      <td>
                        <Link to={`/admin/orders/${o.id}`} className="button button--small button--ghost">View Order</Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center p-4">
                      No assigned orders found matching filter "{orderFilter}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Section */}
        <div className="card-panel mb-4">
          <h3 className="h4 mb-3">Vendor Audit Log</h3>
          {auditLogs.length > 0 ? (
            <div className="timeline">
              {auditLogs.map((log) => (
                <div key={log.id} className="timeline-item">
                  <div className="timeline-badge">●</div>
                  <div className="timeline-content">
                    <div className="d-flex justify-between align-center">
                      <strong>{log.action}</strong>
                      <small className="subtext">{new Date(log.timestamp).toLocaleString()}</small>
                    </div>
                    <p className="mb-0 subtext">By {log.actor} — {log.note}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="subtext">No audit history recorded for this vendor yet.</p>
          )}
        </div>
      </section>

      {/* EDIT VENDOR MODAL */}
      {activeModal === 'edit' && editForm && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content--wide">
            <div className="modal-header">
              <h2>Edit Vendor Profile: {vendor.name}</h2>
              <button type="button" className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            {formError && <div className="alert alert--danger mb-3">{formError}</div>}
            <form onSubmit={handleEditSubmit} className="auth-form">
              <div className="grid grid--2 gap-2">
                <label className="search-field"><span>Business / Vendor Name *</span><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} required /></label>
                <label className="search-field"><span>Contact Person</span><input value={editForm.contactName} onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })} /></label>
                <label className="search-field"><span>Email (Portal Login ID) *</span><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} required /></label>
                <label className="search-field"><span>Mobile Phone *</span><input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} required /></label>
                <label className="search-field"><span>Business Address</span><input value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} /></label>
                <label className="search-field"><span>City</span><input value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} /></label>
                <label className="search-field"><span>State</span><input value={editForm.state || ''} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} /></label>
                <label className="search-field"><span>Pincode</span><input value={editForm.pincode || ''} onChange={(e) => setEditForm({ ...editForm, pincode: e.target.value })} /></label>
                <label className="search-field"><span>GSTIN</span><input value={editForm.gstin || ''} onChange={(e) => setEditForm({ ...editForm, gstin: e.target.value })} /></label>
                <label className="search-field"><span>PAN Number</span><input value={editForm.pan || ''} onChange={(e) => setEditForm({ ...editForm, pan: e.target.value })} /></label>
              </div>

              <label className="search-field mt-2">
                <span>Service Pincodes (Comma-separated)</span>
                <input value={editForm.servicePincodes} onChange={(e) => setEditForm({ ...editForm, servicePincodes: e.target.value })} placeholder="110001, 110032, 400001" />
              </label>

              <div className="form-group mt-2">
                <span className="search-field__label mb-1">Vendor Specialties</span>
                <div className="d-flex wrap gap-2">
                  {PRESET_SPECIALTIES.map((spec) => (
                    <label key={spec} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(editForm.specialties || []).includes(spec)}
                        onChange={() => toggleSpecialty(spec)}
                      />
                      {spec}
                    </label>
                  ))}
                </div>
              </div>

              <label className="search-field mt-2">
                <span>Account Status</span>
                <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  <option value="active">Active (Login Allowed)</option>
                  <option value="inactive">Inactive (Login Blocked)</option>
                  <option value="suspended">Suspended (Login Blocked)</option>
                  <option value="invited">Invited (Pending First Login)</option>
                </select>
              </label>

              <label className="search-field mt-2">
                <span>Internal Notes</span>
                <textarea rows="2" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
              </label>

              <div className="confirmation-actions mt-4">
                <button type="submit" className="button">Save Profile Changes</button>
                <button type="button" className="button button--ghost" onClick={() => setActiveModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {activeModal === 'resetPassword' && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Reset Password: {vendor.name}</h2>
              <button type="button" className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            {formError && <div className="alert alert--danger mb-3">{formError}</div>}
            <p className="subtext mb-3">
              Setting a new password will automatically invalidate all existing active portal session tokens for this vendor.
            </p>
            <form onSubmit={handlePasswordSubmit} className="auth-form">
              <label className="search-field">
                <span>New Password (Min 6 characters) *</span>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                />
              </label>
              <label className="search-field">
                <span>Confirm New Password *</span>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
              </label>
              <div className="confirmation-actions mt-4">
                <button type="submit" className="button">Reset Password & Invalidate Sessions</button>
                <button type="button" className="button button--ghost" onClick={() => setActiveModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS REASON MODAL */}
      {activeModal === 'statusReason' && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Change Status to {statusTarget.newStatus.toUpperCase()}</h2>
              <button type="button" className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form onSubmit={confirmStatusChange} className="auth-form">
              <p className="subtext mb-3">
                Changing status to <strong>{statusTarget.newStatus.toUpperCase()}</strong> will update access rights.
              </p>
              <label className="search-field">
                <span>Reason / Audit Note</span>
                <textarea
                  rows="3"
                  value={statusTarget.reason}
                  onChange={(e) => setStatusTarget({ ...statusTarget, reason: e.target.value })}
                  placeholder="Optional note for vendor audit trail..."
                />
              </label>
              <div className="confirmation-actions mt-4">
                <button type="submit" className="button">Confirm Status Change</button>
                <button type="button" className="button button--ghost" onClick={() => setActiveModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminVendorDetails;
