import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MobileNumberInput, { sanitize10DigitMobile, validate10DigitMobile } from '../components/MobileNumberInput';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { addOrder as addOrderMock, saveLastOrder } from '../services/mockAuth';
import { createOrderApi } from '../services/orderService';
import { getEnabledCharges, calculateTotalCharges, calculateItemSubtotal } from '../services/mockSettings';
import { initiateRazorpayPayment } from '../services/paymentService';
import { formatDisplayDate } from '../utils/dateTimeUtils';

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

  const handlePlaceOrder = async () => {
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
        paymentStatus: 'PAYMENT_INITIATED',
        bookingStatus: 'Order Received',
        remarks: orderRemarks,
        reviewMessage: 'DecorFesto will review your booking shortly and confirm the next step with you.',
        createdAt: new Date().toISOString(),
      };

      console.log('BOOKING PAYLOAD', order);

      // 1. Persist order to production MySQL database FIRST
      let activeOrder = null;
      try {
        activeOrder = await createOrderApi(order, {
          fullName: form.fullName.trim(),
          mobile: mobileVal.fullMobile,
          email: form.email.trim(),
          savedAddress: form.address.trim(),
        });
      } catch (orderErr) {
        console.error('Production order creation failed:', orderErr);
        setIsSubmitting(false);
        setSubmitError('Failed to initialize booking on server. Please try again.');
        return;
      }

      if (!activeOrder || !activeOrder.id) {
        setIsSubmitting(false);
        setSubmitError('Unable to create booking record in production database. Payment aborted.');
        return;
      }

      // 2. Save local UI fallback
      saveLastOrder(activeOrder);

      if (typeof authAddOrder === 'function') {
        authAddOrder(activeOrder, {
          fullName: form.fullName.trim(),
          mobile: mobileVal.fullMobile,
          email: form.email.trim(),
          savedAddress: form.address.trim(),
        });
      } else {
        addOrderMock(activeOrder, {
          fullName: form.fullName.trim(),
          mobile: mobileVal.fullMobile,
          email: form.email.trim(),
          savedAddress: form.address.trim(),
        });
      }

      // 3. Initiate Razorpay Checkout with server-persisted order ID
      initiateRazorpayPayment({
        order: activeOrder,
        customer: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          mobile: mobileVal.fullMobile,
        },
        onSuccess: (verifyRes) => {
          const verifiedOrder = verifyRes.order || {
            ...activeOrder,
            paymentStatus: 'PAID',
            razorpayPaymentId: verifyRes.razorpayPaymentId,
            razorpayOrderId: verifyRes.razorpayOrderId,
          };
          saveLastOrder(verifiedOrder);
          if (typeof authAddOrder === 'function') {
            authAddOrder(verifiedOrder);
          }
          isNavigatingRef.current = true;
          clearCart();
          navigate('/confirmation', { state: { order: verifiedOrder }, replace: true });
        },
        onError: (errMessage) => {
          setIsSubmitting(false);
          setSubmitError(errMessage || 'Razorpay payment was not completed. Click Place Booking Request to try again.');
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
                placeholder="Enter 10 Digit Mobile No."
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
              {items.map((item) => {
                const basePrice = item.basePrice || item.price || 0;
                const addOnPrice = item.addOnPrice || 0;
                return (
                  <div key={item.key} style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                      <span>{item.productName} ({item.quantity} {item.quantity === 1 ? 'Pkg' : 'Pkgs'})</span>
                      <span>₹{(basePrice * item.quantity).toLocaleString('en-IN')}</span>
                    </div>
                    <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      <strong>Date:</strong> {formatDisplayDate(item.date)} • <strong>Slot:</strong> {item.time}
                    </div>
                    {addOnPrice > 0 && (
                      <div style={{ fontSize: '0.84rem', color: '#0284c7', marginTop: '2px', fontWeight: '600' }}>
                        + Add-ons: ₹{(addOnPrice * item.quantity).toLocaleString('en-IN')}
                      </div>
                    )}
                    {(item.remarks || item.customization?.remarks) && (
                      <div style={{ fontSize: '0.82rem', color: 'var(--accent-dark)', fontWeight: '600', marginTop: '4px' }}>
                        Remarks: "{item.remarks || item.customization?.remarks}"
                      </div>
                    )}
                  </div>
                );
              })}
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
