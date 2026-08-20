import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MobileNumberInput, { sanitize10DigitMobile, validate10DigitMobile } from '../components/MobileNumberInput';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { addOrder as addOrderMock, saveLastOrder } from '../services/mockAuth';
import { getEnabledCharges, calculateTotalCharges, calculateItemSubtotal } from '../services/mockSettings';
import { initiateRazorpayPayment } from '../services/paymentService';

function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const { user, addOrder: authAddOrder } = useAuth();
  const isNavigatingRef = useRef(false);

  const [form, setForm] = useState({
    fullName: user?.name || user?.fullName || '',
    mobile: sanitize10DigitMobile(user?.mobile || ''),
    email: user?.email || '',
    address: user?.savedAddress || user?.address || '',
    city: 'Delhi NCR',
    state: 'Delhi',
    pincode: items[0]?.pincode || '',
  });

  useEffect(() => {
    if (user) {
      setForm((curr) => ({
        ...curr,
        fullName: curr.fullName || user.name || user.fullName || '',
        mobile: curr.mobile || sanitize10DigitMobile(user.mobile || ''),
        email: curr.email || user.email || '',
        address: curr.address || user.savedAddress || user.address || '',
      }));
    }
  }, [user]);

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const enabledCharges = getEnabledCharges();
  const serviceFee = calculateTotalCharges();
  const subtotal = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);

  const serviceCharges = items.length > 0 ? serviceFee : 0;
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
      nextErrors.fullName = 'Full name is required.';
    }

    if (!validate10DigitMobile(form.mobile).isValid) {
      nextErrors.mobile = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!form.address.trim()) {
      nextErrors.address = 'Street address is required.';
    }

    if (!/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      nextErrors.pincode = 'Please enter a valid 6-digit Indian pincode.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handlePlaceOrder = () => {
    if (isSubmitting) return;

    console.log('SUBMIT CART', items);

    if (items.length === 0) {
      setSubmitError('Your cart is empty. Add a decoration package before checkout.');
      return;
    }

    if (!validate()) {
      return;
    }

    if (total <= 0) {
      setSubmitError('Invalid order total. Please re-select your package.');
      return;
    }

    setIsSubmitting(true);

    try {
      const mobileVal = validate10DigitMobile(form.mobile);

      const orderRemarks = items
        .map((i) => i.remarks || i.customization?.remarks)
        .filter(Boolean)
        .join('; ');

      const calculatedSubtotal = subtotal > 0
        ? subtotal
        : items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
      const activeChargesList = getEnabledCharges();
      const chargesTotal = calculateTotalCharges();
      const finalTotal = calculatedSubtotal + chargesTotal;

      const orderId = `DFC-${Date.now().toString().slice(-6)}`;
      const order = {
        id: orderId,
        orderId,
        customerId: user?.id || `customer-${Date.now()}`,
        customerName: form.fullName.trim(),
        customerMobile: mobileVal.fullMobile,
        customerEmail: form.email.trim(),
        address: `${form.address.trim()}, ${form.city}, ${form.state}`,
        pincode: form.pincode.trim(),
        items: JSON.parse(JSON.stringify(items)),
        subtotal: calculatedSubtotal,
        total: finalTotal,
        serviceCharges: chargesTotal,
        charges: [...activeChargesList],
        paymentStatus: 'PAID (Razorpay Test Mode)',
        bookingStatus: 'Order Received',
        remarks: orderRemarks,
        reviewMessage: 'DecorFesto will review your booking shortly and confirm the next step with you.',
        createdAt: new Date().toISOString(),
      };

      console.log('BOOKING PAYLOAD', order);

      // Save initial order
      saveLastOrder(order);

      if (typeof authAddOrder === 'function') {
        authAddOrder(order, {
          fullName: form.fullName.trim(),
          mobile: mobileVal.fullMobile,
          email: form.email.trim(),
          savedAddress: form.address.trim(),
        });
      } else {
        addOrderMock(order, {
          fullName: form.fullName.trim(),
          mobile: mobileVal.fullMobile,
          email: form.email.trim(),
          savedAddress: form.address.trim(),
        });
      }

      initiateRazorpayPayment({
        order,
        customer: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          mobile: mobileVal.fullMobile,
        },
        onSuccess: (verifyRes) => {
          const paidOrder = {
            ...order,
            paymentStatus: 'PAID',
            razorpayPaymentId: verifyRes.razorpayPaymentId || `pay_test_${Date.now()}`,
            razorpayOrderId: verifyRes.razorpayOrderId,
          };
          saveLastOrder(paidOrder);
          isNavigatingRef.current = true;
          clearCart();
          navigate('/confirmation', { state: { order: paidOrder }, replace: true });
        },
        onError: (errMessage) => {
          setIsSubmitting(false);
          setSubmitError(errMessage || 'Razorpay payment was not completed. You can click Place Booking Request to try again.');
        },
        onDismiss: () => {
          setIsSubmitting(false);
          setSubmitError('Payment modal was closed before completion. Click Place Booking Request to retry.');
        },
      });
    } catch (error) {
      console.error('Error placing booking:', error);
      setSubmitError(error?.message || 'Failed to place booking. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !isSubmitting && !isNavigatingRef.current) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>Your cart is empty</h1>
            <p>Please select a decoration package from our catalog before proceeding to checkout.</p>
            <Link to="/catalog" className="button" style={{ marginTop: '12px' }}>Browse Catalog</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Checkout</span>
          <h1>Complete your booking request</h1>
          <p>Please review your customer information and celebration address.</p>
        </div>

        <div className="checkout-layout">
          <div className="card-panel">
            <div className="card-panel__header">
              <h2>Customer Information & Delivery Address</h2>
            </div>
            <form className="checkout-form" onSubmit={(e) => e.preventDefault()}>
              <label className="search-field">
                <span>Full Name *</span>
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Shivam Gupta"
                  required
                />
                {errors.fullName && <small className="field-error">{errors.fullName}</small>}
              </label>

              <MobileNumberInput
                value={form.mobile}
                onChange={(val) => {
                  setForm((curr) => ({ ...curr, mobile: val }));
                  setErrors((curr) => ({ ...curr, mobile: '' }));
                }}
                label="Mobile Number"
                placeholder="9876543210"
                required
                error={errors.mobile}
              />

              <label className="search-field">
                <span>Email Address</span>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="shivam@example.com"
                />
                {errors.email && <small className="field-error">{errors.email}</small>}
              </label>

              <label className="search-field">
                <span>Full Delivery Address *</span>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Flat, Building, Street, Area"
                  required
                />
                {errors.address && <small className="field-error">{errors.address}</small>}
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <label className="search-field">
                  <span>City</span>
                  <input name="city" value={form.city} onChange={handleChange} />
                </label>
                <label className="search-field">
                  <span>State</span>
                  <input name="state" value={form.state} onChange={handleChange} />
                </label>
                <label className="search-field">
                  <span>Pincode *</span>
                  <input name="pincode" value={form.pincode} onChange={handleChange} placeholder="110001" required />
                  {errors.pincode && <small className="field-error">{errors.pincode}</small>}
                </label>
              </div>

              {submitError && (
                <div className="admin-error-banner" style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px' }}>
                  ✕ {submitError}
                </div>
              )}
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
              {enabledCharges.map((charge) => (
                <div key={charge.id} className="summary-box__row">
                  <span>{charge.name}</span>
                  <strong>₹{charge.amount.toLocaleString('en-IN')}</strong>
                </div>
              ))}
              <div className="summary-box__row pricing-row--total">
                <span>Total Amount</span>
                <strong>₹{total.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <button
              type="button"
              className={`button button--full${isSubmitting ? ' button--disabled' : ''}`}
              onClick={handlePlaceOrder}
              disabled={isSubmitting || items.length === 0}
              style={{ marginTop: '16px' }}
            >
              {isSubmitting ? 'Placing Request…' : 'Place Booking Request'}
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default Checkout;
