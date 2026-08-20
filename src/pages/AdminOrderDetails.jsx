import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrderById } from '../services/orderService';
import { assignStoredOrderVendor, updateStoredOrderStatus } from '../services/mockAuth';
import { getStoredVendors } from '../services/mockVendors';

function AdminOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(() => getOrderById(id));
  const activeVendors = useMemo(() => getStoredVendors().filter((vendor) => vendor.status === 'active'), []);
  const [vendorId, setVendorId] = useState(() => order?.vendorId || '');

  const updateStatus = (bookingStatus) => {
    const updatedOrder = updateStoredOrderStatus(id, bookingStatus);
    if (updatedOrder) {
      setOrder(updatedOrder);
    }
  };

  const handleReject = () => {
    if (window.confirm('Reject this order? This status will be saved locally.')) {
      updateStatus('REJECTED');
    }
  };

  const selectedVendor = activeVendors.find((vendor) => vendor.id === vendorId);

  const handleVendorAssignment = () => {
    if (!selectedVendor) {
      return;
    }

    const updatedOrder = assignStoredOrderVendor(id, selectedVendor);
    if (updatedOrder) {
      setOrder(updatedOrder);
    }
  };

  if (!order) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>Order not found</h1>
            <Link to="/admin/orders" className="button">Back to orders</Link>
          </div>
        </section>
      </main>
    );
  }

  const primaryItem = order.items?.[0] || {};
  const decoration = order.decorationName || primaryItem.productName || 'DecorFesto package';
  const remarks = order.remarks || primaryItem.remarks || primaryItem.customization?.remarks;
  const activeCharges = Array.isArray(order.charges) ? order.charges.filter((c) => c.enabled !== false) : [];

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin order details</span>
          <h1>{order.orderId || order.id}</h1>
          <p>{decoration}</p>
        </div>

        <div className="card-panel">
          <div className="summary-box">
            <div className="summary-box__row"><span>Order ID</span><strong>{order.orderId || order.id}</strong></div>
            <div className="summary-box__row"><span>Customer Name</span><strong>{order.customerName}</strong></div>
            <div className="summary-box__row"><span>Email</span><strong>{order.customerEmail || 'Not provided'}</strong></div>
            <div className="summary-box__row"><span>Phone</span><strong>{order.customerMobile || 'Not provided'}</strong></div>
            <div className="summary-box__row"><span>Decoration Package</span><strong>{decoration}</strong></div>
            <div className="summary-box__row"><span>Date</span><strong>{order.eventDate || order.scheduledDate || order.date || 'Pending'}</strong></div>
            <div className="summary-box__row"><span>Time Slot</span><strong>{order.timeSlot || order.scheduledTime || order.time || 'Pending'}</strong></div>
            <div className="summary-box__row"><span>Full Address</span><strong>{order.address || 'Not provided'}</strong></div>
            <div className="summary-box__row"><span>Pincode</span><strong>{order.pincode || 'Not provided'}</strong></div>

            {primaryItem.customization && (
              <div className="summary-box__row">
                <span>Customization Options</span>
                <strong>
                  {Object.entries(primaryItem.customization)
                    .filter(([k, v]) => k !== 'remarks' && Boolean(v))
                    .map(([, v]) => `${v}`)
                    .join(' • ') || 'Standard Setup'}
                </strong>
              </div>
            )}

            {Array.isArray(order.addons) && order.addons.length > 0 && (
              <div className="summary-box__row">
                <span>Individual Add-ons</span>
                <strong>{order.addons.join(' • ')}</strong>
              </div>
            )}

            <div className="summary-box__row"><span>Subtotal</span><strong>₹{Number(order.subtotal || 0).toLocaleString('en-IN')}</strong></div>
            {order.discount > 0 && (
              <div className="summary-box__row"><span>Discount</span><strong>-₹{Number(order.discount).toLocaleString('en-IN')}</strong></div>
            )}

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
            <div className="summary-box__row"><span>Booking Status</span><strong>{order.bookingStatus || 'Order Received'}</strong></div>
            <div className="summary-box__row"><span>Assigned Vendor</span><strong>{order.vendorName || 'Not assigned'}</strong></div>
            <div className="summary-box__row"><span>Created At</span><strong>{new Date(order.createdAt).toLocaleString('en-IN')}</strong></div>

            {remarks && (
              <div className="summary-box__row" style={{ color: 'var(--accent-dark)', fontWeight: '600' }}>
                <span>Special Instructions / Remarks</span>
                <strong>"{remarks}"</strong>
              </div>
            )}
          </div>

          <div className="payment-card" style={{ marginTop: '24px' }}>
            <h3>Assign Vendor</h3>
            {activeVendors.length === 0 ? (
              <p>No active vendors are available.</p>
            ) : (
              <>
                <label className="search-field">
                  <span>Active vendors</span>
                  <select value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
                    <option value="">Select a vendor</option>
                    {activeVendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                  </select>
                </label>
                {selectedVendor ? (
                  <div className="summary-box admin-order-vendor-summary" style={{ marginTop: '12px' }}>
                    <div className="summary-box__row"><span>Vendor</span><strong>{selectedVendor.name}</strong></div>
                    <div className="summary-box__row"><span>Speciality</span><strong>{selectedVendor.specialties?.join(', ') || 'Not provided'}</strong></div>
                    <div className="summary-box__row"><span>Service Pincodes</span><strong>{selectedVendor.servicePincodes?.join(', ') || 'Not provided'}</strong></div>
                  </div>
                ) : null}
                <button type="button" className="button" onClick={handleVendorAssignment} disabled={!selectedVendor} style={{ marginTop: '12px' }}>
                  {order.vendorId ? 'Change Assigned Vendor' : 'Assign Vendor'}
                </button>
              </>
            )}
          </div>

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
