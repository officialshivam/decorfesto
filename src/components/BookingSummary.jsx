import { Link } from 'react-router-dom';

function BookingSummary({ product, total, selections, availability, date, time, onAddToCart, isReady, validationMessages }) {
  return (
    <aside className="card-panel sticky-summary">
      <div className="card-panel__header">
        <h2>Booking summary</h2>
        <p>Your chosen decoration package and selected add-ons.</p>
      </div>

      <div className="summary-box">
        <div className="summary-box__row">
          <span>Decoration</span>
          <strong>{product.name}</strong>
        </div>
        <div className="summary-box__row">
          <span>Theme</span>
          <strong>{selections.balloonTheme}</strong>
        </div>
        <div className="summary-box__row">
          <span>Colors</span>
          <strong>{selections.balloonColors}</strong>
        </div>
        <div className="summary-box__row">
          <span>Base price</span>
          <strong>₹{product.price.toLocaleString('en-IN')}</strong>
        </div>
        <div className="summary-box__row">
          <span>Selections</span>
          <strong>{Object.values(selections).join(' • ')}</strong>
        </div>
        <div className="summary-box__row">
          <span>Pincode</span>
          <strong>{availability.pincode || 'Pending'}</strong>
        </div>
        <div className="summary-box__row">
          <span>Date</span>
          <strong>{date || 'Pending'}</strong>
        </div>
        <div className="summary-box__row">
          <span>Time</span>
          <strong>{time || 'Pending'}</strong>
        </div>
      </div>

      {validationMessages.length > 0 ? (
        <div className="validation-box">
          {validationMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="pricing-card pricing-card--summary">
        <div className="pricing-row">
          <span>Total</span>
          <strong>₹{total.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      <button type="button" className="button button--full" onClick={onAddToCart} disabled={!isReady}>
        Add to Cart
      </button>
      <Link to="/cart" className="button button--ghost button--full">
        View Cart
      </Link>
    </aside>
  );
}

export default BookingSummary;
