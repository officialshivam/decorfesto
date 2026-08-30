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
      return { label: 'Decoration In Progress', bg: '#e0e7ff', text: '#4338ca' };
    case 'READY_FOR_SETUP':
      return { label: 'Decoration In Progress', bg: '#e0e7ff', text: '#4338ca' };
    case 'COMPLETED':
      return { label: 'Completed', bg: '#dcfce7', text: '#15803d' };
    case 'VENDOR_DECLINED':
      return { label: 'Declined', bg: '#fee2e2', text: '#b91c1c' };
    default:
      return { label: status || 'Assigned', bg: '#f1f5f9', text: '#475569' };
  }
}

export default function VendorOrders() {
  const { vendorUser, logoutVendor } = useVendorAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredOrders = orders.filter((item) => {
    const s = String(item.bookingStatus || '').toUpperCase();

    // Filter by tab
    if (activeFilter === 'PENDING' && s !== 'VENDOR_ASSIGNED' && s !== 'ASSIGNED_TO_VENDOR' && s !== 'CONFIRMED' && s !== 'CREATED' && s !== 'ORDER RECEIVED' && s !== 'BOOKING PLACED' && s !== 'BOOKING_PLACED') return false;
    if (activeFilter === 'ACCEPTED' && s !== 'VENDOR_ACCEPTED') return false;
    if (activeFilter === 'IN_PROGRESS' && s !== 'IN_PROGRESS' && s !== 'READY_FOR_SETUP' && s !== 'START_PREPARATION') return false;
    if (activeFilter === 'COMPLETED' && s !== 'COMPLETED') return false;
    if (activeFilter === 'DECLINED' && s !== 'VENDOR_DECLINED') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchId = String(item.id || '').toLowerCase().includes(q);
      const matchCustomer = String(item.customerName || '').toLowerCase().includes(q);
      const matchDate = String(item.scheduledDate || item.date || '').toLowerCase().includes(q);
      return matchId || matchCustomer || matchDate;
    }

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* PAGE TITLE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#0f172a' }}>Assigned Vendor Orders</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Manage events, setup progress, and event completion for your assigned orders.
          </p>
        </div>
      </div>

      {/* TOOLBAR & SEARCH */}
      <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '14px', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* FILTER TABS */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'ALL', label: 'All' },
            { id: 'PENDING', label: 'Pending Acceptance' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'IN_PROGRESS', label: 'Decoration In Progress' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              style={{
                background: activeFilter === tab.id ? '#0f172a' : '#f1f5f9',
                color: activeFilter === tab.id ? '#ffffff' : '#475569',
                border: 'none',
                padding: '8px 14px',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* SEARCH BAR */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 Search Order ID, Customer, Date..."
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            fontSize: '0.88rem',
            width: '260px',
            maxWidth: '100%',
            outline: 'none',
          }}
        />
      </div>

      {/* ORDERS TABLE CONTAINER */}
      <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        {error ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#be123c', background: '#fff1f2' }}>
            <p style={{ margin: '0 0 12px 0', fontWeight: '700' }}>{error}</p>
            <Link
              to="/vendor/login"
              onClick={() => logoutVendor()}
              style={{ background: '#be123c', color: '#fff', textDecoration: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700' }}
            >
              Re-login to Vendor Portal
            </Link>
          </div>
        ) : loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>Loading assigned orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
            <p style={{ margin: 0, fontWeight: '700', color: '#334155' }}>No assigned orders found.</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>Orders assigned to you by DecorFesto Admin will appear here.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '14px 16px' }}>Order ID</th>
                  <th style={{ padding: '14px 16px' }}>Customer</th>
                  <th style={{ padding: '14px 16px' }}>Package / Theme</th>
                  <th style={{ padding: '14px 16px' }}>Event Date & Time</th>
                  <th style={{ padding: '14px 16px' }}>Location</th>
                  <th style={{ padding: '14px 16px' }}>Vendor Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((item) => {
                  const badge = getStatusBadge(item.bookingStatus);
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                      <td style={{ padding: '14px 16px', fontWeight: '800', color: '#0f172a' }}>{item.id}</td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#334155' }}>{item.customerName || 'Customer'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.customerPhone || ''}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{item.decorationName || 'Decoration'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {item.customization?.themePalette ? `Theme: ${item.customization.themePalette}` : 'Standard Theme'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#334155' }}>{item.scheduledDate || item.date || 'TBD'}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.scheduledTime || item.time || ''}</div>
                      </td>

                      <td style={{ padding: '14px 16px', maxWidth: '220px' }}>
                        <div style={{ fontSize: '0.84rem', color: '#334155', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.deliveryAddress || item.address || 'Location on map'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: '600' }}>Pincode: {item.pincode || 'N/A'}</div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', background: badge.bg, color: badge.text, padding: '4px 10px', borderRadius: '6px', display: 'inline-block' }}>
                          {badge.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <Link
                          to={`/vendor/orders/${item.id}`}
                          style={{
                            background: '#e11d48',
                            color: '#ffffff',
                            textDecoration: 'none',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            display: 'inline-block',
                          }}
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
