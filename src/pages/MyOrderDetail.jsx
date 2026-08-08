import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function MyOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();

  if (!user) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>Order details</h1>
            <p>Please log in to see this order.</p>
          </div>
        </section>
      </main>
    );
  }

  const order = (user.orders || []).find((entry) => entry.id === id);

  if (!order) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>Order not found</h1>
            <p>The requested booking could not be found.</p>
            <Link to="/my-orders" className="button">Back to orders</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Booking details</span>
          <h1>{order.decorationName || order.items?.[0]?.productName || 'DecorFesto booking'}</h1>
        </div>

        <div className="card-panel">
          <div className="summary-box">
            <div className="summary-box__row"><span>Order ID</span><strong>{order.id}</strong></div>
            <div className="summary-box__row"><span>Decoration</span><strong>{order.decorationName || order.items?.[0]?.productName || 'DecorFesto package'}</strong></div>
            <div className="summary-box__row"><span>Date</span><strong>{order.date || order.items?.[0]?.date || 'Pending'}</strong></div>
            <div className="summary-box__row"><span>Time</span><strong>{order.time || order.items?.[0]?.time || 'Pending'}</strong></div>
            <div className="summary-box__row"><span>Address</span><strong>{order.address || order.deliveryAddress || 'Pending'}</strong></div>
            <div className="summary-box__row"><span>Amount</span><strong>₹{order.total?.toLocaleString('en-IN') || '0'}</strong></div>
            <div className="summary-box__row"><span>Booking status</span><strong>{order.bookingStatus || 'Order Received'}</strong></div>
            <div className="summary-box__row"><span>Payment status</span><strong>{order.paymentStatus || 'Pending'}</strong></div>
          </div>
          <div className="auth-actions">
            <Link to="/my-orders" className="button button--ghost">Back to orders</Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default MyOrderDetail;
