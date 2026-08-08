import { Link, useLocation } from 'react-router-dom';

function Confirmation() {
  const location = useLocation();
  const order = location.state?.order;

  if (!order) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>No order found</h1>
            <p>Your confirmation details are unavailable. Please try placing the order again.</p>
            <Link to="/catalog" className="button">Return to catalog</Link>
          </div>
        </section>
      </main>
    );
  }

  const primaryItem = order.items[0];

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="card-panel confirmation-card">
          <span className="eyebrow">Booking received</span>
          <h1>Thank you, {order.customerName}</h1>
          <p>Your decoration request has been received and will be reviewed by DecorFesto shortly.</p>

          <div className="confirmation-grid">
            <div className="confirmation-panel">
              <h2>Order details</h2>
              <div className="summary-box">
                <div className="summary-box__row">
                  <span>Order ID</span>
                  <strong>{order.id}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Decoration</span>
                  <strong>{primaryItem?.productName || 'DecorFesto package'}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Date</span>
                  <strong>{primaryItem?.date || 'Pending'}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Time</span>
                  <strong>{primaryItem?.time || 'Pending'}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Address</span>
                  <strong>{order.address}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Amount</span>
                  <strong>₹{order.total.toLocaleString('en-IN')}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Payment status</span>
                  <strong>{order.paymentStatus}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Booking status</span>
                  <strong>{order.bookingStatus}</strong>
                </div>
              </div>
            </div>

            <div className="confirmation-panel confirmation-panel--soft">
              <h2>What happens next?</h2>
              <p>{order.reviewMessage}</p>
              <p>We will review your package details, availability, and booking preferences before confirming your celebration setup.</p>
              <div className="confirmation-actions">
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
