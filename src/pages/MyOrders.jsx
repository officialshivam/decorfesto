import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrdersApi, getUserOrdersApi } from '../services/orderService';
import { formatDisplayDate } from '../utils/dateTimeUtils';

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

function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadOrders() {
      try {
        const fetchedOrders = await getUserOrdersApi();
        if (isMounted) {
          setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
        }
      } catch (err) {
        console.debug('Unable to fetch backend orders for customer:', err);
      }
    }
    loadOrders();
    return () => { isMounted = false; };
  }, [user]);

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">My orders</span>
          <h1>Booking history</h1>
          <p>Your recent decoration bookings and their current status.</p>
        </div>

        {orders.length === 0 ? (
          <div className="card-panel empty-state">
            <h2>No orders yet</h2>
            <p>Your bookings will appear here once you place an order.</p>
            <Link to="/catalog" className="button">Browse packages</Link>
          </div>
        ) : (
          <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {orders.map((order) => {
              const bookingId = order.orderId || order.id || 'DFC-000000';
              const transactionId = order.razorpayPaymentId || order.transactionId || (order.paymentStatus?.includes('PAID') ? `pay_test_${bookingId.replace(/\D/g, '') || '18413697'}` : 'Pending');
              const packageName = order.decorationName || order.items?.[0]?.productName || 'DecorFesto Package';
              const eventDate = order.date || order.items?.[0]?.date || 'Pending';
              const eventTime = order.time || order.items?.[0]?.time || 'Pending';
              const isPaid = (order.paymentStatus || '').toUpperCase().includes('PAID');

              return (
                <div key={order.id} className="card-panel order-card" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                  <div className="order-card__top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '16px', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--heading, #0f172a)', margin: 0 }}>{packageName}</h3>
                      <span style={{ fontSize: '0.88rem', color: 'var(--text-muted, #64748b)', fontWeight: '600', marginTop: '4px', display: 'inline-block' }}>
                        Booking ID: <strong style={{ color: '#0f172a' }}>{bookingId}</strong>
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="status-pill" style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', fontSize: '0.82rem' }}>
                        ● {order.bookingStatus || 'ORDER RECEIVED'}
                      </span>
                      <span className="status-pill" style={{ background: isPaid ? '#e0f2fe' : '#fef3c7', color: isPaid ? '#0369a1' : '#92400e', border: isPaid ? '1px solid #bae6fd' : '1px solid #fde68a', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', fontSize: '0.82rem' }}>
                        ● {order.paymentStatus || 'PENDING'}
                      </span>
                    </div>
                  </div>

                  <div className="summary-box" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Transaction ID</span>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a', wordBreak: 'break-all' }}>
                        {transactionId}
                        <CopyButton text={transactionId} />
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Payment Method</span>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>Razorpay</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Event Date</span>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{formatDisplayDate(eventDate)}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Event Time</span>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>{eventTime}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block' }}>Amount Paid</span>
                      <strong style={{ fontSize: '1.1rem', color: 'var(--accent, #e11d48)', fontWeight: '800' }}>₹{(order.total || 0).toLocaleString('en-IN')}</strong>
                    </div>
                  </div>

                  <div className="auth-actions" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link to={`/my-orders/${order.id}`} className="button button--ghost" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default MyOrders;
