import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { assignStoredOrderVendor, getStoredOrders, updateStoredOrderStatus } from '../services/mockAuth';
import { getStoredVendors } from '../services/mockVendors';

function AdminOrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(() => getStoredOrders().find((entry) => entry.id === id) || null);
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

  const decoration = order.decorationName || order.items?.[0]?.productName || 'DecorFesto package';

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin order details</span>
          <h1>{order.id}</h1>
          <p>{decoration}</p>
        </div>

        <div className="card-panel">
          <div className="summary-box">
            <div className="summary-box__row"><span>Order ID</span><strong>{order.id}</strong></div>
            <div className="summary-box__row"><span>Customer name</span><strong>{order.customerName}</strong></div>
            <div className="summary-box__row"><span>Email</span><strong>{order.customerEmail || 'Not provided'}</strong></div>
            <div className="summary-box__row"><span>Mobile</span><strong>{order.customerMobile || 'Not provided'}</strong></div>
            <div className="summary-box__row"><span>Decoration/package</span><strong>{decoration}</strong></div>
            <div className="summary-box__row"><span>Date</span><strong>{order.date || order.items?.[0]?.date || 'Pending'}</strong></div>
            <div className="summary-box__row"><span>Time</span><strong>{order.time || order.items?.[0]?.time || 'Pending'}</strong></div>
            <div className="summary-box__row"><span>Full address</span><strong>{order.address || 'Not provided'}</strong></div>
            <div className="summary-box__row"><span>Pincode</span><strong>{order.pincode || 'Not provided'}</strong></div>
            <div className="summary-box__row"><span>Amount</span><strong>₹{Number(order.total || 0).toLocaleString('en-IN')}</strong></div>
            <div className="summary-box__row"><span>Payment status</span><strong>{order.paymentStatus || 'Pending'}</strong></div>
            <div className="summary-box__row"><span>Booking status</span><strong>{order.bookingStatus || 'Order Received'}</strong></div>
            <div className="summary-box__row"><span>Assigned vendor</span><strong>{order.vendorName || 'Not assigned'}</strong></div>
          </div>

          <div className="payment-card">
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
                  <div className="summary-box admin-order-vendor-summary">
                    <div className="summary-box__row"><span>Vendor</span><strong>{selectedVendor.name}</strong></div>
                    <div className="summary-box__row"><span>Speciality</span><strong>{selectedVendor.specialties?.join(', ') || 'Not provided'}</strong></div>
                    <div className="summary-box__row"><span>Service pincodes</span><strong>{selectedVendor.servicePincodes?.join(', ') || 'Not provided'}</strong></div>
                  </div>
                ) : null}
                <button type="button" className="button" onClick={handleVendorAssignment} disabled={!selectedVendor}>
                  {order.vendorId ? 'Change Assigned Vendor' : 'Assign Vendor'}
                </button>
              </>
            )}
          </div>

          <div className="confirmation-actions">
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
