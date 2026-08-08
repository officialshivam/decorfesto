import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function MyOrders() {
  const { user } = useAuth();

  if (!user) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>My orders</h1>
            <p>Please log in to see your booking history.</p>
          </div>
        </section>
      </main>
    );
  }

  const orders = user.orders || [];

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
          <div className="orders-list">
            {orders.map((order) => (
              <div key={order.id} className="card-panel order-card">
                <div className="order-card__top">
                  <div>
                    <h3>{order.decorationName || order.items?.[0]?.productName || 'DecorFesto package'}</h3>
                    <p>Order ID: {order.id}</p>
                  </div>
                  <span className="status-pill">{order.bookingStatus || 'Order Received'}</span>
                </div>
                <div className="summary-box">
                  <div className="summary-box__row"><span>Date</span><strong>{order.date || order.items?.[0]?.date || 'Pending'}</strong></div>
                  <div className="summary-box__row"><span>Time</span><strong>{order.time || order.items?.[0]?.time || 'Pending'}</strong></div>
                  <div className="summary-box__row"><span>Amount</span><strong>₹{order.total?.toLocaleString('en-IN') || '0'}</strong></div>
                  <div className="summary-box__row"><span>Payment</span><strong>{order.paymentStatus || 'Pending'}</strong></div>
                </div>
                <div className="auth-actions">
                  <Link to={`/my-orders/${order.id}`} className="button button--ghost">View details</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default MyOrders;
