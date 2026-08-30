import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';
import { fetchVendorOrdersApi } from '../services/vendorOrderService';

function getStatusBadge(status) {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'VENDOR_ASSIGNED':
      return { label: 'Pending Acceptance', bg: '#fef3c7', text: '#d97706' };
    case 'VENDOR_ACCEPTED':
      return { label: 'Accepted', bg: '#e0f2fe', text: '#0284c7' };
    case 'IN_PROGRESS':
      return { label: 'In Preparation', bg: '#e0e7ff', text: '#4338ca' };
    case 'READY_FOR_SETUP':
      return { label: 'Ready for Setup', bg: '#fef9c3', text: '#ca8a04' };
    case 'COMPLETED':
      return { label: 'Completed', bg: '#dcfce7', text: '#15803d' };
    case 'VENDOR_DECLINED':
      return { label: 'Declined', bg: '#fee2e2', text: '#b91c1c' };
    default:
      return { label: status || 'Assigned', bg: '#f1f5f9', text: '#475569' };
  }
}

export default function VendorDashboard() {
  const { vendorUser } = useVendorAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      if (vendorUser?.id) {
        setLoading(true);
        setError(null);
        const res = await fetchVendorOrdersApi(vendorUser.id);
        if (res.ok) {
          setOrders(res.orders || []);
        } else {
          setOrders([]);
          setError(res.error || 'Failed to load assigned orders.');
        }
        setLoading(false);
      }
    }
    loadData();
  }, [vendorUser?.id]);

  const assignedCount = orders.length;
  const pendingCount = orders.filter((o) => {
    const s = String(o.bookingStatus || '').toUpperCase();
    return s === 'VENDOR_ASSIGNED' || s === 'ASSIGNED_TO_VENDOR' || s === 'CONFIRMED' || s === 'CREATED' || s === 'ORDER RECEIVED';
  }).length;
  const inProgressCount = orders.filter((o) => {
    const s = String(o.bookingStatus || '').toUpperCase();
    return s === 'VENDOR_ACCEPTED' || s === 'IN_PROGRESS';
  }).length;
  const readyCount = orders.filter((o) => String(o.bookingStatus || '').toUpperCase() === 'READY_FOR_SETUP').length;
  const completedCount = orders.filter((o) => String(o.bookingStatus || '').toUpperCase() === 'COMPLETED').length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = orders.filter((o) => o.scheduledDate === todayStr || o.date === todayStr);
  const upcomingEvents = orders.filter((o) => {
    const dt = o.scheduledDate || o.date || '';
    return dt && dt > todayStr && (o.bookingStatus || '').toUpperCase() !== 'COMPLETED';
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && (
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', color: '#be123c', padding: '16px 20px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{error}</span>
          <Link to="/vendor/login" style={{ background: '#be123c', color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' }}>Re-login</Link>
        </div>
      )}
      {/* HEADER SECTION */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '28px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        }}
      >
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#fda4af', fontWeight: '800' }}>
            PARTNER DASHBOARD
          </span>
          <h1 style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: '900' }}>
            Welcome back, {vendorUser?.name || 'Partner'}!
          </h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '0.92rem' }}>
            {vendorUser?.contactName ? `Contact: ${vendorUser.contactName} | ` : ''}Phone: {vendorUser?.phone || 'N/A'}
          </p>
        </div>

        <Link
          to="/vendor/orders"
          style={{
            background: '#e11d48',
            color: '#fff',
            textDecoration: 'none',
            padding: '12px 24px',
            borderRadius: '10px',
            fontWeight: '700',
            fontSize: '0.95rem',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)',
          }}
        >
          View All Assigned Orders →
        </Link>
      </div>

      {/* METRICS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Assigned Orders</span>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0f172a', marginTop: '4px' }}>{assignedCount}</div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', border: '1px solid #fde68a', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#d97706', textTransform: 'uppercase' }}>Pending Acceptance</span>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#b45309', marginTop: '4px' }}>{pendingCount}</div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', border: '1px solid #c7d2fe', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4338ca', textTransform: 'uppercase' }}>In Progress</span>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#3730a3', marginTop: '4px' }}>{inProgressCount}</div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', border: '1px solid #fef08a', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ca8a04', textTransform: 'uppercase' }}>Ready for Setup</span>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#a16207', marginTop: '4px' }}>{readyCount}</div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', border: '1px solid #bbf7d0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#15803d', textTransform: 'uppercase' }}>Completed</span>
          <div style={{ fontSize: '2rem', fontWeight: '900', color: '#166534', marginTop: '4px' }}>{completedCount}</div>
        </div>
      </div>

      {/* TODAY'S EVENTS SECTION */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📅 Today's Events ({todayEvents.length})
        </h2>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading today's schedule...</p>
        ) : todayEvents.length === 0 ? (
          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
            No decoration setups scheduled for today.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todayEvents.map((item) => {
              const badge = getStatusBadge(item.bookingStatus);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#fafafa',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>
                      {item.decorationName || 'Decoration Package'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                      Order ID: <strong>{item.id}</strong> | Client: <strong>{item.customerName}</strong> ({item.customerPhone})
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                      ⏰ <strong>{item.scheduledTime || item.time || '10:00 AM'}</strong> | 📍 {item.deliveryAddress || item.address || 'Address provided on order details'}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', background: badge.bg, color: badge.text, padding: '4px 10px', borderRadius: '6px' }}>
                      {badge.label}
                    </span>
                    <Link
                      to={`/vendor/orders/${item.id}`}
                      style={{
                        background: '#0f172a',
                        color: '#fff',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                      }}
                    >
                      Manage Order →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* UPCOMING EVENTS SECTION */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🚀 Upcoming Events ({upcomingEvents.length})
        </h2>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading upcoming events...</p>
        ) : upcomingEvents.length === 0 ? (
          <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
            No upcoming events scheduled.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingEvents.slice(0, 5).map((item) => {
              const badge = getStatusBadge(item.bookingStatus);
              return (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1rem' }}>
                      {item.decorationName || 'Decoration Package'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                      Date: <strong>{item.scheduledDate || item.date}</strong> ({item.scheduledTime || item.time}) | Order ID: <strong>{item.id}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', background: badge.bg, color: badge.text, padding: '4px 10px', borderRadius: '6px' }}>
                      {badge.label}
                    </span>
                    <Link
                      to={`/vendor/orders/${item.id}`}
                      style={{
                        background: '#f1f5f9',
                        color: '#334155',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '700',
                      }}
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
