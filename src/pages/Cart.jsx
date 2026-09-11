import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CartItem from '../components/CartItem';
import AddAddressDrawer from '../components/AddAddressDrawer';
import PriceSummaryBreakup from '../components/PriceSummaryBreakup';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { fetchEnabledChargesApi, calculateItemSubtotal } from '../services/chargeService';
import { updateCustomerProfileApi } from '../services/customerAuthService';
import { checkPincodeServiceability } from '../services/mockServiceAreas';
import { createOrderApi } from '../services/orderService';
import { initiateRazorpayPayment } from '../services/paymentService';
import { addOrder as addOrderMock, saveLastOrder } from '../services/mockAuth';
import { fetchAvailableCouponsApi, validateCouponApi } from '../services/couponService';

function Cart() {
  const navigate = useNavigate();
  const { items, clearCart } = useCart();
  const { user, isAuthenticated, updateProfile, addOrder: authAddOrder } = useAuth();
  const isNavigatingRef = useRef(false);

  const [enabledCharges, setEnabledCharges] = useState([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Coupon States
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Address state derived from authenticated user profile or local session
  const [selectedAddress, setSelectedAddress] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadInitialData() {
      try {
        const [chargesData, couponsData] = await Promise.all([
          fetchEnabledChargesApi(),
          fetchAvailableCouponsApi(),
        ]);
        if (isMounted) {
          setEnabledCharges(Array.isArray(chargesData) ? chargesData : []);
          setAvailableCoupons(Array.isArray(couponsData) ? couponsData : []);
        }
      } catch (err) {
        if (isMounted) console.error('Error fetching cart initial data:', err);
      }
    }
    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Sync address from user profile
  useEffect(() => {
    if (user?.savedAddressObject || user?.addressDetails) {
      setSelectedAddress(user.savedAddressObject || user.addressDetails);
    } else if (user?.savedAddress || user?.address) {
      const fullAddr = user.savedAddress || user.address;
      const pincode = items[0]?.pincode || '';
      setSelectedAddress({
        fullAddress: fullAddr,
        address: fullAddr,
        pincode,
        mobile: user.mobile || user.phone || '',
        addressType: 'Home',
      });
    }
  }, [user, items]);

  const serviceFee = enabledCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const itemSubtotal = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  const serviceCharges = items.length > 0 ? serviceFee : 0;
  const finalTotal = Math.max(0, Math.round((itemSubtotal - discountAmount + serviceCharges) * 100) / 100);

  const handleApplyCoupon = async (codeToApply) => {
    const targetCode = String(codeToApply || couponInput || '').trim().toUpperCase();
    if (!targetCode) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    setIsValidatingCoupon(true);
    setCouponError('');

    try {
      const res = await validateCouponApi({
        code: targetCode,
        subtotal: itemSubtotal,
        items,
        customerId: user?.id,
        customerPhone: user?.mobile || user?.phone,
      });

      if (res.valid) {
        setAppliedCoupon(res.coupon);
        setDiscountAmount(res.discountAmount || 0);
        setCouponInput(res.coupon.code);
        setCouponError('');
      } else {
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setCouponError(res.message || 'Invalid coupon code');
      }
    } catch (err) {
      setAppliedCoupon(null);
      setDiscountAmount(0);
      setCouponError(err.message || 'Failed to validate coupon');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponInput('');
    setCouponError('');
  };

  const originalSubtotal = items.reduce((sum, item) => {
    const base = item.basePrice || item.price || 0;
    const originalBase = item.originalPrice && item.originalPrice > base
      ? item.originalPrice
      : base;
    return sum + (originalBase + (item.addOnPrice || 0)) * (item.quantity || 1);
  }, 0);

  const totalSavings = originalSubtotal > itemSubtotal ? originalSubtotal - itemSubtotal : 0;

  const handleSaveAddress = async (savedAddrObj) => {
    setIsSavingAddress(true);
    setAddressError('');

    try {
      if (user && user.id) {
        const res = await updateCustomerProfileApi({
          savedAddress: savedAddrObj.fullAddress || savedAddrObj.address,
          savedAddressObject: savedAddrObj,
          pincode: savedAddrObj.pincode,
        });

        if (res.ok && res.user) {
          updateProfile(res.user);
        }
      }

      setSelectedAddress(savedAddrObj);
      setIsDrawerOpen(false);
    } catch (err) {
      console.error('Error saving delivery address:', err);
      setAddressError('Failed to save address. Please try again.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleProceedToPayment = async () => {
    if (isSubmitting) return;
    setAddressError('');
    setSubmitError('');

    // 1. Customer Authentication Check
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/cart' }, autoPay: true } });
      return;
    }

    // 2. Validate Cart Items
    if (items.length === 0) {
      setSubmitError('Your cart is empty. Add a decoration package before proceeding.');
      return;
    }

    // 3. Validate Delivery Address & Pincode
    if (!selectedAddress || (!selectedAddress.fullAddress && !selectedAddress.address)) {
      setAddressError('Please add your delivery address to continue.');
      setIsDrawerOpen(true);
      return;
    }

    const pin = (selectedAddress.pincode || items[0]?.pincode || '').replace(/\D/g, '');
    if (!pin || pin.length !== 6) {
      setAddressError('Please provide a valid 6-digit delivery pincode.');
      setIsDrawerOpen(true);
      return;
    }

    const serviceability = checkPincodeServiceability(pin);
    if (!serviceability.isServiceable) {
      setAddressError(serviceability.message || 'Decoration service is unavailable at this delivery pincode.');
      return;
    }

    // 4. Validate Amount
    if (finalTotal <= 0) {
      setSubmitError('Invalid booking total. Please re-select package options.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderRemarks = items
        .map((i) => i.remarks || i.customization?.remarks)
        .filter(Boolean)
        .join('; ');

      const firstCartItem = items[0] || {};
      const selectedDate = firstCartItem.date || firstCartItem.scheduledDate || firstCartItem.eventDate || '';
      const selectedTime = firstCartItem.time || firstCartItem.scheduledTime || firstCartItem.timeSlot || '';

      const customerName = user?.fullName || user?.name || selectedAddress?.name || 'Customer';
      const customerMobile =
        user?.mobile ||
        user?.phone ||
        user?.customerMobile ||
        selectedAddress?.mobile ||
        selectedAddress?.phone ||
        user?.savedAddressObject?.mobile ||
        user?.addressDetails?.mobile ||
        '';
      const customerEmail = user?.email || '';

      const fullAddressStr = selectedAddress?.fullAddress || selectedAddress?.address || '';

      const orderId = `DFC-${Date.now().toString().slice(-6)}`;
      const orderPayload = {
        id: orderId,
        orderId,
        customerId: user?.id || null,
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        customerEmail: customerEmail.trim(),
        deliveryAddress: fullAddressStr.trim(),
        address: fullAddressStr.trim(),
        landmark: (selectedAddress?.landmark || '').trim(),
        city: (selectedAddress?.city || 'Delhi NCR').trim(),
        state: (selectedAddress?.state || 'Delhi').trim(),
        pincode: pin.trim(),
        scheduledDate: selectedDate,
        eventDate: selectedDate,
        date: selectedDate,
        scheduledTime: selectedTime,
        timeSlot: selectedTime,
        time: selectedTime,
        items: JSON.parse(JSON.stringify(items)),
        subtotal: itemSubtotal,
        couponCode: appliedCoupon?.code || null,
        coupon_code: appliedCoupon?.code || null,
        couponId: appliedCoupon?.id || null,
        coupon_id: appliedCoupon?.id || null,
        discountAmount: discountAmount || 0,
        discount_amount: discountAmount || 0,
        total: finalTotal,
        serviceCharges: serviceCharges,
        charges: [...enabledCharges],
        paymentStatus: 'PAYMENT_INITIATED',
        bookingStatus: 'ORDER_RECEIVED',
        remarks: orderRemarks,
        customization: {
          landmark: (selectedAddress?.landmark || '').trim(),
          remarks: orderRemarks,
        },
        reviewMessage: 'DecorFesto will review your booking shortly and confirm the next step with you.',
        createdAt: new Date().toISOString(),
      };

      // 5. Create Order in Production MySQL Database FIRST
      let activeOrder = null;
      try {
        activeOrder = await createOrderApi(orderPayload, {
          fullName: customerName.trim(),
          mobile: customerMobile.trim(),
          email: customerEmail.trim(),
          savedAddress: fullAddressStr.trim(),
        });
      } catch (orderErr) {
        console.error('Production order creation failed:', orderErr);
        setIsSubmitting(false);
        setSubmitError(orderErr?.message || 'Failed to initialize booking on server. Please try again.');
        return;
      }

      if (!activeOrder || !activeOrder.id) {
        setIsSubmitting(false);
        setSubmitError('Unable to create booking record in production database. Payment aborted.');
        return;
      }

      // 6. Save local state
      saveLastOrder(activeOrder);
      if (typeof authAddOrder === 'function') {
        authAddOrder(activeOrder, {
          fullName: customerName.trim(),
          mobile: customerMobile.trim(),
          email: customerEmail.trim(),
          savedAddress: fullAddressStr.trim(),
        });
      } else {
        addOrderMock(activeOrder, {
          fullName: customerName.trim(),
          mobile: customerMobile.trim(),
          email: customerEmail.trim(),
          savedAddress: fullAddressStr.trim(),
        });
      }

      // 7. Initiate Razorpay Checkout directly from /cart
      initiateRazorpayPayment({
        order: activeOrder,
        customer: {
          fullName: customerName.trim(),
          email: customerEmail.trim(),
          mobile: customerMobile.trim(),
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
          setSubmitError(errMessage || 'Razorpay payment was not completed. Click Pay & Confirm Booking to try again.');
        },
        onDismiss: () => {
          setIsSubmitting(false);
          setSubmitError('Payment modal was closed before completion. Click Pay & Confirm Booking to retry.');
        },
      });
    } catch (err) {
      console.error('Error initiating payment:', err);
      setIsSubmitting(false);
      setSubmitError(err?.message || 'Failed to initialize payment. Please try again.');
    }
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">YOUR CART</span>
          <h1>Review your decoration booking</h1>
          <p>Check your package selections, delivery address, and price breakup before proceeding to checkout.</p>
        </div>

        {items.length === 0 && !isSubmitting && !isNavigatingRef.current ? (
          <div className="empty-state card-panel" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
            <h2>Your cart is empty</h2>
            <p>Add a decoration package to continue your celebration booking journey.</p>
            <Link to="/catalog" className="button" style={{ marginTop: '16px' }}>
              Explore Decorations
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* DELIVERY ADDRESS SECTION */}
              <article className="card-panel" style={{ borderRadius: '16px', padding: '24px', background: '#ffffff', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Delivery Address
                  </h2>
                  {selectedAddress ? (
                    <button
                      type="button"
                      className="button button--ghost button--small"
                      onClick={() => setIsDrawerOpen(true)}
                      style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button button--small"
                      onClick={() => setIsDrawerOpen(true)}
                      style={{ padding: '6px 16px', fontSize: '0.85rem', fontWeight: '700' }}
                    >
                      Add Address
                    </button>
                  )}
                </div>

                {selectedAddress ? (
                  <div style={{ fontSize: '0.92rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{selectedAddress.addressType === 'Office' ? '🏢 Office' : selectedAddress.addressType === 'Other' ? '📍 Other' : '🏠 Home'}</span>
                    </div>
                    <div style={{ color: '#0f172a', fontWeight: '600', marginTop: '2px' }}>
                      {selectedAddress.flatNo ? `${selectedAddress.flatNo}, ` : ''}{selectedAddress.fullAddress || selectedAddress.address}
                    </div>
                    {selectedAddress.landmark && (
                      <div style={{ color: '#64748b', fontSize: '0.88rem' }}>
                        Landmark: {selectedAddress.landmark}
                      </div>
                    )}
                    <div style={{ color: '#475569', fontWeight: '600' }}>
                      {selectedAddress.city || 'Delhi NCR'}, {selectedAddress.state || 'Delhi'} - {selectedAddress.pincode || items[0]?.pincode}
                    </div>
                    {selectedAddress.mobile && (
                      <div style={{ color: '#0369a1', fontWeight: '600', marginTop: '2px' }}>
                        Mobile: {selectedAddress.mobile}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.95rem' }}>📍 No address selected</div>
                      <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>Add your delivery address to continue with checkout.</p>
                    </div>
                  </div>
                )}

                {addressError && (
                  <div className="admin-error-banner" style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                    ✕ {addressError}
                  </div>
                )}
              </article>

              {/* CART ITEMS LIST */}
              <div className="cart-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {items.map((item) => (
                  <CartItem key={item.key} item={item} />
                ))}
              </div>
            </div>

            <aside className="card-panel sticky-summary" style={{ borderRadius: '16px', padding: '24px', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="card-panel__header" style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Price Summary</h2>
              </div>

              {totalSavings > 0 && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🎉 You're saving ₹{totalSavings.toLocaleString('en-IN')} on this booking!
                </div>
              )}

              {/* COUPON SECTION */}
              <div className="cart-coupon-section" style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🏷️ <span>Coupons & Offers</span>
                </div>

                {appliedCoupon ? (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '800', color: '#166534', fontSize: '0.95rem' }}>
                        🎉 {appliedCoupon.code} APPLIED
                      </div>
                      <div style={{ color: '#15803d', fontSize: '0.82rem', marginTop: '2px' }}>
                        Saving ₹{discountAmount.toLocaleString('en-IN')} on this order
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      style={{ background: 'none', border: '1px solid #bbf7d0', color: '#dc2626', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <form onSubmit={(e) => { e.preventDefault(); handleApplyCoupon(); }} style={{ display: 'flex', gap: '8px' }}>
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', textTransform: 'uppercase' }}
                      />
                      <button
                        type="submit"
                        disabled={isValidatingCoupon || !couponInput.trim()}
                        style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700', fontSize: '0.88rem', cursor: isValidatingCoupon || !couponInput.trim() ? 'not-allowed' : 'pointer', opacity: isValidatingCoupon || !couponInput.trim() ? 0.6 : 1 }}
                      >
                        {isValidatingCoupon ? 'Applying...' : 'Apply'}
                      </button>
                    </form>

                    {couponError && (
                      <div style={{ color: '#dc2626', fontSize: '0.82rem', marginTop: '6px', fontWeight: '600' }}>
                        ✕ {couponError}
                      </div>
                    )}

                    {availableCoupons.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                          Available Coupons
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {availableCoupons.map((c) => (
                            <div
                              key={c.id || c.code}
                              style={{ border: '1px dashed #cbd5e1', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            >
                              <div>
                                <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.85rem' }}>{c.code}</span>
                                {c.description && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.description}</div>}
                              </div>
                              <button
                                type="button"
                                onClick={() => { setCouponInput(c.code); handleApplyCoupon(c.code); }}
                                style={{ background: 'none', border: 'none', color: '#e11d48', fontWeight: '800', fontSize: '0.82rem', cursor: 'pointer' }}
                              >
                                APPLY
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <PriceSummaryBreakup
                items={items}
                enabledCharges={enabledCharges}
                totalSavings={totalSavings}
                originalSubtotal={originalSubtotal}
                appliedCoupon={appliedCoupon}
                discountAmount={discountAmount}
              />

              <p className="summary-note" style={{ fontSize: '0.82rem', color: '#64748b', margin: '16px 0' }}>
                Your celebration date & slot are reserved upon completing checkout.
              </p>

              {submitError && (
                <div className="admin-error-banner" style={{ marginTop: '12px', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                  ✕ {submitError}
                </div>
              )}

              <button
                type="button"
                className={`button button--full${isSubmitting ? ' button--disabled' : ''}`}
                onClick={handleProceedToPayment}
                disabled={isSubmitting || items.length === 0}
                style={{ padding: '14px 20px', fontSize: '1.05rem', fontWeight: '800' }}
              >
                {isSubmitting ? 'Preparing secure payment…' : `Pay ₹${finalTotal.toLocaleString('en-IN')} & Confirm Booking →`}
              </button>
            </aside>
          </div>
        )}

        {/* ADD / EDIT ADDRESS DRAWER */}
        <AddAddressDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          initialData={selectedAddress || { pincode: items[0]?.pincode || '' }}
          registeredMobile={user?.mobile || user?.phone || ''}
          onSaveAddress={handleSaveAddress}
          isSaving={isSavingAddress}
        />
      </section>
    </main>
  );
}

export default Cart;
