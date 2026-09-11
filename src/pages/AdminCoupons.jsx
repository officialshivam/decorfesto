import { useState, useEffect, useCallback } from 'react';
import {
  fetchAdminCouponsApi,
  createAdminCouponApi,
  updateAdminCouponApi,
  deleteAdminCouponApi,
} from '../services/couponService';
import { fetchCategoriesApi } from '../services/categoryService';
import { fetchDecorationsApi } from '../services/decorationService';

function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [decorations, setDecorations] = useState([]);
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
    applicableType: 'ALL',
    selectedCategories: [],
    selectedDecorations: [],
    usageLimit: '',
    customerUsageType: 'NO_RESTRICTION',
    perCustomerLimit: '1',
    visibleToCustomers: true,
    active: true,
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

  const loadCategoriesAndDecorations = useCallback(async () => {
    try {
      const [cats, decs] = await Promise.all([
        fetchCategoriesApi().catch(() => []),
        fetchDecorationsApi().catch(() => []),
      ]);
      setCategories(cats || []);
      setDecorations(decs || []);
    } catch (err) {
      console.warn('Failed to load categories/decorations:', err);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
    loadCategoriesAndDecorations();
  }, [loadCoupons, loadCategoriesAndDecorations]);

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

    // Parse categories
    let catsArr = [];
    const rawCats = coupon.applicableCategories || coupon.applicable_categories;
    if (rawCats) {
      if (Array.isArray(rawCats)) {
        catsArr = rawCats;
      } else if (typeof rawCats === 'string') {
        try {
          const parsed = JSON.parse(rawCats);
          catsArr = Array.isArray(parsed) ? parsed : (rawCats.trim() ? rawCats.split(',').map((s) => s.trim()).filter(Boolean) : []);
        } catch {
          catsArr = rawCats.trim() ? rawCats.split(',').map((s) => s.trim()).filter(Boolean) : [];
        }
      }
    }

    // Parse decorations
    let decsArr = [];
    const rawDecs = coupon.applicableDecorations || coupon.applicable_decorations;
    if (rawDecs) {
      if (Array.isArray(rawDecs)) {
        decsArr = rawDecs;
      } else if (typeof rawDecs === 'string') {
        try {
          const parsed = JSON.parse(rawDecs);
          decsArr = Array.isArray(parsed) ? parsed : (rawDecs.trim() ? rawDecs.split(',').map((s) => s.trim()).filter(Boolean) : []);
        } catch {
          decsArr = rawDecs.trim() ? rawDecs.split(',').map((s) => s.trim()).filter(Boolean) : [];
        }
      }
    }

    let applicableType = 'ALL';
    if (catsArr.length > 0) applicableType = 'CATEGORIES';
    else if (decsArr.length > 0) applicableType = 'DECORATIONS';

    // Parse customer usage
    const isFirstOrderOnly = Boolean(coupon.firstOrderOnly || coupon.first_order_only);
    const perCustLimit = coupon.perCustomerLimit ?? coupon.per_customer_limit;
    let customerUsageType = 'NO_RESTRICTION';
    let perCustomerLimitStr = '1';

    if (isFirstOrderOnly) {
      customerUsageType = 'FIRST_ORDER_ONLY';
    } else if (perCustLimit !== null && perCustLimit !== undefined && perCustLimit !== '' && Number(perCustLimit) > 0) {
      customerUsageType = 'LIMIT_PER_CUSTOMER';
      perCustomerLimitStr = String(perCustLimit);
    }

    setFormData({
      code: coupon.code || '',
      name: coupon.name || '',
      description: coupon.description || '',
      discountType: coupon.discountType || coupon.discount_type || 'PERCENTAGE',
      discountValue: String(coupon.discountValue ?? coupon.discount_value ?? ''),
      maxDiscountAmount: String(coupon.maxDiscountAmount ?? coupon.max_discount_amount ?? ''),
      minOrderAmount: String(coupon.minOrderAmount ?? coupon.min_order_amount ?? '0'),
      startsAt: formatDateTimeForInput(coupon.startsAt || coupon.starts_at),
      expiresAt: formatDateTimeForInput(coupon.expiresAt || coupon.expires_at),
      applicableType,
      selectedCategories: catsArr,
      selectedDecorations: decsArr,
      usageLimit: String(coupon.usageLimit ?? coupon.usage_limit ?? ''),
      customerUsageType,
      perCustomerLimit: perCustomerLimitStr,
      visibleToCustomers: coupon.visibleToCustomers !== false && coupon.visible_to_customers !== 0,
      active: coupon.active !== false && coupon.active !== 0,
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
      setFormError('Coupon Code is required.');
      return;
    }

    const val = Number(formData.discountValue);
    if (isNaN(val) || val <= 0) {
      setFormError('Discount Value must be greater than 0.');
      return;
    }

    if (formData.discountType === 'PERCENTAGE' && val > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    const minOrder = Number(formData.minOrderAmount || 0);
    if (isNaN(minOrder) || minOrder < 0) {
      setFormError('Minimum order amount cannot be negative.');
      return;
    }

    if (formData.startsAt && formData.expiresAt) {
      if (new Date(formData.expiresAt) <= new Date(formData.startsAt)) {
        setFormError('Expiration date must be after start date.');
        return;
      }
    }

    if (formData.discountType === 'PERCENTAGE' && formData.maxDiscountAmount !== '') {
      const maxCap = Number(formData.maxDiscountAmount);
      if (isNaN(maxCap) || maxCap <= 0) {
        setFormError('Maximum discount cap must be greater than 0.');
        return;
      }
    }

    if (formData.usageLimit !== '') {
      const uLimit = Number(formData.usageLimit);
      if (isNaN(uLimit) || uLimit <= 0 || !Number.isInteger(uLimit)) {
        setFormError('Total usage limit must be a positive integer.');
        return;
      }
    }

    if (formData.applicableType === 'CATEGORIES' && formData.selectedCategories.length === 0) {
      setFormError('At least one category must be selected when Specific Categories is selected.');
      return;
    }

    if (formData.applicableType === 'DECORATIONS' && formData.selectedDecorations.length === 0) {
      setFormError('At least one decoration must be selected when Specific Decorations is selected.');
      return;
    }

    let firstOrderOnly = false;
    let perCustomerLimit = null;

    if (formData.customerUsageType === 'FIRST_ORDER_ONLY') {
      firstOrderOnly = true;
    } else if (formData.customerUsageType === 'LIMIT_PER_CUSTOMER') {
      const pLimit = Number(formData.perCustomerLimit);
      if (isNaN(pLimit) || pLimit <= 0 || !Number.isInteger(pLimit)) {
        setFormError('Per-customer limit must be a positive integer.');
        return;
      }
      perCustomerLimit = pLimit;
    }

    const payload = {
      code: cleanCode,
      name: formData.name.trim() || cleanCode,
      description: formData.description.trim(),
      discountType: formData.discountType,
      discountValue: val,
      maxDiscountAmount: formData.discountType === 'PERCENTAGE' && formData.maxDiscountAmount !== '' ? Number(formData.maxDiscountAmount) : null,
      minOrderAmount: minOrder,
      startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : null,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      usageLimit: formData.usageLimit !== '' ? Number(formData.usageLimit) : null,
      perCustomerLimit,
      active: formData.active,
      visibleToCustomers: formData.visibleToCustomers,
      firstOrderOnly,
      applicableCategories: formData.applicableType === 'CATEGORIES' ? formData.selectedCategories : null,
      applicableDecorations: formData.applicableType === 'DECORATIONS' ? formData.selectedDecorations : null,
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
            <div style={{ background: '#fff', borderRadius: '12px', maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                    {editingCoupon ? `Edit Coupon: ${editingCoupon.code}` : 'Create New Coupon'}
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                    {editingCoupon ? 'Update coupon rules, applicability, and visibility' : 'Configure a new discount code for your customers'}
                  </p>
                </div>
                <button type="button" onClick={handleCloseModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>
                  &times;
                </button>
              </header>

              {formError && (
                <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitForm} style={{ display: 'grid', gap: '1.25rem' }}>
                {/* A. BASIC DETAILS */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                    A. Basic Details
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
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
                  <div style={{ marginTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Description</label>
                    <textarea
                      className="input"
                      rows="2"
                      placeholder="Brief details shown to customer..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* B. DISCOUNT */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                    B. Discount Configuration
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Discount Type *</label>
                      <select
                        className="input"
                        value={formData.discountType}
                        onChange={(e) => {
                          const type = e.target.value;
                          setFormData({
                            ...formData,
                            discountType: type,
                            maxDiscountAmount: type === 'FIXED' ? '' : formData.maxDiscountAmount,
                          });
                        }}
                      >
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        Discount Value {formData.discountType === 'PERCENTAGE' ? '(%)' : '(₹)'} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="input"
                        required
                        placeholder={formData.discountType === 'PERCENTAGE' ? 'e.g. 15' : 'e.g. 200'}
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                        Maximum Discount Cap (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        placeholder={formData.discountType === 'FIXED' ? 'N/A for Fixed Amount' : 'Cap for % off'}
                        disabled={formData.discountType === 'FIXED'}
                        value={formData.maxDiscountAmount}
                        onChange={(e) => setFormData({ ...formData, maxDiscountAmount: e.target.value })}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                        {formData.discountType === 'FIXED'
                          ? 'Maximum cap applies only to percentage discounts.'
                          : 'Leave blank for no upper cap.'}
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Minimum Order Value (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="input"
                        placeholder="0 for no minimum"
                        value={formData.minOrderAmount}
                        onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                        0 for no minimum requirement.
                      </p>
                    </div>
                  </div>
                </div>

                {/* C. VALIDITY */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                    C. Validity Window
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Starts At</label>
                      <input
                        type="datetime-local"
                        className="input"
                        value={formData.startsAt}
                        onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                        Leave blank for immediate start.
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Expires At</label>
                      <input
                        type="datetime-local"
                        className="input"
                        value={formData.expiresAt}
                        onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                        Leave blank for no expiration date.
                      </p>
                    </div>
                  </div>
                </div>

                {/* D. APPLICABILITY */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                    D. Product Applicability
                  </h3>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Applicable To</label>
                    <select
                      className="input"
                      value={formData.applicableType}
                      onChange={(e) => setFormData({ ...formData, applicableType: e.target.value })}
                    >
                      <option value="ALL">All Products</option>
                      <option value="CATEGORIES">Specific Categories</option>
                      <option value="DECORATIONS">Specific Decorations</option>
                    </select>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginBottom: '0.75rem' }}>
                      {formData.applicableType === 'ALL' && 'Applies to all products across the catalog without category or item restrictions.'}
                      {formData.applicableType === 'CATEGORIES' && 'Applies only when cart contains items from selected categories.'}
                      {formData.applicableType === 'DECORATIONS' && 'Applies only when cart contains specific decoration items.'}
                    </p>
                  </div>

                  {formData.applicableType === 'CATEGORIES' && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Select Categories</label>
                      <select
                        className="input"
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !formData.selectedCategories.includes(val)) {
                            setFormData({ ...formData, selectedCategories: [...formData.selectedCategories, val] });
                          }
                        }}
                      >
                        <option value="">-- Select Category to Add --</option>
                        {categories
                          .filter((c) => !formData.selectedCategories.includes(c.name) && !formData.selectedCategories.includes(c.id))
                          .map((c) => (
                            <option key={c.id} value={c.name || c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {formData.selectedCategories.length === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: '#dc2626', margin: 0, fontStyle: 'italic' }}>
                            No categories selected. Please add at least one category.
                          </p>
                        ) : (
                          formData.selectedCategories.map((catKey) => {
                            const matchedObj = categories.find((c) => c.id === catKey || c.name === catKey);
                            const label = matchedObj ? matchedObj.name : catKey;
                            return (
                              <span
                                key={catKey}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: '#e0f2fe',
                                  color: '#0369a1',
                                  border: '1px solid #bae6fd',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '16px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                }}
                              >
                                {label}
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, selectedCategories: formData.selectedCategories.filter((k) => k !== catKey) })}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0369a1', fontWeight: 700, marginLeft: '2px', fontSize: '1rem', lineHeight: 1 }}
                                >
                                  &times;
                                </button>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

                  {formData.applicableType === 'DECORATIONS' && (
                    <div style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Select Decorations</label>
                      <select
                        className="input"
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !formData.selectedDecorations.includes(val)) {
                            setFormData({ ...formData, selectedDecorations: [...formData.selectedDecorations, val] });
                          }
                        }}
                      >
                        <option value="">-- Select Decoration Package to Add --</option>
                        {decorations
                          .filter((d) => !formData.selectedDecorations.includes(d.id) && !formData.selectedDecorations.includes(d.decorationId))
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} {d.basePrice ? `(₹${d.basePrice})` : ''}
                            </option>
                          ))}
                      </select>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                        {formData.selectedDecorations.length === 0 ? (
                          <p style={{ fontSize: '0.8rem', color: '#dc2626', margin: 0, fontStyle: 'italic' }}>
                            No decorations selected. Please add at least one decoration.
                          </p>
                        ) : (
                          formData.selectedDecorations.map((decKey) => {
                            const matchedObj = decorations.find((d) => d.id === decKey || d.decorationId === decKey);
                            const label = matchedObj ? matchedObj.name : decKey;
                            return (
                              <span
                                key={decKey}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  background: '#fef3c7',
                                  color: '#92400e',
                                  border: '1px solid #fde68a',
                                  padding: '0.25rem 0.65rem',
                                  borderRadius: '16px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                }}
                              >
                                {label}
                                <button
                                  type="button"
                                  onClick={() => setFormData({ ...formData, selectedDecorations: formData.selectedDecorations.filter((k) => k !== decKey) })}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontWeight: 700, marginLeft: '2px', fontSize: '1rem', lineHeight: 1 }}
                                >
                                  &times;
                                </button>
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* E. USAGE & RESTRICTIONS */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                    E. Usage Limits & Customer Restrictions
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Total Usage Limit</label>
                      <input
                        type="number"
                        min="1"
                        className="input"
                        placeholder="Unlimited if blank"
                        value={formData.usageLimit}
                        onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
                      />
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                        Maximum number of successful orders that can use this coupon.
                      </p>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Customer Usage</label>
                      <select
                        className="input"
                        value={formData.customerUsageType}
                        onChange={(e) => setFormData({ ...formData, customerUsageType: e.target.value })}
                      >
                        <option value="NO_RESTRICTION">No Restriction</option>
                        <option value="FIRST_ORDER_ONLY">First Order Only</option>
                        <option value="LIMIT_PER_CUSTOMER">Limit Per Customer</option>
                      </select>
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                        {formData.customerUsageType === 'NO_RESTRICTION' && 'Any customer can use this coupon multiple times.'}
                        {formData.customerUsageType === 'FIRST_ORDER_ONLY' && 'Valid only for customers who have not placed a previous paid order.'}
                        {formData.customerUsageType === 'LIMIT_PER_CUSTOMER' && 'Set a maximum cap on how many times each customer can redeem this.'}
                      </p>
                    </div>
                    {formData.customerUsageType === 'LIMIT_PER_CUSTOMER' && (
                      <div>
                        <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Maximum Uses Per Customer *</label>
                        <input
                          type="number"
                          min="1"
                          className="input"
                          required
                          placeholder="e.g. 1"
                          value={formData.perCustomerLimit}
                          onChange={(e) => setFormData({ ...formData, perCustomerLimit: e.target.value })}
                        />
                        <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', marginBottom: 0 }}>
                          Maximum redemption count per registered account / phone number.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* F. CUSTOMER VISIBILITY */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                    F. Customer Visibility
                  </h3>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Customer Visibility</label>
                    <select
                      className="input"
                      value={formData.visibleToCustomers ? 'VISIBLE' : 'HIDDEN'}
                      onChange={(e) => setFormData({ ...formData, visibleToCustomers: e.target.value === 'VISIBLE' })}
                    >
                      <option value="VISIBLE">Visible to Customers</option>
                      <option value="HIDDEN">Hidden / Private</option>
                    </select>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', marginBottom: 0, fontWeight: 500 }}>
                      {formData.visibleToCustomers
                        ? 'Visible: This coupon appears in the customer\'s Available Coupons list.'
                        : 'Hidden / Private: This coupon will not be shown to customers, but can still be applied by entering the code manually if otherwise valid.'}
                    </p>
                  </div>
                </div>

                {/* G. STATUS */}
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '0 0 0.75rem 0' }}>
                    G. Status
                  </h3>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.25rem' }}>Coupon Status</label>
                    <select
                      className="input"
                      value={formData.active ? 'ACTIVE' : 'INACTIVE'}
                      onChange={(e) => setFormData({ ...formData, active: e.target.value === 'ACTIVE' })}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', marginBottom: 0 }}>
                      {formData.active ? 'Active: Customers can apply this coupon.' : 'Inactive: Coupon is disabled and cannot be redeemed.'}
                    </p>
                  </div>
                </div>

                <footer style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
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
