import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserOrdersApi } from '../services/orderService';
import { formatDisplayDate } from '../utils/dateTimeUtils';

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
          <p>Your recent decoration bookings and summary history.</p>
        </div>

        {orders.length === 0 ? (
          <div className="card-panel empty-state">
            <h2>No orders yet</h2>
            <p>Your bookings will appear here once you place an order.</p>
            <Link to="/catalog" className="button">Browse packages</Link>
          </div>
        ) : (
          <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {orders.map((order) => {
              const bookingId = order.orderId || order.id || 'DFC-000000';
              const packageName = order.decorationName || order.items?.[0]?.productName || 'DecorFesto Package';
              const rawDate = order.scheduledDate || order.date || order.items?.[0]?.date;
              const rawTime = order.scheduledTime || order.time || order.items?.[0]?.time;
              const eventDate = rawDate ? formatDisplayDate(rawDate) : null;
              const eventTime = rawTime ? String(rawTime).trim() : null;
              const isPaid = (order.paymentStatus || '').toUpperCase().includes('PAID');
              const totalAmount = order.total || order.totalAmount || 0;

              return (
                <div key={order.id} className="card-panel order-card" style={{ padding: '20px 24px', borderRadius: '16px', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                  <div className="order-card__top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border, #f1f5f9)', paddingBottom: '14px', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--heading, #0f172a)', margin: 0 }}>{packageName}</h3>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontWeight: '600', marginTop: '4px', display: 'inline-block' }}>
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

                  <div className="summary-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: '#f8fafc', padding: '14px 18px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Amount</span>
                        <strong style={{ fontSize: '1.15rem', color: 'var(--accent, #e11d48)', fontWeight: '800' }}>₹{totalAmount.toLocaleString('en-IN')}</strong>
                      </div>

                      {eventDate && (
                        <div>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event Date</span>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '700' }}>{eventDate}</strong>
                        </div>
                      )}

                      {eventTime && (
                        <div>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Event Time</span>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '700' }}>{eventTime}</strong>
                        </div>
                      )}
                    </div>

                    <Link to={`/my-orders/${order.id}`} className="button button--ghost" style={{ padding: '8px 18px', fontSize: '0.9rem', fontWeight: '700', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', textDecoration: 'none' }}>
                      View Full Details →
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
