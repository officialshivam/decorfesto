import { Navigate } from 'react-router-dom';

function Checkout() {
  return <Navigate to="/cart" replace />;
}

function LegacyCheckout() {

  const serviceFee = enabledCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const subtotal = items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
  const serviceCharges = items.length > 0 ? serviceFee : 0;
  const total = subtotal + serviceCharges;

  // Validate address and pincode readiness
  const effectivePincode = (deliveryAddr?.pincode || items[0]?.pincode || '').replace(/\D/g, '');
  const pincodeCheck = effectivePincode.length === 6 ? checkPincodeServiceability(effectivePincode) : { isServiceable: false };

  const hasValidAddress = Boolean(
    deliveryAddr &&
    (deliveryAddr.fullAddress || deliveryAddr.address) &&
    effectivePincode.length === 6 &&
    pincodeCheck.isServiceable
  );

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;
    setSubmitError('');

    if (items.length === 0) {
      setSubmitError('Your cart is empty. Add a decoration package before checkout.');
      return;
    }

    if (!hasValidAddress) {
      setSubmitError('Please add a valid delivery address with a serviceable pincode before continuing.');
      return;
    }

    if (total <= 0) {
      setSubmitError('Invalid order total. Please re-select your package.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderRemarks = items
        .map((i) => i.remarks || i.customization?.remarks)
        .filter(Boolean)
        .join('; ');

      const calculatedSubtotal = subtotal > 0
        ? subtotal
        : items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0);
      const activeChargesList = enabledCharges;
      const chargesTotal = serviceCharges;
      const finalTotal = calculatedSubtotal + chargesTotal;

      const firstCartItem = items[0] || {};
      const selectedDate = firstCartItem.date || firstCartItem.scheduledDate || firstCartItem.eventDate || '';
      const selectedTime = firstCartItem.time || firstCartItem.scheduledTime || firstCartItem.timeSlot || '';

      const customerName = user?.fullName || user?.name || deliveryAddr?.name || 'Customer';
      const customerMobile = user?.mobile || user?.phone || deliveryAddr?.mobile || '';
      const customerEmail = user?.email || '';

      const fullAddressStr = deliveryAddr?.fullAddress || deliveryAddr?.address || '';

      const orderId = `DFC-${Date.now().toString().slice(-6)}`;
      const order = {
        id: orderId,
        orderId,
        customerId: user?.id || null,
        customerName: customerName.trim(),
        customerMobile: customerMobile.trim(),
        customerEmail: customerEmail.trim(),
        deliveryAddress: fullAddressStr.trim(),
        address: fullAddressStr.trim(),
        landmark: (deliveryAddr?.landmark || '').trim(),
        city: (deliveryAddr?.city || 'Delhi NCR').trim(),
        state: (deliveryAddr?.state || 'Delhi').trim(),
        pincode: effectivePincode.trim(),
        scheduledDate: selectedDate,
        eventDate: selectedDate,
        date: selectedDate,
        scheduledTime: selectedTime,
        timeSlot: selectedTime,
        time: selectedTime,
        items: JSON.parse(JSON.stringify(items)),
        subtotal: calculatedSubtotal,
        total: finalTotal,
        serviceCharges: chargesTotal,
        charges: [...activeChargesList],
        paymentStatus: 'PAYMENT_INITIATED',
        bookingStatus: 'ORDER_RECEIVED',
        remarks: orderRemarks,
        customization: {
          landmark: (deliveryAddr?.landmark || '').trim(),
          remarks: orderRemarks,
        },
        reviewMessage: 'DecorFesto will review your booking shortly and confirm the next step with you.',
        createdAt: new Date().toISOString(),
      };

      // 1. Persist order to production MySQL database FIRST
      let activeOrder = null;
      try {
        activeOrder = await createOrderApi(order, {
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

      // 2. Save local UI fallback
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

      // 3. Initiate Razorpay Checkout with server-persisted order ID
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
          setSubmitError(errMessage || 'Razorpay payment was not completed. Click Pay & Complete Booking to try again.');
        },
        onDismiss: () => {
          setIsSubmitting(false);
          setSubmitError('Payment modal was closed before completion. Click Pay & Complete Booking to retry.');
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
          <div className="card-panel empty-state" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
            <h1>Your cart is empty</h1>
            <p>Please select a decoration package from our catalog before proceeding to checkout.</p>
            <Link to="/catalog" className="button" style={{ marginTop: '16px' }}>Browse Catalog</Link>
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
          <h1>You're ready to complete your booking</h1>
          <p>Please confirm your customer profile, delivery address, and price summary before payment.</p>
        </div>

        <div className="checkout-layout">
          <div className="checkout-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. CUSTOMER CONFIRMATION CARD */}
            <article className="card-panel" style={{ borderRadius: '16px', padding: '24px', background: '#ffffff', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Customer
                </h2>
                {isAuthenticated && (
                  <span style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: '700', background: '#f0fdf4', padding: '4px 10px', borderRadius: '6px' }}>
                    ✓ Authenticated
                  </span>
                )}
              </div>

              <div style={{ fontSize: '0.95rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>
                  {user?.fullName || user?.name || deliveryAddr?.name || 'Customer'}
                </div>
                {user?.mobile || user?.phone || deliveryAddr?.mobile ? (
                  <div><strong>Mobile:</strong> {user?.mobile || user?.phone || deliveryAddr?.mobile}</div>
                ) : null}
                {user?.email && (
                  <div style={{ color: '#64748b' }}><strong>Email:</strong> {user.email}</div>
                )}
              </div>
            </article>

            {/* 2. DELIVERY ADDRESS CONFIRMATION CARD */}
            <article className="card-panel" style={{ borderRadius: '16px', padding: '24px', background: '#ffffff', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Delivery Address
                </h2>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => navigate('/cart')}
                  style={{ padding: '6px 14px', fontSize: '0.85rem', fontWeight: '700' }}
                >
                  Change Address
                </button>
              </div>

              {deliveryAddr && (deliveryAddr.fullAddress || deliveryAddr.address) ? (
                <div style={{ fontSize: '0.92rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontWeight: '800', color: '#0f172a' }}>
                    {deliveryAddr.addressType === 'Office' ? '🏢 Office' : deliveryAddr.addressType === 'Other' ? '📍 Other' : '🏠 Home'}
                  </div>
                  <div style={{ color: '#0f172a', fontWeight: '600', marginTop: '2px' }}>
                    {deliveryAddr.flatNo ? `${deliveryAddr.flatNo}, ` : ''}{deliveryAddr.fullAddress || deliveryAddr.address}
                  </div>
                  {deliveryAddr.landmark && (
                    <div style={{ color: '#64748b', fontSize: '0.88rem' }}>
                      Landmark: {deliveryAddr.landmark}
                    </div>
                  )}
                  <div style={{ color: '#475569', fontWeight: '600' }}>
                    {deliveryAddr.city || 'Delhi NCR'}, {deliveryAddr.state || 'Delhi'} - {effectivePincode}
                  </div>
                  {deliveryAddr.mobile && (
                    <div style={{ color: '#0369a1', fontWeight: '600', marginTop: '2px' }}>
                      Mobile: {deliveryAddr.mobile}
                    </div>
                  )}
                  {pincodeCheck.isServiceable && (
                    <small style={{ color: '#16a34a', fontWeight: '700', marginTop: '6px', display: 'block' }}>
                      ✓ Service area available
                    </small>
                  )}
                </div>
              ) : (
                <div>
                  <div style={{ color: '#dc2626', fontWeight: '700', fontSize: '0.95rem' }}>📍 No delivery address selected</div>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '4px 0 12px 0' }}>Please add a delivery address to continue with your booking.</p>
                  <button
                    type="button"
                    className="button button--small"
                    onClick={() => navigate('/cart')}
                  >
                    Add Delivery Address →
                  </button>
                </div>
              )}
            </article>

            {/* 3. BOOKED ITEMS LOGISTICS SUMMARY */}
            <article className="card-panel" style={{ borderRadius: '16px', padding: '24px', background: '#ffffff', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div style={{ marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Booking Logistics
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {items.map((item) => {
                  const basePrice = item.basePrice || item.price || 0;
                  return (
                    <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block' }}>
                          {item.productName} {item.quantity > 1 ? `(×${item.quantity})` : ''}
                        </strong>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          📅 {formatDisplayDate(item.date)} · ⏰ {item.time} · 📍 Pincode: {item.pincode || effectivePincode}
                        </span>
                      </div>
                      <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>
                        ₹{(basePrice * item.quantity).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </article>
          </div>

          {/* RIGHT COLUMN: STICKY SUMMARY & PAYMENT ACTION */}
          <aside className="card-panel sticky-summary" style={{ borderRadius: '16px', padding: '24px', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
            <div className="card-panel__header" style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Booking Summary</h2>
            </div>

            <PriceSummaryBreakup items={items} enabledCharges={enabledCharges} />

            {submitError && (
              <div className="admin-error-banner" style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem' }}>
                ✕ {submitError}
              </div>
            )}

            <button
              type="button"
              className={`button button--full${isSubmitting ? ' button--disabled' : ''}`}
              onClick={handlePlaceOrder}
              disabled={isSubmitting || items.length === 0 || !hasValidAddress}
              style={{ marginTop: '20px', padding: '14px 20px', fontSize: '1.05rem', fontWeight: '800' }}
            >
              {isSubmitting ? 'Processing Order…' : 'Pay & Complete Booking'}
            </button>

            {!hasValidAddress && (
              <p style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: '600', marginTop: '8px', textAlign: 'center' }}>
                Please add a valid delivery address before continuing.
              </p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

export default Checkout;
