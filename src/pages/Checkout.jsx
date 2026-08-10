import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { addOrder, getStoredUser } from '../services/mockAuth';

function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const user = getStoredUser();

  const [form, setForm] = useState({
    fullName: user?.name || '',
    mobile: user?.mobile || '',
    email: user?.email || '',
    address: user?.savedAddress || '',
    pincode: items[0]?.pincode || '',
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice * item.quantity, 0);
  const serviceCharges = items.length > 0 ? 299 : 0;
  const total = subtotal + serviceCharges;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Please enter your full name.';
    }

    if (!/^\d{10}$/.test(form.mobile.trim())) {
      nextErrors.mobile = 'Enter a valid 10-digit Indian mobile number.';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!form.address.trim()) {
      nextErrors.address = 'Please enter your full delivery address.';
    }

    if (!/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      nextErrors.pincode = 'Please enter a valid 6-digit Indian pincode.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePlaceOrder = () => {
    if (items.length === 0) {
      setSubmitError('Your cart is empty. Add a decoration package before checkout.');
      return;
    }

    if (!validate()) {
      return;
    }

    const orderRemarks = items
      .map((i) => i.remarks || i.customization?.remarks)
      .filter(Boolean)
      .join('; ');

    const order = {
      id: `DFC-${Date.now().toString().slice(-6)}`,
      customerName: form.fullName.trim(),
      customerMobile: `+91 ${form.mobile.trim()}`,
      customerEmail: form.email.trim(),
      address: form.address.trim(),
      pincode: form.pincode.trim(),
      items,
      total,
      serviceCharges,
      paymentStatus: 'Payment Pending / Mock',
      bookingStatus: 'Order Received',
      remarks: orderRemarks,
      reviewMessage: 'DecorFesto will review your booking shortly and confirm the next step with you.',
      createdAt: new Date().toISOString(),
    };

    addOrder(order, {
      fullName: form.fullName.trim(),
      mobile: `+91${form.mobile.trim()}`,
      email: form.email.trim(),
      savedAddress: form.address.trim(),
    });

    clearCart();
    navigate('/confirmation', { state: { order } });
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Checkout</span>
          <h1>Complete your booking request</h1>
          <p>The payment step is intentionally mocked for this frontend phase.</p>
        </div>

        <div className="checkout-layout">
          <div className="card-panel">
            <div className="card-panel__header">
              <h2>Customer information</h2>
            </div>
            <form className="checkout-form" onSubmit={(e) => e.preventDefault()}>
              <label className="search-field">
                <span>Full Name</span>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Shivam Gupta" required />
                {errors.fullName && <small className="field-error">{errors.fullName}</small>}
              </label>

              <label className="search-field">
                <span>Mobile Number</span>
                <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="9876543210" required />
                {errors.mobile && <small className="field-error">{errors.mobile}</small>}
              </label>

              <label className="search-field">
                <span>Email Address</span>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="shivam@example.com" required />
                {errors.email && <small className="field-error">{errors.email}</small>}
              </label>

              <label className="search-field">
                <span>Full Delivery Address</span>
                <textarea name="address" value={form.address} onChange={handleChange} placeholder="Flat, Building, Street, Area" required />
                {errors.address && <small className="field-error">{errors.address}</small>}
              </label>

              <label className="search-field">
                <span>Pincode</span>
                <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="110001" required />
                {errors.pincode && <small className="field-error">{errors.pincode}</small>}
              </label>

              {submitError && <div className="admin-error-banner">{submitError}</div>}
            </form>
          </div>

          <aside className="card-panel sticky-summary">
            <div className="card-panel__header">
              <h2>Booking Summary</h2>
            </div>

            <div className="cart-list">
              {items.map((item) => (
                <div key={item.key} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <strong>{item.productName}</strong>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    ₹{item.totalPrice.toLocaleString('en-IN')} × {item.quantity}
                  </div>
                  {(item.remarks || item.customization?.remarks) && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--accent-dark)', fontWeight: '600', marginTop: '4px' }}>
                      Remarks: "{item.remarks || item.customization?.remarks}"
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="summary-box" style={{ marginTop: '16px' }}>
              <div className="summary-box__row">
                <span>Subtotal</span>
                <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
              </div>
              <div className="summary-box__row">
                <span>Service charges</span>
                <strong>₹{serviceCharges.toLocaleString('en-IN')}</strong>
              </div>
              <div className="summary-box__row pricing-row--total">
                <span>Total Amount</span>
                <strong>₹{total.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <button type="button" className="button button--full" onClick={handlePlaceOrder} style={{ marginTop: '16px' }}>
              Place Booking Request
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default Checkout;
