import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getStoredCharges } from '../services/chargeService';
import { assignOrderVendor, getOrderById, updateOrderStatus } from '../services/orderService';
import { getStoredVendors } from '../services/mockVendors';

function AdminOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(() => getOrderById(id));
  const vendors = getStoredVendors();
  const activeVendors = vendors.filter((v) => v.status === 'active' && v.accountStatus !== 'disabled');
  const [vendorId, setVendorId] = useState(order?.vendorId || '');

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

  const updateStatus = (bookingStatus, adminReviewStatus = 'REVIEWED') => {
    const now = new Date().toISOString();
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    const updated = updateOrderStatus(order.id, {
      bookingStatus,
      adminReviewStatus,
      updatedAt: now,
      statusHistory: [
        ...history,
        {
          status: bookingStatus,
          updatedByRole: 'ADMIN',
          updatedByName: 'DecorFesto Admin',
          timestamp: now,
        },
      ],
    });

    setOrder(updated);
  };

  const handleVendorAssignment = () => {
    if (!selectedVendor) return;
    const now = new Date().toISOString();
    const history = Array.isArray(order.statusHistory) ? order.statusHistory : [];

    assignOrderVendor(order.id, selectedVendor.id, selectedVendor.name);
    const withWorkflowStatus = updateOrderStatus(order.id, {
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

    setOrder(withWorkflowStatus);
  };

  const handleReject = () => {
    updateStatus('CANCELLED', 'REJECTED');
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin</span>
          <h1>Order #{order.id}</h1>
          <p>Review customer decoration requirements, vendor workflow progress, and assignment history.</p>
        </div>

        <div className="card-panel">
          <div className="summary-box">
            <div className="summary-box__row"><span>Customer Name</span><strong>{order.customerName || 'Guest Customer'}</strong></div>
            <div className="summary-box__row"><span>Phone Number</span><strong>{order.customerPhone || 'Not provided'}</strong></div>
            <div className="summary-box__row"><span>Email</span><strong>{order.customerEmail || 'Not provided'}</strong></div>
            <div className="summary-box__row"><span>Decoration Package</span><strong>{order.decorationName || 'Decoration Setup'}</strong></div>
            <div className="summary-box__row"><span>Scheduled Date</span><strong>{order.scheduledDate || order.date || 'TBD'}</strong></div>
            <div className="summary-box__row"><span>Time Slot</span><strong>{order.scheduledTime || order.time || 'TBD'}</strong></div>
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
            <div className="summary-box__row"><span>Booking Status</span><strong style={{ color: '#e11d48' }}>{order.bookingStatus || 'CREATED'}</strong></div>
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

          {/* VENDOR ASSIGNMENT CARD */}
          <div className="payment-card" style={{ marginTop: '24px' }}>
            <h3>Vendor Partner Assignment</h3>
            {activeVendors.length === 0 ? (
              <p>No active vendors are available.</p>
            ) : (
              <>
                <label className="search-field">
                  <span>Active vendor partners</span>
                  <select value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
                    <option value="">Select a vendor partner</option>
                    {activeVendors.map((vendor) => {
                      const allOrds = getOrders();
                      const activeCount = allOrds.filter((o) => o.vendorId === vendor.id && ['VENDOR_ASSIGNED', 'VENDOR_ACCEPTED', 'IN_PROGRESS', 'READY_FOR_SETUP'].includes(o.bookingStatus)).length;
                      const servesPincode = order.pincode && (vendor.servicePincodes || []).includes(order.pincode);
                      return (
                        <option key={vendor.id} value={vendor.id}>
                          {vendor.name} ({vendor.id}) — Active: {activeCount} {servesPincode ? '✓ Serves Pincode' : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>
                {selectedVendor ? (
                  <div className="summary-box admin-order-vendor-summary" style={{ marginTop: '12px' }}>
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
                <button type="button" className="button" onClick={handleVendorAssignment} disabled={!selectedVendor} style={{ marginTop: '12px' }}>
                  {order.vendorId ? 'Reassign / Change Vendor Partner' : 'Assign Vendor Partner'}
                </button>
              </>
            )}
          </div>

          {/* AUDIT TIMELINE */}
          {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
            <div style={{ marginTop: '24px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
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

          <div className="confirmation-actions" style={{ marginTop: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="button" className="button" onClick={() => updateStatus('APPROVED')}>Approve Order</button>
            <button type="button" className="button button--ghost" onClick={handleReject}>Reject Order</button>
            <Link to="/admin/orders" className="text-link">Back to orders</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminOrderDetails;
