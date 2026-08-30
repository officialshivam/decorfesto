import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCustomerOrderByIdApi } from '../services/orderService';
import { formatDisplayDate } from '../utils/dateTimeUtils';
import { formatBookingStatus } from '../utils/statusUtils';
import CelebrationJourney from '../components/CelebrationJourney';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  if (!text || text === 'Pending') return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        padding: '2px 8px',
        fontSize: '0.75rem',
        borderRadius: '4px',
        border: '1px solid #cbd5e1',
        background: copied ? '#e6f4ea' : '#f8fafc',
        color: copied ? '#137333' : '#475569',
        cursor: 'pointer',
        fontWeight: '600',
        marginLeft: '6px',
        transition: 'all 0.2s ease',
      }}
      title="Copy Transaction ID"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function MyOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusCode, setStatusCode] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadOrder() {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        setStatusCode(null);
        const res = await getCustomerOrderByIdApi(id);
        if (isMounted) {
          if (res.ok && res.order) {
            setOrder(res.order);
            setStatusCode(200);
          } else {
            setOrder(null);
            setStatusCode(res.statusCode || 404);
            if (res.statusCode === 403) {
              setError("You don't have permission to view this booking.");
            } else if (res.statusCode === 401) {
              setError('Please log in to view this booking.');
            } else {
              setError(res.error || 'The requested booking could not be found.');
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading order details:', err);
          setError('Unable to load booking details from server. Please try again.');
          setStatusCode(500);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadOrder();
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (!user) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>Order details</h1>
            <p>Please log in to see this order.</p>
          </div>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state" style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#64748b', fontSize: '16px' }}>Loading booking details from server...</p>
          </div>
        </section>
      </main>
    );
  }

  if (statusCode === 403 || error === "You don't have permission to view this booking.") {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state" style={{ padding: '40px 28px', textAlign: 'center', borderRadius: '16px', border: '1px solid #fecdd3', background: '#fff1f2' }}>
            <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '12px' }}>🔒</span>
            <h1 style={{ fontSize: '1.4rem', color: '#9f1239', margin: '0 0 8px' }}>Access Denied</h1>
            <p style={{ color: '#be123c', fontSize: '0.98rem', fontWeight: '600', margin: '0 0 20px', lineHeight: '1.5' }}>
              You don't have permission to view this booking.
            </p>
            <Link to="/my-orders" className="button" style={{ background: '#be123c', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '10px', fontWeight: '700', textDecoration: 'none' }}>
              ← Back to My Orders
            </Link>
          </div>
        </section>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>Order not found</h1>
            <p>{error || 'The requested booking could not be found.'}</p>
            <Link to="/my-orders" className="button" style={{ marginTop: '12px' }}>Back to orders</Link>
          </div>
        </section>
      </main>
    );
  }

  const firstItem = order.items?.[0] || {};
  const bookingId = order.orderId || order.id || 'DFC-000000';
  const transactionId = order.razorpayPaymentId || order.transactionId || (order.paymentStatus?.includes('PAID') ? `pay_test_${bookingId.replace(/\D/g, '') || '18413697'}` : 'Pending');
  const packageName = order.decorationName || firstItem.productName || 'DecorFesto Package';
  const rawDate =
    order.scheduledDate ||
    order.eventDate ||
    order.date ||
    order.event_date ||
    firstItem.scheduledDate ||
    firstItem.eventDate ||
    firstItem.date ||
    firstItem.event_date;

  const rawTime =
    order.scheduledTime ||
    order.timeSlot ||
    order.time ||
    order.time_slot ||
    firstItem.scheduledTime ||
    firstItem.timeSlot ||
    firstItem.time ||
    firstItem.time_slot;
  const eventDate = rawDate ? formatDisplayDate(rawDate) : 'Pending';
  const eventTime = rawTime ? String(rawTime).trim() : 'Pending';
  const deliveryAddress = order.address || order.deliveryAddress || 'Pending';
  const pincode = order.pincode || firstItem.pincode || 'Pending';

  const basePrice = firstItem.basePrice || firstItem.price || order.subtotal || order.total || 0;
  const addOnPrice = firstItem.addOnPrice || 0;
  const serviceCharges = order.serviceCharges || 0;
  const totalAmount = order.total || (basePrice + addOnPrice + serviceCharges);

  const theme = firstItem.customization?.themePalette || firstItem.customization?.balloonTheme || order.theme || 'Signature Theme';
  const colors = firstItem.customization?.balloonColors || firstItem.customization?.petalPalette || order.colors || 'Default Colors';

  const isPaid = (order.paymentStatus || '').toUpperCase().includes('PAID');
  const orderDateObj = order.createdAt ? new Date(order.createdAt) : null;
  const formattedOrderCreated = orderDateObj && !isNaN(orderDateObj.getTime())
    ? orderDateObj.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : 'Recently';

  const customerRemarks = String(order.remarks || firstItem.remarks || firstItem.customization?.remarks || '').trim();

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Booking details</span>
          <h1>{packageName}</h1>
          <p>Complete details and status breakdown for Booking ID <strong>{bookingId}</strong>.</p>
        </div>

        <div className="card-panel" style={{ padding: '28px', borderRadius: '16px', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          {/* HEADER STATUS BAR */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '20px', marginBottom: '24px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Booking Reference</span>
              <h2 style={{ fontSize: '1.4rem', color: '#0f172a', margin: 0, fontWeight: '800' }}>{bookingId}</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span className="status-pill" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: '700', padding: '6px 14px', borderRadius: '20px', fontSize: '0.88rem' }}>
                ● {formatBookingStatus(order.bookingStatus)}
              </span>
              <span className="status-pill" style={{ background: isPaid ? '#e0f2fe' : '#fef3c7', color: isPaid ? '#0369a1' : '#92400e', border: isPaid ? '1px solid #bae6fd' : '1px solid #fde68a', fontWeight: '700', padding: '6px 14px', borderRadius: '20px', fontSize: '0.88rem' }}>
                ● {order.paymentStatus || 'PENDING'}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* 1. DECORATION & CUSTOMIZATION */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#0f172a', marginTop: 0, marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                Decoration & Customization
              </h3>
              <div className="summary-box__row">
                <span>Package</span>
                <strong>{packageName}</strong>
              </div>
              <div className="summary-box__row">
                <span>Theme</span>
                <strong>{theme}</strong>
              </div>
              <div className="summary-box__row">
                <span>Colors</span>
                <strong>{colors}</strong>
              </div>
            </div>

            {/* 2. EVENT & LOCATION DETAILS */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px' }}>
              <h3 style={{ fontSize: '1.05rem', color: '#0f172a', marginTop: 0, marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                Event & Location
              </h3>
              <div className="summary-box__row">
                <span>Event Date</span>
                <strong>{eventDate}</strong>
              </div>
              <div className="summary-box__row">
                <span>Time Slot</span>
                <strong>{eventTime}</strong>
              </div>
              <div className="summary-box__row">
                <span>Pincode</span>
                <strong>{pincode}</strong>
              </div>
              <div className="summary-box__row" style={{ alignItems: 'flex-start', marginTop: '4px' }}>
                <span>Venue Address</span>
                <strong style={{ textAlign: 'right', maxWidth: '180px' }}>{deliveryAddress}</strong>
              </div>
            </div>
          </div>

          {/* SPECIAL REQUESTS / CUSTOMER REMARKS */}
          {customerRemarks ? (
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '16px 20px', borderRadius: '12px', marginBottom: '24px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                💬 Special Requests / Customer Remarks
              </span>
              <p style={{ margin: '6px 0 0', fontSize: '0.95rem', fontWeight: '700', color: '#713f12' }}>
                "{customerRemarks}"
              </p>
            </div>
          ) : null}

          {/* 3. FINANCIAL & TRANSACTION DETAILS */}
          <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#0f172a', marginTop: 0, marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              Payment & Transaction Details
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div>
                <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block' }}>Transaction ID</span>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a', wordBreak: 'break-all' }}>
                  {transactionId}
                  <CopyButton text={transactionId} />
                </strong>
              </div>
              <div>
                <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block' }}>Payment Method</span>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>Razorpay (TEST MODE)</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.82rem', color: '#64748b', display: 'block' }}>Order Created</span>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{formattedOrderCreated}</strong>
              </div>
            </div>
          </div>

          {/* CELEBRATION JOURNEY TRACKER */}
          <CelebrationJourney order={order} />

          {/* 4. PRICE BREAKDOWN */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '12px', marginTop: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.05rem', color: '#0f172a', marginTop: 0, marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              Price Details
            </h3>
            <div className="summary-box__row">
              <span>Base Package Price</span>
              <strong>₹{basePrice.toLocaleString('en-IN')}</strong>
            </div>
            {addOnPrice > 0 && (
              <div className="summary-box__row">
                <span>Add-ons Total</span>
                <strong style={{ color: '#0284c7' }}>+₹{addOnPrice.toLocaleString('en-IN')}</strong>
              </div>
            )}
            {serviceCharges > 0 && (
              <div className="summary-box__row">
                <span>Service Charges</span>
                <strong>₹{serviceCharges.toLocaleString('en-IN')}</strong>
              </div>
            )}
            <div className="summary-box__row pricing-row--total" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '10px' }}>
              <span>Total Amount Paid</span>
              <strong style={{ color: 'var(--accent, #e11d48)', fontSize: '1.3rem' }}>₹{totalAmount.toLocaleString('en-IN')}</strong>
            </div>
          </div>

          <div className="auth-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/my-orders" className="button button--ghost">
              ← Back to Booking History
            </Link>
            <Link to="/catalog" className="button">
              Book Another Package
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MyOrderDetail;
