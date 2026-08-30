import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStoredCharges } from '../services/chargeService';
import { getOrderById, getAdminOrderByIdApi, updateAdminOrderStatusApi } from '../services/orderService';
import { getAllUsersForAdminApi } from '../services/userService';
import { getVendorsApi } from '../services/vendorAuthService';
import { formatDisplayDate } from '../utils/dateTimeUtils';
import { formatBookingStatus } from '../utils/statusUtils';

function AdminOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const activeVendors = vendors.filter((v) => v.status === 'active' && v.accountStatus !== 'disabled');
  const [vendorId, setVendorId] = useState('');

  // Modals & Action States
  const [confirmModal, setConfirmModal] = useState(null); // 'APPROVE' | 'REJECT' | null
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const [isSubmittingVendor, setIsSubmittingVendor] = useState(false);
  const [vendorSuccess, setVendorSuccess] = useState('');
  const [vendorError, setVendorError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [ord, vList, uList] = await Promise.all([
          getAdminOrderByIdApi(id),
          getVendorsApi(),
          getAllUsersForAdminApi(),
        ]);
        const finalOrder = ord || getOrderById(id);
        setOrder(finalOrder);
        if (finalOrder?.vendorId) {
          setVendorId(finalOrder.vendorId);
        }
        setVendors(vList || []);
        setUsers(uList || []);
      } catch (err) {
        console.error('Failed to load order details:', err);
        const fallback = getOrderById(id);
        setOrder(fallback);
        if (fallback?.vendorId) {
          setVendorId(fallback.vendorId);
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <main className="page">
        <section className="container section">
          <div className="card-panel text-center" style={{ padding: '40px', color: '#64748b' }}>
            <p>Loading order details...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="page">
        <section className="container section">
          <h1>Order not found</h1>
          <p>The requested order could not be located.</p>
          <Link to="/admin/orders" className="button button--small">Back to orders</Link>
        </section>
      </main>
    );
  }

  const activeCharges = getStoredCharges().filter((c) => c.enabled);
  const selectedVendor = activeVendors.find((v) => v.id === vendorId);
  const customization = order.customization || {};
  const remarks = order.remarks || customization.remarks || '';

  // Linked customer record phone resolution
  const linkedUser = users.find((u) => u.id === order.customerId || (u.email && u.email === order.customerEmail));
  const customerPhone = order.customerPhone || order.customerMobile || order.phone || order.mobile || linkedUser?.mobile || linkedUser?.phone || 'Not provided';
  const customerEmail = order.customerEmail || order.email || linkedUser?.email || 'Not provided';

  const firstItem = order.items?.[0] || {};
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

  const dateDisplay = rawDate ? formatDisplayDate(rawDate) : 'TBD';
  const timeDisplay = rawTime ? String(rawTime).trim() : 'TBD';

  const handleCancelOrder = async () => {
    if (confirmModal !== 'CANCEL') return;
    setIsSubmittingAction(true);
    setActionError('');
    setActionSuccess('');

    const now = new Date().toISOString();
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    try {
      const updated = await updateAdminOrderStatusApi(order.id, {
        bookingStatus: 'CANCELLED',
        adminReviewStatus: 'CANCELLED',
        updatedAt: now,
        statusHistory: [
          ...history,
          {
            status: 'CANCELLED',
            updatedByRole: 'ADMIN',
            updatedByName: 'DecorFesto Admin',
            timestamp: now,
            note: 'Order cancelled by Admin',
          },
        ],
      });

      if (updated) {
        setOrder(updated);
        setActionSuccess(`Order ${order.id} cancelled successfully.`);
        setConfirmModal(null);
      } else {
        setActionError('Unable to cancel order. Please try again.');
      }
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setActionError('Unable to cancel order. Please try again.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleVendorAssignment = async () => {
    if (!selectedVendor) return;
    setIsSubmittingVendor(true);
    setVendorError('');
    setVendorSuccess('');

    const now = new Date().toISOString();
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    try {
      const withWorkflowStatus = await updateAdminOrderStatusApi(order.id, {
        vendorId: selectedVendor.id,
        vendorName: selectedVendor.name,
        bookingStatus: 'VENDOR_ASSIGNED',
        vendorAssignedAt: now,
        updatedAt: now,
        statusHistory: [
          ...history,
          {
            status: 'VENDOR_ASSIGNED',
            updatedByRole: 'ADMIN',
            updatedByName: 'DecorFesto Admin',
            timestamp: now,
            note: `Assigned to ${selectedVendor.name}`,
          },
        ],
      });

      if (withWorkflowStatus) {
        setOrder(withWorkflowStatus);
        setVendorSuccess(`Vendor Partner updated to ${selectedVendor.name}.`);
      } else {
        setVendorError('Unable to assign vendor. Please try again.');
      }
    } catch (err) {
      console.error('Failed to assign vendor:', err);
      setVendorError('Unable to assign vendor. Please try again.');
    } finally {
      setIsSubmittingVendor(false);
    }
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left" style={{ marginBottom: '24px' }}>
          <span className="eyebrow">Admin Panel</span>
          <h1>Order #{order.id}</h1>
          <p>Review customer decoration requirements, vendor partner status, and manage booking workflow actions.</p>
        </div>

        {/* SUMMARY CARD */}
        <div className="card-panel" style={{ padding: '24px', borderRadius: '16px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
            Customer & Booking Summary
          </h3>
          <div className="summary-box">
            <div className="summary-box__row"><span>Customer Name</span><strong>{order.customerName || 'Guest Customer'}</strong></div>
            <div className="summary-box__row"><span>Phone Number</span><strong style={{ color: '#0f172a', fontWeight: '700' }}>{customerPhone}</strong></div>
            <div className="summary-box__row"><span>Email Address</span><strong>{customerEmail}</strong></div>
            <div className="summary-box__row"><span>Decoration Package</span><strong>{order.decorationName || firstItem.productName || 'Decoration Setup'}</strong></div>
            <div className="summary-box__row"><span>Scheduled Date</span><strong>{dateDisplay}</strong></div>
            <div className="summary-box__row"><span>Time Slot</span><strong>{timeDisplay}</strong></div>
            <div className="summary-box__row"><span>Delivery Address</span><strong>{order.deliveryAddress || order.address || 'Address provided'}</strong></div>
            <div className="summary-box__row"><span>Pincode</span><strong>{order.pincode || 'N/A'}</strong></div>

            <div className="summary-box__row"><span>Theme Palette</span><strong>{customization.themePalette || 'Standard Theme'}</strong></div>
            <div className="summary-box__row"><span>Floral Arrangement</span><strong>{customization.floralArrangement || 'None'}</strong></div>
            <div className="summary-box__row"><span>No. of Packages</span><strong>{customization.packageQuantity || 1}</strong></div>

            {activeCharges.length > 0 ? (
              activeCharges.map((c) => (
                <div key={c.id} className="summary-box__row">
                  <span>{c.name}</span>
                  <strong>₹{Number(c.amount || 0).toLocaleString('en-IN')}</strong>
                </div>
              ))
            ) : order.serviceCharges > 0 ? (
              <div className="summary-box__row"><span>Service Charges</span><strong>₹{Number(order.serviceCharges).toLocaleString('en-IN')}</strong></div>
            ) : null}

            <div className="summary-box__row pricing-row--total"><span>Total Amount</span><strong>₹{Number(order.total || 0).toLocaleString('en-IN')}</strong></div>
            <div className="summary-box__row"><span>Payment Status</span><strong>{order.paymentStatus || 'Pending'}</strong></div>
            <div className="summary-box__row">
              <span>Booking Status</span>
              <span className="status-pill" style={{ fontSize: '0.82rem', fontWeight: '800', padding: '4px 12px', borderRadius: '12px', background: order.bookingStatus === 'APPROVED' ? '#dcfce7' : order.bookingStatus === 'CANCELLED' ? '#fee2e2' : '#fef3c7', color: order.bookingStatus === 'APPROVED' ? '#15803d' : order.bookingStatus === 'CANCELLED' ? '#b91c1c' : '#b45309' }}>
                {formatBookingStatus(order.bookingStatus)}
              </span>
            </div>
            <div className="summary-box__row"><span>Assigned Vendor</span><strong>{order.vendorName || 'Not assigned'}</strong></div>

            {order.vendorDeclineReason && (
              <div className="summary-box__row" style={{ color: '#b91c1c', fontWeight: '700' }}>
                <span>Vendor Decline Reason</span>
                <strong>"{order.vendorDeclineReason}"</strong>
              </div>
            )}

            <div className="summary-box__row"><span>Created At</span><strong>{new Date(order.createdAt).toLocaleString('en-IN')}</strong></div>

            {remarks && (
              <div className="summary-box__row" style={{ color: 'var(--accent-dark)', fontWeight: '600' }}>
                <span>Special Instructions / Remarks</span>
                <strong>"{remarks}"</strong>
              </div>
            )}
          </div>
        </div>

          {/* DEDICATED ORDER ACTIONS CARD */}
        {(() => {
          const currentStatusUpper = String(order.bookingStatus || '').toUpperCase();
          const isTerminal = ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(currentStatusUpper);
          const isCompleted = currentStatusUpper === 'COMPLETED';

          return (
            <>
              <div className="card-panel" style={{ marginTop: '24px', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>Order Actions</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b' }}>
                      {isTerminal ? 'Booking workflow status is locked in terminal state.' : 'Manage booking status and cancellations.'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>Current Booking Status:</span>
                    <span className="status-pill" style={{ fontSize: '0.88rem', fontWeight: '800', padding: '6px 14px', borderRadius: '20px', background: isCompleted ? '#dcfce7' : isTerminal ? '#fee2e2' : '#fef3c7', color: isCompleted ? '#15803d' : isTerminal ? '#b91c1c' : '#b45309' }}>
                      {formatBookingStatus(order.bookingStatus)}
                    </span>
                  </div>
                </div>

                {actionSuccess && (
                  <div className="admin-success-banner" style={{ marginBottom: '16px', padding: '12px 16px' }}>
                    ✓ {actionSuccess}
                  </div>
                )}

                {actionError && (
                  <div className="admin-error-banner" style={{ marginBottom: '16px', padding: '12px 16px' }}>
                    ✕ {actionError}
                  </div>
                )}

                {isTerminal ? (
                  <div style={{
                    background: isCompleted ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : '#fef2f2',
                    border: isCompleted ? '1px solid #bbf7d0' : '1px solid #fecdd3',
                    padding: '20px 24px',
                    borderRadius: '14px',
                  }}>
                    <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: isCompleted ? '#166534' : '#9f1239', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isCompleted ? '✨ ORDER COMPLETED' : '⚠️ ORDER TERMINATED'}
                    </h4>
                    <p style={{ margin: '6px 0 0', fontSize: '0.92rem', color: isCompleted ? '#15803d' : '#be123c', lineHeight: '1.5' }}>
                      {isCompleted
                        ? 'This decoration booking has been fully completed. No further workflow changes or status updates are allowed.'
                        : `This booking is in terminal state "${formatBookingStatus(order.bookingStatus)}". No further status actions are permitted.`}
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="button"
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', padding: '10px 24px', fontSize: '0.95rem', fontWeight: '700', borderRadius: '10px', cursor: 'pointer' }}
                      onClick={() => { setConfirmModal('CANCEL'); setActionError(''); setActionSuccess(''); }}
                      disabled={isSubmittingAction}
                    >
                      Cancel Order
                    </button>

                    <Link to="/admin/orders" style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#475569', textDecoration: 'none', fontWeight: '600' }}>
                      ← Back to orders
                    </Link>
                  </div>
                )}
              </div>

              {/* VENDOR ASSIGNMENT CARD (SEPARATE) */}
              <div className="payment-card" style={{ marginTop: '24px', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>Vendor Partner Assignment</h3>
                {vendorSuccess && (
                  <div className="admin-success-banner" style={{ marginBottom: '16px', padding: '10px 14px' }}>
                    ✓ {vendorSuccess}
                  </div>
                )}
                {vendorError && (
                  <div className="admin-error-banner" style={{ marginBottom: '16px', padding: '10px 14px' }}>
                    ✕ {vendorError}
                  </div>
                )}

                {isTerminal ? (
                  <div style={{ background: '#ffffff', padding: '16px 20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: '600', display: 'block' }}>Assigned Vendor Partner</span>
                    <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{order.vendorName || 'No Vendor Assigned'}</strong>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#16a34a', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      ✓ Assignment locked after completion/terminal state
                    </div>
                  </div>
                ) : activeVendors.length === 0 ? (
                  <p>No active vendors are available.</p>
                ) : (
                  <>
                    <label className="search-field">
                      <span>Active vendor partners</span>
                      <select value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
                        <option value="">Select a vendor partner</option>
                        {activeVendors.map((vendor) => {
                          const servesPincode = order.pincode && (vendor.servicePincodes || []).includes(order.pincode);
                          return (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name} ({vendor.id}) {servesPincode ? '✓ Serves Pincode' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    {selectedVendor ? (
                      <div className="summary-box admin-order-vendor-summary" style={{ marginTop: '12px', background: '#ffffff' }}>
                        <div className="summary-box__row"><span>Vendor</span><strong>{selectedVendor.name} ({selectedVendor.id})</strong></div>
                        <div className="summary-box__row"><span>Specialities</span><strong>{selectedVendor.specialties?.join(', ') || 'Not provided'}</strong></div>
                        <div className="summary-box__row"><span>Service Pincodes</span><strong>{selectedVendor.servicePincodes?.join(', ') || 'Not provided'}</strong></div>
                        <div className="summary-box__row">
                          <span>Booking Pincode Match</span>
                          <strong style={{ color: order.pincode && (selectedVendor.servicePincodes || []).includes(order.pincode) ? '#166534' : '#b91c1c' }}>
                            {order.pincode && (selectedVendor.servicePincodes || []).includes(order.pincode)
                              ? `✓ Serves booking pincode ${order.pincode}`
                              : `⚠️ Outside service area (Booking Pincode: ${order.pincode || 'N/A'})`}
                          </strong>
                        </div>
                      </div>
                    ) : null}
                    <button type="button" className="button" onClick={handleVendorAssignment} disabled={!selectedVendor || isSubmittingVendor} style={{ marginTop: '12px' }}>
                      {isSubmittingVendor
                        ? 'Updating vendor…'
                        : (order.vendorId ? 'Reassign / Change Vendor Partner' : 'Assign Vendor Partner')}
                    </button>
                  </>
                )}
              </div>
            </>
          );
        })()}

        {/* AUDIT TIMELINE */}
        {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
          <div style={{ marginTop: '24px', background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>Order Status Timeline</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {order.statusHistory.map((item, idx) => (
                <div key={idx} style={{ fontSize: '0.88rem' }}>
                  <strong>{item.status?.replace('_', ' ')}</strong> — {item.updatedByName || item.updatedByRole} ({new Date(item.timestamp).toLocaleString()})
                  {item.note && <span style={{ color: '#b91c1c', fontStyle: 'italic' }}> — "{item.note}"</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONFIRMATION MODAL */}
        {confirmModal === 'CANCEL' && (
          <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: '16px' }}>
            <div className="modal-card" style={{ background: '#ffffff', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: '800', color: '#9f1239' }}>
                Cancel this order?
              </h2>

              <p style={{ fontSize: '0.92rem', color: '#475569', marginBottom: '20px', lineHeight: '1.5' }}>
                Are you sure you want to cancel this order? This will update the booking status to CANCELLED and block any further vendor assignments or decoration progress.
              </p>

              <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #e2e8f0', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><span style={{ color: '#64748b' }}>Order ID:</span> <strong>{order.id}</strong></div>
                <div><span style={{ color: '#64748b' }}>Customer Name:</span> <strong>{order.customerName || 'Customer'}</strong></div>
                <div><span style={{ color: '#64748b' }}>Total Amount:</span> <strong>₹{Number(order.total || 0).toLocaleString('en-IN')}</strong></div>
                <div><span style={{ color: '#64748b' }}>Current Status:</span> <strong>{formatBookingStatus(order.bookingStatus)}</strong></div>
                <div><span style={{ color: '#64748b' }}>Assigned Vendor:</span> <strong>{order.vendorName || 'Not assigned'}</strong></div>
              </div>

              {actionError && (
                <div className="admin-error-banner" style={{ marginBottom: '16px', padding: '10px 14px' }}>
                  ✕ {actionError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => { setConfirmModal(null); setActionError(''); }}
                  disabled={isSubmittingAction}
                  style={{ padding: '8px 20px', borderRadius: '10px' }}
                >
                  Keep Order
                </button>
                <button
                  type="button"
                  className="button"
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 24px',
                    borderRadius: '10px',
                    fontWeight: '700',
                    cursor: isSubmittingAction ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingAction ? 0.7 : 1,
                  }}
                  onClick={handleCancelOrder}
                  disabled={isSubmittingAction}
                >
                  {isSubmittingAction ? 'Cancelling…' : 'Confirm Cancel Order'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminOrderDetails;
