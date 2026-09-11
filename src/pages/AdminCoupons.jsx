import { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminCouponsApi,
  createAdminCouponApi,
  updateAdminCouponApi,
  deleteAdminCouponApi,
} from '../services/couponService';

function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const initialFormState = {
    code: '',
    name: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    maxDiscountAmount: '',
    minOrderAmount: '0',
    startsAt: '',
    expiresAt: '',
    usageLimit: '',
    perCustomerLimit: '',
    active: true,
    visibleToCustomers: true,
    firstOrderOnly: false,
    applicableCategories: '',
    applicableDecorations: '',
  };

  const [formData, setFormData] = useState(initialFormState);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchAdminCouponsApi();
      setCoupons(list);
    } catch (err) {
      setError(err.message || 'Failed to load coupons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const handleOpenCreateModal = () => {
    setEditingCoupon(null);
    setFormData(initialFormState);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (coupon) => {
    setEditingCoupon(coupon);

    const formatDateTimeForInput = (isoString) => {
      if (!isoString) return '';
      try {
        const d = new Date(isoString);
        return d.toISOString().slice(0, 16);
      } catch {
        return '';
      }
    };

    let categoriesStr = '';
    if (coupon.applicableCategories) {
      if (Array.isArray(coupon.applicableCategories)) {
        categoriesStr = coupon.applicableCategories.join(', ');
      } else if (typeof coupon.applicableCategories === 'string') {
        try {
          const parsed = JSON.parse(coupon.applicableCategories);
          categoriesStr = Array.isArray(parsed) ? parsed.join(', ') : coupon.applicableCategories;
        } catch {
          categoriesStr = coupon.applicableCategories;
        }
      }
    }

    let decorationsStr = '';
    if (coupon.applicableDecorations) {
      if (Array.isArray(coupon.applicableDecorations)) {
        decorationsStr = coupon.applicableDecorations.join(', ');
      } else if (typeof coupon.applicableDecorations === 'string') {
        try {
          const parsed = JSON.parse(coupon.applicableDecorations);
          decorationsStr = Array.isArray(parsed) ? parsed.join(', ') : coupon.applicableDecorations;
        } catch {
          decorationsStr = coupon.applicableDecorations;
        }
      }
    }

    setFormData({
      code: coupon.code || '',
      name: coupon.name || '',
      description: coupon.description || '',
      discountType: coupon.discountType || coupon.discount_type || 'PERCENTAGE',
      discountValue: coupon.discountValue ?? coupon.discount_value ?? '',
      maxDiscountAmount: coupon.maxDiscountAmount ?? coupon.max_discount_amount ?? '',
      minOrderAmount: coupon.minOrderAmount ?? coupon.min_order_amount ?? '0',
      startsAt: formatDateTimeForInput(coupon.startsAt || coupon.starts_at),
      expiresAt: formatDateTimeForInput(coupon.expiresAt || coupon.expires_at),
      usageLimit: coupon.usageLimit ?? coupon.usage_limit ?? '',
      perCustomerLimit: coupon.perCustomerLimit ?? coupon.per_customer_limit ?? '',
      active: coupon.active !== false && coupon.active !== 0,
      visibleToCustomers: coupon.visibleToCustomers !== false && coupon.visible_to_customers !== 0,
      firstOrderOnly: Boolean(coupon.firstOrderOnly || coupon.first_order_only),
      applicableCategories: categoriesStr,
      applicableDecorations: decorationsStr,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
    setFormError(null);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = formData.code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError('Coupon code is required.');
      return;
    }

    const val = Number(formData.discountValue);
    if (isNaN(val) || val <= 0) {
      setFormError('Discount value must be greater than 0.');
      return;
    }

    const parseList = (str) => {
      if (!str || !str.trim()) return null;
      return str
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    };

    const payload = {
      code: cleanCode,
      name: formData.name.trim() || cleanCode,
      description: formData.description.trim(),
      discountType: formData.discountType,
      discountValue: val,
      maxDiscountAmount: formData.maxDiscountAmount !== '' ? Number(formData.maxDiscountAmount) : null,
      minOrderAmount: Number(formData.minOrderAmount || 0),
      startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      usageLimit: formData.usageLimit !== '' ? Number(formData.usageLimit) : null,
      perCustomerLimit: formData.perCustomerLimit !== '' ? Number(formData.perCustomerLimit) : null,
      active: formData.active,
      visibleToCustomers: formData.visibleToCustomers,
      firstOrderOnly: formData.firstOrderOnly,
      applicableCategories: parseList(formData.applicableCategories),
      applicableDecorations: parseList(formData.applicableDecorations),
    };

    setSaving(true);
    try {
      if (editingCoupon) {
        await updateAdminCouponApi(editingCoupon.id, payload);
      } else {
        await createAdminCouponApi(payload);
      }
      handleCloseModal();
      await loadCoupons();
    } catch (err) {
      setFormError(err.message || 'Failed to save coupon.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (coupon, field) => {
    try {
      const currentValue = coupon[field] !== false && coupon[field] !== 0;
      await updateAdminCouponApi(coupon.id, { [field]: !currentValue });
      await loadCoupons();
    } catch (err) {
      alert(`Failed to update coupon status: ${err.message}`);
    }
  };

  const handleDelete = async (coupon) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${coupon.code}"?`)) {
      return;
    }
    try {
      await deleteAdminCouponApi(coupon.id);
      await loadCoupons();
    } catch (err) {
      alert(`Failed to delete coupon: ${err.message}`);
    }
  };

  const filteredCoupons = coupons.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  });

  return (
    <main className="admin-page section">
      <div className="container">
        <header className="admin-page__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="admin-page__title" style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Coupons & Discounts</h1>
            <p className="admin-page__subtitle" style={{ color: '#64748b', marginTop: '0.25rem' }}>
              Create, configure, and manage customer discount codes
            </p>
          </div>
          <button type="button" className="button button--primary" onClick={handleOpenCreateModal}>
            + Create Coupon
          </button>
        </header>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px' }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <input
            type="search"
            placeholder="Search by coupon code or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ maxWidth: '400px', width: '100%' }}
          />
        </div>

        {loading ? (
          <p style={{ color: '#64748b', padding: '2rem 0' }}>Loading coupons...</p>
        ) : filteredCoupons.length === 0 ? (
          <div style={{ background: '#fff', padding: '3rem', textAlign: 'center', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: 0 }}>No coupons found.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Code & Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Discount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Min Order</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Usage Limit</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Visibility</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoupons.map((coupon) => {
                  const isActive = coupon.active !== false && coupon.active !== 0;
                  const isVisible = coupon.visibleToCustomers !== false && coupon.visible_to_customers !== 0;
                  const type = coupon.discountType || coupon.discount_type || 'PERCENTAGE';
                  const val = Number(coupon.discountValue ?? coupon.discount_value ?? 0);
                  const maxCap = coupon.maxDiscountAmount ?? coupon.max_discount_amount;
                  const minAmt = Number(coupon.minOrderAmount ?? coupon.min_order_amount ?? 0);
                  const count = coupon.usageCount ?? coupon.usage_count ?? 0;
                  const limit = coupon.usageLimit ?? coupon.usage_limit;

                  return (
                    <tr key={coupon.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a' }}>{coupon.code}</div>
                        <div style={{ color: '#64748b', fontSize: '0.8rem' }}>{coupon.name}</div>
                        {coupon.firstOrderOnly && (
                          <span style={{ display: 'inline-block', marginTop: '2px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            First Order Only
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                        {type === 'PERCENTAGE' ? `${val}%` : `₹${val}`}
                        {type === 'PERCENTAGE' && maxCap && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>
                            Max ₹{maxCap}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {minAmt > 0 ? `₹${minAmt}` : 'None'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                        {count} / {limit !== null && limit !== undefined ? limit : '∞'}
                        {coupon.perCustomerLimit && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            ({coupon.perCustomerLimit}/user)
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon, 'visibleToCustomers')}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            background: isVisible ? '#f0fdf4' : '#f1f5f9',
                            color: isVisible ? '#15803d' : '#64748b',
                          }}
                        >
                          {isVisible ? 'Public' : 'Hidden'}
                        </button>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(coupon, 'active')}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            background: isActive ? '#dcfce7' : '#fee2e2',
                            color: isActive ? '#166534' : '#991b1b',
                          }}
                        >
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="button button--small"
                          onClick={() => handleOpenEditModal(coupon)}
                          style={{ marginRight: '0.5rem' }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="button button--small"
                          onClick={() => handleDelete(coupon)}
                          style={{ color: '#dc2626', borderColor: '#fecaca' }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* CREATE / EDIT MODAL */}
        {isModalOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <div style={{ background: '#fff', borderRadius: '8px', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  {editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}
                </h2>
                <button type="button" onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>
                  &times;
                </button>
              </header>

              {formError && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '6px', fontSize: '0.875rem' }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitForm} style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Coupon Code *</label>
                    <input
                      type="text"
                      className="input"
                      required
                      placeholder="e.g. WELCOME10"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Display Name *</label>
                    <input
                      type="text"
                      className="input"
                      required
                      placeholder="e.g. Welcome Offer 10% Off"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Description</label>
                  <textarea
                    className="input"
                    rows="2"
                    placeholder="Brief details shown to customer..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Discount Type *</label>
                    <select
                      className="input"
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Discount Value *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className="input"
                      required
                      placeholder="e.g. 10 or 500"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Max Cap (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      placeholder="Cap for % off"
                      disabled={formData.discountType === 'FIXED'}
                      value={formData.maxDiscountAmount}
                      onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Min Order (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      placeholder="0 for none"
                      value={formData.minOrderAmount}
                      onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Total Usage Limit</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      placeholder="Blank for unlimited"
                      value={formData.usageLimit}
                      onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Per Customer Limit</label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      placeholder="Blank for unlimited"
                      value={formData.perCustomerLimit}
                      onChange={(e) => setFormData({ ...formData, perCustomerLimit: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Starts At</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.startsAt}
                      onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Expires At</label>
                    <input
                      type="datetime-local"
                      className="input"
                      value={formData.expiresAt}
                      onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    Applicable Categories (comma-separated IDs)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. birthday, anniversary (leave blank for all)"
                    value={formData.applicableCategories}
                    onChange={(e) => setFormData({ ...formData, applicableCategories: e.target.value })}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                    Applicable Decoration IDs (comma-separated)
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. 1, 2, 5 (leave blank for all)"
                    value={formData.applicableDecorations}
                    onChange={(e) => setFormData({ ...formData, applicableDecorations: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    />
                    Active
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.visibleToCustomers}
                      onChange={(e) => setFormData({ ...formData, visibleToCustomers: e.target.checked })}
                    />
                    Visible to Customers
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.firstOrderOnly}
                      onChange={(e) => setFormData({ ...formData, firstOrderOnly: e.target.checked })}
                    />
                    First Order Only
                  </label>
                </div>

                <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <button type="button" className="button" onClick={handleCloseModal} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="button button--primary" disabled={saving}>
                    {saving ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                  </button>
                </footer>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminCoupons;
