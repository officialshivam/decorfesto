import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  fullName: '',
  mobile: '',
  email: '',
  address: '',
  pincode: '',
};

function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const { user, addOrder } = useAuth();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    fullName: user?.fullName || '',
    mobile: String(user?.mobile || '').replace(/\D/g, '').slice(-10),
    email: user?.email || '',
    address: user?.savedAddress || '',
  }));
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.totalPrice * item.quantity, 0), [items]);
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

    const order = {
      id: `DFC-${Date.now().toString().slice(-6)}`,
      customerName: form.fullName.trim(),
      mobile: `+91 ${form.mobile.trim()}`,
      email: form.email.trim(),
      address: form.address.trim(),
      pincode: form.pincode.trim(),
      items,
      total,
      serviceCharges,
      paymentStatus: 'Payment Pending / Mock',
      bookingStatus: 'Order Received',
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
            <div className="checkout-form">
              <label className="search-field">
                <span>Full Name</span>
                <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter your full name" />
                {errors.fullName ? <p className="field-error">{errors.fullName}</p> : null}
              </label>
              <label className="search-field">
                <span>Mobile Number</span>
                <div className="mobile-input-row">
                  <span className="mobile-prefix">+91</span>
                  <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="9876543210" inputMode="numeric" maxLength={10} />
                </div>
                {errors.mobile ? <p className="field-error">{errors.mobile}</p> : null}
              </label>
              <label className="search-field">
                <span>Email</span>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter your email" />
                {errors.email ? <p className="field-error">{errors.email}</p> : null}
              </label>
              <label className="search-field">
                <span>Full Address</span>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Enter your delivery address" />
                {errors.address ? <p className="field-error">{errors.address}</p> : null}
              </label>
              <label className="search-field">
                <span>Pincode</span>
                <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="Enter your pincode" inputMode="numeric" maxLength={6} />
                {errors.pincode ? <p className="field-error">{errors.pincode}</p> : null}
              </label>
            </div>
            {submitError ? <p className="field-error field-error--summary">{submitError}</p> : null}
          </div>

          <aside className="card-panel sticky-summary">
            <div className="card-panel__header">
              <h2>Booking summary</h2>
            </div>
            <div className="summary-box">
              {items.map((item) => (
                <div key={item.key} className="summary-box__row summary-box__row--stacked">
                  <span>{item.productName}</span>
                  <strong>₹{(item.totalPrice * item.quantity).toLocaleString('en-IN')}</strong>
                  <small>
                    {item.quantity} × {Object.values(item.customization).join(' • ')} • {item.pincode} • {item.date} • {item.time}
                  </small>
                </div>
              ))}
              <div className="summary-box__row">
                <span>Service / booking charges</span>
                <strong>₹{serviceCharges.toLocaleString('en-IN')}</strong>
              </div>
              <div className="summary-box__row pricing-row--total">
                <span>Total</span>
                <strong>₹{total.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div className="payment-card">
              <h3>Online Payment</h3>
              <p>Payment is mocked for this frontend phase. Your booking request will be reviewed by DecorFesto after confirmation.</p>
              <button type="button" className="button button--full" onClick={handlePlaceOrder}>
                Pay & Place Order
              </button>
            </div>

            <Link to="/cart" className="text-link">
              Back to cart
            </Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default Checkout;
