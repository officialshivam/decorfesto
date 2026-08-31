import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';
import { fetchVendorOrderDetailApi, updateVendorOrderStatusApi } from '../services/vendorOrderService';

function getStatusBadge(status) {
  const s = String(status || '').toUpperCase();
  switch (s) {
    case 'VENDOR_ASSIGNED':
    case 'ASSIGNED_TO_VENDOR':
      return { label: 'Pending Acceptance', bg: '#fef3c7', text: '#d97706' };
    case 'VENDOR_ACCEPTED':
    case 'ACCEPTED':
      return { label: 'Accepted / Ready to Start', bg: '#e0f2fe', text: '#0284c7' };
    case 'IN_PROGRESS':
    case 'READY_FOR_SETUP':
    case 'START_PREPARATION':
      return { label: 'Decoration In Progress', bg: '#e0e7ff', text: '#4338ca' };
    case 'COMPLETED':
      return { label: 'Decoration Completed', bg: '#dcfce7', text: '#15803d' };
    case 'VENDOR_DECLINED':
    case 'CANCELLED':
    case 'REJECTED':
      return { label: 'Cancelled', bg: '#fee2e2', text: '#b91c1c' };
    default:
      return { label: status || 'Assigned', bg: '#f1f5f9', text: '#475569' };
  }
}

export default function VendorOrderDetails() {
  const { orderId } = useParams();
  const { vendorUser } = useVendorAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [notice, setNotice] = useState('');
  const [updating, setUpdating] = useState(false);

  // Decline Modal state
  const [isDeclineOpen, setIsDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    async function loadData() {
      if (vendorUser?.id && orderId) {
        setLoading(true);
        setErrorMsg('');
        const res = await fetchVendorOrderDetailApi(orderId, vendorUser.id);
        if (res.ok) {
          setOrder(res.order);
        } else {
          setErrorMsg(res.error || 'Unable to load order details.');
        }
        setLoading(false);
      }
    }
    loadData();
  }, [orderId, vendorUser?.id]);

  const handleStatusChange = async (nextStatus, reason = '') => {
    if (!order || !vendorUser) return;
    setUpdating(true);
    setErrorMsg('');
    setNotice('');

    const res = await updateVendorOrderStatusApi(
      order.id,
      vendorUser.id,
      vendorUser.name,
      nextStatus,
      reason,
    );

    setUpdating(false);

    if (res.ok) {
      setOrder(res.order);
      setNotice(`Order status updated to "${nextStatus.replace('_', ' ')}" successfully.`);
      setIsDeclineOpen(false);
      setDeclineReason('');
    } else {
      setErrorMsg(res.error || 'Failed to update order status.');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', color: '#64748b', textAlign: 'center' }}>Loading order details...</div>;
  }

  if (errorMsg || !order) {
    return (
      <div style={{ background: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #fee2e2', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
        <h2 style={{ color: '#991b1b', margin: '0 0 8px' }}>Access Denied or Order Not Found</h2>
        <p style={{ color: '#64748b', margin: '0 0 16px' }}>{errorMsg || 'This order could not be retrieved.'}</p>
        <Link to="/vendor/orders" style={{ background: '#0f172a', color: '#fff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700' }}>
          ← Back to My Orders
        </Link>
      </div>
    );
  }

  const currentStatus = String(order.bookingStatus || 'CREATED').toUpperCase();
  const badge = getStatusBadge(currentStatus);
  const customization = order.customization || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* NAVIGATION HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Link to="/vendor/orders" style={{ textDecoration: 'none', color: '#e11d48', fontWeight: '700', fontSize: '0.88rem' }}>
            ← Back to Orders List
          </Link>
          <h1 style={{ margin: '4px 0 0', fontSize: '1.75rem', fontWeight: '900', color: '#0f172a' }}>
            Order #{order.id}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: '800', background: badge.bg, color: badge.text, padding: '6px 14px', borderRadius: '8px' }}>
            {badge.label}
          </span>
        </div>
      </div>

      {notice && (
        <div style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '12px 16px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem' }}>
          ✓ {notice}
        </div>
      )}

      {errorMsg && (
        <div style={{ background: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* WORKFLOW ACTION BAR */}
      <div style={{ background: '#fff', padding: '20px 24px', borderRadius: '16px', border: '2px solid #e11d48', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '800' }}>
            CURRENT SETUP WORKFLOW ACTION
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
            {currentStatus === 'VENDOR_ASSIGNED' && 'Booking assigned to your studio. Please Accept or Decline.'}
            {currentStatus === 'VENDOR_ACCEPTED' && 'Booking accepted! Start decoration when ready.'}
            {(currentStatus === 'IN_PROGRESS' || currentStatus === 'READY_FOR_SETUP') && 'Decoration in progress. Mark completed once celebration setup is finished.'}
            {currentStatus === 'COMPLETED' && 'Setup Completed successfully!'}
            {currentStatus === 'VENDOR_DECLINED' && 'Order was declined. Waiting for Admin reassignment.'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {currentStatus === 'VENDOR_ASSIGNED' && (
            <>
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatusChange('VENDOR_ACCEPTED')}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}
              >
                {updating ? 'Updating...' : '✓ Accept Order'}
              </button>

              <button
                type="button"
                disabled={updating}
                onClick={() => setIsDeclineOpen(true)}
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}
              >
                ✕ Decline Order
              </button>
            </>
          )}

          {currentStatus === 'VENDOR_ACCEPTED' && (
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange('IN_PROGRESS')}
              style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}
            >
              {updating ? 'Updating...' : '▶ Start Decoration'}
            </button>
          )}

          {(currentStatus === 'IN_PROGRESS' || currentStatus === 'READY_FOR_SETUP') && (
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange('COMPLETED')}
              style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '10px', fontWeight: '800', cursor: 'pointer', fontSize: '0.95rem' }}
            >
              {updating ? 'Updating...' : '🎉 Mark Completed'}
            </button>
          )}
        </div>
      </div>

      {/* GRID: EVENT & CUSTOMER DETAILS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* EVENT SCHEDULE & LOCATION */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            📅 Event Schedule & Location
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.92rem' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: '700' }}>Event Date</span>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.05rem', marginTop: '2px' }}>
                {order.scheduledDate || order.date || 'Scheduled Date TBD'}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: '700' }}>Time Slot</span>
              <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                ⏰ {order.scheduledTime || order.time || 'Time Slot TBD'}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: '700' }}>Delivery & Setup Address</span>
              <div style={{ fontWeight: '700', color: '#334155', marginTop: '2px', lineHeight: '1.5' }}>
                📍 {order.deliveryAddress || order.address || 'Address provided on checkout'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600', marginTop: '4px' }}>
                Pincode: <strong>{order.pincode || 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* CUSTOMER CONTACT INFORMATION */}
        <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            👤 Client Information
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.92rem' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: '700' }}>Customer Name</span>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '1.05rem', marginTop: '2px' }}>
                {order.customerName || 'Guest Customer'}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: '700' }}>Contact Phone</span>
              <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                📞 {order.customerPhone || 'Not provided'}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: '700' }}>Email</span>
              <div style={{ fontWeight: '600', color: '#475569', marginTop: '2px' }}>
                ✉️ {order.customerEmail || 'Not provided'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DECORATION PACKAGE & CUSTOMIZATION DETAILS */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          🎈 Decoration Setup & Customization Requirements
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: '700' }}>Package Name</span>
            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: '#0f172a', marginTop: '2px' }}>
              {order.decorationName || 'Decoration Setup Package'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700' }}>Theme Color Palette</span>
              <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                🎨 {customization.themePalette || 'Standard Theme'}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700' }}>Floral Arrangement</span>
              <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                🌸 {customization.floralArrangement || 'None Selected'}
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700' }}>No. of Packages</span>
              <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>
                📦 {customization.packageQuantity || 1} Package(s)
              </div>
            </div>
          </div>

          {/* ADD-ONS SUMMARY */}
          <div>
            <span style={{ color: '#64748b', fontSize: '0.82rem', textTransform: 'uppercase', fontWeight: '700' }}>Selected Add-ons & Experiences</span>
            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(customization).filter(([key, val]) => key !== 'themePalette' && key !== 'floralArrangement' && key !== 'packageQuantity' && val).length === 0 ? (
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>No add-ons selected.</span>
              ) : (
                Object.entries(customization)
                  .filter(([key, val]) => key !== 'themePalette' && key !== 'floralArrangement' && key !== 'packageQuantity' && val)
                  .map(([key, val]) => (
                    <span key={key} style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3', padding: '6px 12px', borderRadius: '8px', fontWeight: '700', fontSize: '0.85rem' }}>
                      ✨ {typeof val === 'string' ? val : key}
                    </span>
                  ))
              )}
            </div>
          </div>

          {/* SPECIAL REQUESTS / CUSTOMER REMARKS */}
          {(order.remarks || customization.remarks) ? (
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', padding: '16px 20px', borderRadius: '12px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#854d0e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                💬 Special Instructions / Customer Remarks
              </span>
              <p style={{ margin: '6px 0 0', fontSize: '0.95rem', fontWeight: '700', color: '#713f12' }}>
                "{order.remarks || customization.remarks}"
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* STATUS HISTORY AUDIT TIMELINE */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          ⏱️ Order Workflow Audit Timeline
        </h3>

        {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {order.statusHistory.map((item, index) => (
              <div key={index} style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#e11d48', marginTop: '4px' }} />
                <div>
                  <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.9rem' }}>
                    {item.status?.replace('_', ' ')}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                    Updated by: <strong>{item.updatedByName || item.updatedByRole}</strong> | {new Date(item.timestamp).toLocaleString()}
                  </div>
                  {item.note && <div style={{ fontSize: '0.82rem', color: '#991b1b', fontStyle: 'italic', marginTop: '2px' }}>Reason: "{item.note}"</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '0.88rem', color: '#64748b' }}>
            Assigned at: {order.vendorAssignedAt ? new Date(order.vendorAssignedAt).toLocaleString() : 'N/A'}
          </div>
        )}
      </div>

      {/* DECLINE CONFIRMATION MODAL */}
      {isDeclineOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '100%', boxShadow: '0 12px 32px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 8px', color: '#991b1b', fontSize: '1.2rem' }}>Decline Order #{order.id}?</h3>
            <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: '0.9rem' }}>
              Are you sure you want to decline this order? DecorFesto Admin will be notified to reassign another vendor partner.
            </p>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Reason for Declining (Optional)
            </label>
            <input
              type="text"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Schedule conflict / Capacity full"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', marginBottom: '20px', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsDeclineOpen(false)}
                style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updating}
                onClick={() => handleStatusChange('VENDOR_DECLINED', declineReason)}
                style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer' }}
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
