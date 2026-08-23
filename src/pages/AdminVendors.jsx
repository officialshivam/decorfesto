import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getStoredVendors,
  saveStoredVendor,
  updateVendorStatus,
  resetVendorPassword,
  forceLogoutVendor,
  deleteOrArchiveVendor,
  generateNextVendorId,
  validateVendorUnique,
  calculateVendorWorkload,
  PRESET_SPECIALTIES,
} from '../services/mockVendors';
import { getOrders } from '../services/orderService';

function AdminVendors() {
  const [vendors, setVendors] = useState(() => getStoredVendors());
  const [orders, setOrders] = useState(() => getOrders());

  // Search, Filter, Sort State
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [specialtyFilter, setSpecialtyFilter] = useState('ALL');
  const [pincodeFilter, setPincodeFilter] = useState('');
  const [workloadFilter, setWorkloadFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('name'); // 'name' | 'date' | 'activeOrders' | 'completedOrders'

  // Modal State
  const [activeModal, setActiveModal] = useState(null); // 'create' | 'edit' | 'resetPassword' | 'statusReason'
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [form, setForm] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [statusTarget, setStatusTarget] = useState({ newStatus: '', reason: '' });
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const refreshData = () => {
    setVendors(getStoredVendors());
    setOrders(getOrders());
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Summary Metrics Calculation
  const totalVendorsCount = vendors.length;
  const activeVendorsCount = vendors.filter((v) => v.status === 'active').length;
  const inactiveVendorsCount = vendors.filter((v) => v.status === 'inactive' || v.status === 'suspended').length;
  const invitedVendorsCount = vendors.filter((v) => v.status === 'invited').length;

  const vendorsWithAssignedOrders = vendors.filter((v) => {
    const w = calculateVendorWorkload(orders, v.id);
    return w.activeCount > 0;
  }).length;

  const vendorsWithCompletedOrders = vendors.filter((v) => {
    const w = calculateVendorWorkload(orders, v.id);
    return w.completedCount > 0;
  }).length;

  // Filtered & Sorted Vendors
  const filteredVendors = vendors
    .filter((v) => {
      // Search
      const query = search.trim().toLowerCase();
      if (query) {
        const matchesQuery =
          String(v.id || '').toLowerCase().includes(query) ||
          String(v.name || '').toLowerCase().includes(query) ||
          String(v.contactName || '').toLowerCase().includes(query) ||
          String(v.email || '').toLowerCase().includes(query) ||
          String(v.phone || '').toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // Status Filter
      if (statusFilter !== 'ALL' && v.status !== statusFilter) {
        return false;
      }

      // Specialty Filter
      if (specialtyFilter !== 'ALL') {
        const specs = v.specialties || [];
        if (!specs.includes(specialtyFilter)) return false;
      }

      // Pincode Filter
      if (pincodeFilter.trim()) {
        const pin = pincodeFilter.trim();
        const pins = v.servicePincodes || [];
        if (!pins.includes(pin)) return false;
      }

      // Workload Filter
      if (workloadFilter !== 'ALL') {
        const w = calculateVendorWorkload(orders, v.id);
        if (w.level !== workloadFilter) return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'date') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'activeOrders') {
        const wA = calculateVendorWorkload(orders, a.id).activeCount;
        const wB = calculateVendorWorkload(orders, b.id).activeCount;
        return wB - wA;
      }
      if (sortBy === 'completedOrders') {
        const wA = calculateVendorWorkload(orders, a.id).completedCount;
        const wB = calculateVendorWorkload(orders, b.id).completedCount;
        return wB - wA;
      }
      return 0;
    });

  // Modal Handlers
  const openCreateModal = () => {
    const nextId = generateNextVendorId();
    setForm({
      id: nextId,
      name: '',
      contactName: '',
      phone: '',
      email: '',
      passwordHash: 'VendorPassword123!',
      status: 'active',
      address: '',
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '',
      gstin: '',
      pan: '',
      servicePincodes: '110001, 110032',
      specialties: ['Balloon Decoration', 'Birthday'],
      notes: '',
    });
    setFormError('');
    setActiveModal('create');
  };

  const openEditModal = (vendor) => {
    setSelectedVendor(vendor);
    setForm({
      ...vendor,
      servicePincodes: (vendor.servicePincodes || []).join(', '),
      specialties: vendor.specialties || [],
    });
    setFormError('');
    setActiveModal('edit');
  };

  const openResetPasswordModal = (vendor) => {
    setSelectedVendor(vendor);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setFormError('');
    setActiveModal('resetPassword');
  };

  const openStatusChangeModal = (vendor, newStatus) => {
    setSelectedVendor(vendor);
    setStatusTarget({ newStatus, reason: '' });
    setActiveModal('statusReason');
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    const validation = validateVendorUnique({
      email: form.email,
      phone: form.phone,
      id: activeModal === 'edit' ? selectedVendor.id : form.id,
    });

    if (!validation.valid) {
      setFormError(validation.message);
      return;
    }

    const saved = saveStoredVendor({
      ...form,
      servicePincodes: typeof form.servicePincodes === 'string'
        ? form.servicePincodes.split(',').map((s) => s.trim()).filter(Boolean)
        : form.servicePincodes,
    });

    refreshData();
    setActiveModal(null);
    showToast(activeModal === 'create' ? `Vendor account ${saved.id} (${saved.name}) created successfully!` : `Vendor profile updated for ${saved.name}`);
  };

  const handlePasswordResetSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    resetVendorPassword(selectedVendor.id, passwordForm.newPassword, 'ADMIN');
    refreshData();
    setActiveModal(null);
    showToast(`Password reset for ${selectedVendor.name}. Sessions invalidated.`);
  };

  const handleStatusChangeSubmit = (e) => {
    e.preventDefault();
    updateVendorStatus(selectedVendor.id, statusTarget.newStatus, statusTarget.reason);
    refreshData();
    setActiveModal(null);
    showToast(`Vendor ${selectedVendor.name} status updated to ${statusTarget.newStatus.toUpperCase()}`);
  };

  const handleForceLogout = (vendor) => {
    forceLogoutVendor(vendor.id, 'ADMIN');
    refreshData();
    showToast(`Forcibly logged out vendor ${vendor.name}. Active sessions invalidated.`);
  };

  const handleDeleteOrArchive = (vendor) => {
    const workloadInfo = calculateVendorWorkload(orders, vendor.id);
    const hasHistory = workloadInfo.totalCount > 0;

    const msg = hasHistory
      ? `Vendor ${vendor.name} has ${workloadInfo.totalCount} assigned orders. Safely ARCHIVE this vendor?`
      : `Permanently DELETE vendor ${vendor.name} (${vendor.id})?`;

    if (window.confirm(msg)) {
      const result = deleteOrArchiveVendor(vendor.id, hasHistory);
      refreshData();
      showToast(result.message);
    }
  };

  const toggleSpecialty = (spec) => {
    setForm((prev) => {
      const current = prev.specialties || [];
      const next = current.includes(spec) ? current.filter((s) => s !== spec) : [...current, spec];
      return { ...prev, specialties: next };
    });
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        {/* Page Heading & Toolbar */}
        <div className="d-flex justify-between align-center wrap gap-3 mb-4">
          <div>
            <span className="eyebrow mb-0">Admin Control Center</span>
            <h1 className="h2 mb-1">Vendor Partner Management</h1>
            <p className="subtext mb-0">Manage vendor partner accounts, service areas, credentials, and order assignments.</p>
          </div>
          <button type="button" className="button button--large" onClick={openCreateModal}>
            + Create Vendor Partner
          </button>
        </div>

        {toastMessage && (
          <div className="alert alert--success mb-4">
            ✓ {toastMessage}
          </div>
        )}

        {/* 1. Summary Cards */}
        <div className="grid grid--6 gap-2 mb-4">
          <div className="metric-card">
            <span className="metric-card__title">Total Vendors</span>
            <span className="metric-card__value">{totalVendorsCount}</span>
            <span className="metric-card__subtext">Registered Partners</span>
          </div>

          <div className="metric-card">
            <span className="metric-card__title">Active Vendors</span>
            <span className="metric-card__value text-success">{activeVendorsCount}</span>
            <span className="metric-card__subtext">Login Enabled</span>
          </div>

          <div className="metric-card">
            <span className="metric-card__title">Inactive / Suspended</span>
            <span className="metric-card__value text-danger">{inactiveVendorsCount}</span>
            <span className="metric-card__subtext">Access Blocked</span>
          </div>

          <div className="metric-card">
            <span className="metric-card__title">Invited / Pending</span>
            <span className="metric-card__value">{invitedVendorsCount}</span>
            <span className="metric-card__subtext">First Login Pending</span>
          </div>

          <div className="metric-card">
            <span className="metric-card__title">With Active Orders</span>
            <span className="metric-card__value">{vendorsWithAssignedOrders}</span>
            <span className="metric-card__subtext">Currently Executing</span>
          </div>

          <div className="metric-card">
            <span className="metric-card__title">With Completed</span>
            <span className="metric-card__value">{vendorsWithCompletedOrders}</span>
            <span className="metric-card__subtext">Fulfilled History</span>
          </div>
        </div>

        {/* 2. Search, Filter & Sort Toolbar */}
        <div className="card-panel mb-4">
          <div className="grid grid--4 gap-2 align-end">
            <label className="search-field mb-0">
              <span>Search Vendors</span>
              <input
                type="text"
                placeholder="ID, Name, Contact, Email, Phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <label className="search-field mb-0">
              <span>Filter Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="ALL">All Account Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
                <option value="suspended">Suspended Only</option>
                <option value="invited">Invited Only</option>
              </select>
            </label>

            <label className="search-field mb-0">
              <span>Filter Specialty</span>
              <select value={specialtyFilter} onChange={(e) => setSpecialtyFilter(e.target.value)}>
                <option value="ALL">All Specialties</option>
                {PRESET_SPECIALTIES.map((spec) => (
                  <option key={spec} value={spec}>{spec}</option>
                ))}
              </select>
            </label>

            <label className="search-field mb-0">
              <span>Filter Workload / Sort</span>
              <div className="d-flex gap-2">
                <select value={workloadFilter} onChange={(e) => setWorkloadFilter(e.target.value)}>
                  <option value="ALL">All Workloads</option>
                  <option value="LOW">LOW Workload</option>
                  <option value="MEDIUM">MEDIUM Workload</option>
                  <option value="HIGH">HIGH Workload</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="name">Sort: Name</option>
                  <option value="date">Sort: Newest</option>
                  <option value="activeOrders">Sort: Active Orders</option>
                  <option value="completedOrders">Sort: Completed Orders</option>
                </select>
              </div>
            </label>
          </div>
        </div>

        {/* 3. Vendor Control Table */}
        <div className="card-panel admin-orders__table-wrap">
          <table className="admin-orders__table">
            <thead>
              <tr>
                <th>Vendor ID</th>
                <th>Vendor / Business</th>
                <th>Contact Details</th>
                <th>Specialties</th>
                <th>Service Areas</th>
                <th>Workload</th>
                <th>Status</th>
                <th>Orders (Active / Done)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vendor) => {
                  const workloadInfo = calculateVendorWorkload(orders, vendor.id);
                  return (
                    <tr key={vendor.id}>
                      <td><strong>{vendor.id}</strong></td>
                      <td>
                        <div><strong>{vendor.name}</strong></div>
                        <small className="subtext">{vendor.city || 'Delhi NCR'}</small>
                      </td>
                      <td>
                        <div>{vendor.contactName || '—'}</div>
                        <small className="subtext">{vendor.phone} | {vendor.email}</small>
                      </td>
                      <td>
                        <div className="d-flex wrap gap-1">
                          {(vendor.specialties || []).slice(0, 2).map((s) => (
                            <span key={s} className="tag tag--small">{s}</span>
                          ))}
                          {(vendor.specialties || []).length > 2 && (
                            <span className="tag tag--small">+{vendor.specialties.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex wrap gap-1">
                          {(vendor.servicePincodes || []).slice(0, 2).map((p) => (
                            <span key={p} className="tag tag--small">{p}</span>
                          ))}
                          {(vendor.servicePincodes || []).length > 2 && (
                            <span className="tag tag--small">+{vendor.servicePincodes.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`workload-pill ${workloadInfo.badgeClass}`}>
                          {workloadInfo.level} ({workloadInfo.activeCount})
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill status-pill--${vendor.status}`}>
                          {vendor.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div>Active: <strong>{workloadInfo.activeCount}</strong></div>
                        <small className="subtext">Completed: {workloadInfo.completedCount}</small>
                      </td>
                      <td>
                        <div className="d-flex wrap gap-1">
                          <Link to={`/admin/vendors/${vendor.id}`} className="button button--small">Details</Link>
                          <button type="button" className="button button--small button--ghost" onClick={() => openEditModal(vendor)}>Edit</button>
                          <button type="button" className="button button--small button--ghost" onClick={() => openResetPasswordModal(vendor)}>Password</button>
                          {vendor.status === 'active' ? (
                            <button type="button" className="button button--small button--ghost style-danger" onClick={() => openStatusChangeModal(vendor, 'suspended')}>Suspend</button>
                          ) : (
                            <button type="button" className="button button--small button--ghost" onClick={() => openStatusChangeModal(vendor, 'active')}>Activate</button>
                          )}
                          <button type="button" className="button button--small button--ghost" onClick={() => handleForceLogout(vendor)}>Logout</button>
                          <button type="button" className="button button--small button--ghost style-danger" onClick={() => handleDeleteOrArchive(vendor)}>Archive</button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center p-4">
                    No vendor partners found matching search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* CREATE / EDIT VENDOR MODAL */}
      {(activeModal === 'create' || activeModal === 'edit') && form && (
        <div className="modal-backdrop">
          <div className="modal-content modal-content--wide">
            <div className="modal-header">
              <h2>{activeModal === 'create' ? 'Create New Vendor Partner' : `Edit Vendor: ${form.name}`}</h2>
              <button type="button" className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            {formError && <div className="alert alert--danger mb-3">{formError}</div>}
            <form onSubmit={handleFormSubmit} className="auth-form">
              <div className="grid grid--2 gap-2">
                <label className="search-field">
                  <span>Vendor ID</span>
                  <input value={form.id} disabled />
                </label>

                <label className="search-field">
                  <span>Vendor / Business Name *</span>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>

                <label className="search-field">
                  <span>Contact Person</span>
                  <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                </label>

                <label className="search-field">
                  <span>Email Address (Portal Login ID) *</span>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </label>

                <label className="search-field">
                  <span>Mobile Phone Number *</span>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </label>

                {activeModal === 'create' && (
                  <label className="search-field">
                    <span>Initial Password *</span>
                    <input type="password" value={form.passwordHash} onChange={(e) => setForm({ ...form, passwordHash: e.target.value })} required />
                  </label>
                )}

                <label className="search-field">
                  <span>Business Address</span>
                  <input value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </label>

                <label className="search-field">
                  <span>City</span>
                  <input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </label>

                <label className="search-field">
                  <span>State</span>
                  <input value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </label>

                <label className="search-field">
                  <span>Pincode</span>
                  <input value={form.pincode || ''} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
                </label>

                <label className="search-field">
                  <span>GSTIN</span>
                  <input value={form.gstin || ''} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="07AAAAA0000A1Z5" />
                </label>

                <label className="search-field">
                  <span>PAN</span>
                  <input value={form.pan || ''} onChange={(e) => setForm({ ...form, pan: e.target.value })} placeholder="ABCDE1234F" />
                </label>
              </div>

              <label className="search-field mt-2">
                <span>Service Pincodes (Comma-separated)</span>
                <input value={form.servicePincodes} onChange={(e) => setForm({ ...form, servicePincodes: e.target.value })} placeholder="110001, 110032, 400001" />
              </label>

              <div className="form-group mt-2">
                <span className="search-field__label mb-1">Vendor Specialties</span>
                <div className="d-flex wrap gap-2">
                  {PRESET_SPECIALTIES.map((spec) => (
                    <label key={spec} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={(form.specialties || []).includes(spec)}
                        onChange={() => toggleSpecialty(spec)}
                      />
                      {spec}
                    </label>
                  ))}
                </div>
              </div>

              <label className="search-field mt-2">
                <span>Account Status</span>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active (Login Allowed)</option>
                  <option value="inactive">Inactive (Login Blocked)</option>
                  <option value="suspended">Suspended (Login Blocked)</option>
                  <option value="invited">Invited (Pending First Login)</option>
                </select>
              </label>

              <label className="search-field mt-2">
                <span>Internal Notes</span>
                <textarea rows="2" value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>

              <div className="confirmation-actions mt-4">
                <button type="submit" className="button">
                  {activeModal === 'create' ? 'Create Vendor Partner' : 'Save Profile Changes'}
                </button>
                <button type="button" className="button button--ghost" onClick={() => setActiveModal(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {activeModal === 'resetPassword' && selectedVendor && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Reset Password: {selectedVendor.name}</h2>
              <button type="button" className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            {formError && <div className="alert alert--danger mb-3">{formError}</div>}
            <p className="subtext mb-3">
              Setting a new password will invalidate all existing active session tokens for {selectedVendor.email}.
            </p>
            <form onSubmit={handlePasswordResetSubmit} className="auth-form">
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
                <button type="submit" className="button">Reset Password & Force Re-login</button>
                <button type="button" className="button button--ghost" onClick={() => setActiveModal(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STATUS REASON MODAL */}
      {activeModal === 'statusReason' && selectedVendor && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Change Status to {statusTarget.newStatus.toUpperCase()}</h2>
              <button type="button" className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <form onSubmit={handleStatusChangeSubmit} className="auth-form">
              <p className="subtext mb-3">
                Changing status of <strong>{selectedVendor.name}</strong> to <strong>{statusTarget.newStatus.toUpperCase()}</strong>.
              </p>
              <label className="search-field">
                <span>Reason / Audit Note</span>
                <textarea
                  rows="3"
                  value={statusTarget.reason}
                  onChange={(e) => setStatusTarget({ ...statusTarget, reason: e.target.value })}
                  placeholder="Optional audit trail note..."
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

export default AdminVendors;
