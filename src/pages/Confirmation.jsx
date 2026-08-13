import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getStoredLastOrder, getStoredUser } from '../services/mockAuth';
import { calculateItemSubtotal } from '../services/mockSettings';

function Confirmation() {
  const location = useLocation();
  const { user } = useAuth();

  const [order] = useState(() => {
    if (location.state?.order) {
      return location.state.order;
    }
    const lastOrder = getStoredLastOrder();
    if (lastOrder && typeof lastOrder.total === 'number' && lastOrder.total > 0) {
      return lastOrder;
    }
    if (user?.orders?.[0] && typeof user.orders[0].total === 'number' && user.orders[0].total > 0) {
      return user.orders[0];
    }
    const activeUser = getStoredUser();
    if (activeUser?.orders?.[0] && typeof activeUser.orders[0].total === 'number' && activeUser.orders[0].total > 0) {
      return activeUser.orders[0];
    }
    return null;
  });

  if (!order || !order.total || order.total <= 0) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>No active order found</h1>
            <p>Your confirmation details are currently unavailable. Explore our decoration catalog to book a setup.</p>
            <Link to="/catalog" className="button">Browse Catalog</Link>
          </div>
        </section>
      </main>
    );
  }

  const primaryItem = order.items?.[0] || {};
  const calculatedSubtotal = typeof order.subtotal === 'number' && order.subtotal > 0
    ? order.subtotal
    : (Array.isArray(order.items) && order.items.length > 0
      ? order.items.reduce((sum, item) => sum + calculateItemSubtotal(item), 0)
      : Math.max(0, (order.total || 0) - (order.serviceCharges || 0)));

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="card-panel confirmation-card" style={{ borderRadius: '16px', border: '1px solid var(--border)' }}>
          <span className="eyebrow">Booking received</span>
          <h1>Thank you, {order.customerName || 'Customer'}</h1>
          <p>Your decoration request has been received and will be reviewed by DecorFesto shortly.</p>

          <div className="confirmation-grid">
            <div className="confirmation-panel">
              <h2>Order summary</h2>
              <div className="summary-box">
                <div className="summary-box__row">
                  <span>Order ID</span>
                  <strong>{order.id}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Decoration</span>
                  <strong>{primaryItem.productName || 'DecorFesto Package'}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Date</span>
                  <strong>{primaryItem.date || 'Pending'}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Time</span>
                  <strong>{primaryItem.time || 'Pending'}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Address</span>
                  <strong>{order.address}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Subtotal</span>
                  <strong>₹{calculatedSubtotal.toLocaleString('en-IN')}</strong>
                </div>
                {Array.isArray(order.charges) && order.charges.length > 0 ? (
                  order.charges.map((charge) => (
                    <div key={charge.id} className="summary-box__row">
                      <span>{charge.name}</span>
                      <strong>₹{charge.amount.toLocaleString('en-IN')}</strong>
                    </div>
                  ))
                ) : order.serviceCharges && order.serviceCharges > 0 ? (
                  <div className="summary-box__row">
                    <span>Service charges</span>
                    <strong>₹{order.serviceCharges.toLocaleString('en-IN')}</strong>
                  </div>
                ) : null}
                <div className="summary-box__row pricing-row--total">
                  <span>Total Amount</span>
                  <strong>₹{order.total.toLocaleString('en-IN')}</strong>
                </div>
                {order.remarks && (
                  <div className="summary-box__row">
                    <span>Special instructions</span>
                    <strong>"{order.remarks}"</strong>
                  </div>
                )}
                <div className="summary-box__row">
                  <span>Payment status</span>
                  <strong>{order.paymentStatus || 'Confirmed / Mock'}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Booking status</span>
                  <strong>{order.bookingStatus || 'Order Received'}</strong>
                </div>
              </div>
            </div>

            <div className="confirmation-panel confirmation-panel--soft">
              <h2>What happens next?</h2>
              <p>{order.reviewMessage || 'DecorFesto will review your setup details and reach out to confirm.'}</p>
              <p>We will review your package details, availability, and booking preferences before confirming your celebration setup.</p>
              <div className="confirmation-actions" style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                <Link to="/" className="button">Back to Home</Link>
                <Link to="/catalog" className="button button--ghost">Browse Catalog</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Confirmation;
