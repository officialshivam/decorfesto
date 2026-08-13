import { Link } from 'react-router-dom';

function BookingSummary({
  product,
  total,
  totalPrice,
  selections = {},
  availability,
  pincode,
  date,
  time,
  onAddToCart,
  isReady,
  validationMessages = [],
  cartSuccessMessage,
  cartErrorMessage,
  isSubmitting,
}) {
  const rawTotal = total !== undefined ? total : (totalPrice !== undefined ? totalPrice : product?.price || 0);
  const safeTotal = typeof rawTotal === 'number' && !isNaN(rawTotal) ? rawTotal : (product?.price || 0);

  const effectivePincode = (typeof availability === 'object' && availability?.pincode) ? availability.pincode : (typeof pincode === 'string' ? pincode : 'Pending');
  const selectedTheme = selections.balloonTheme || selections.themePalette || 'Signature Theme';
  const selectedColors = selections.balloonColors || selections.petalPalette || selections.brandColors || 'Default Colors';
  const selectedFloral = selections.floralVariety || selections.floralCanopy || selections.stageFloral || selections.signatureFloral || null;

  // Selected add-on cards summary
  const selectedAddons = Object.values(selections).filter(
    (val) => typeof val === 'string' && val && val !== 'No' && val !== 'None' && val !== selectedTheme && val !== selectedColors && val !== selectedFloral,
  );

  return (
    <aside className="card-panel sticky-summary">
      <div className="card-panel__header">
        <h2>Booking summary</h2>
        <p>Your chosen decoration package and selected customization details.</p>
      </div>

      <div className="summary-box">
        <div className="summary-box__row">
          <span>Decoration</span>
          <strong>{product.name}</strong>
        </div>
        <div className="summary-box__row">
          <span>Theme</span>
          <strong>{selectedTheme}</strong>
        </div>
        <div className="summary-box__row">
          <span>Colors</span>
          <strong>{selectedColors}</strong>
        </div>
        {selectedFloral && (
          <div className="summary-box__row">
            <span>Floral</span>
            <strong>{selectedFloral}</strong>
          </div>
        )}
        {selectedAddons.length > 0 && (
          <div className="summary-box__row">
            <span>Selections</span>
            <strong>{selectedAddons.join(' • ')}</strong>
          </div>
        )}
        <div className="summary-box__row">
          <span>Pincode</span>
          <strong>{effectivePincode || 'Pending'}</strong>
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

      {cartSuccessMessage ? (
        <div
          className="admin-success-banner"
          role="alert"
          style={{ marginBottom: '12px', padding: '12px 14px', background: '#e6f4ea', color: '#137333', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem' }}
        >
          ✓ {cartSuccessMessage}
        </div>
      ) : null}

      {cartErrorMessage ? (
        <div
          className="admin-error-banner"
          role="alert"
          style={{ marginBottom: '12px', padding: '12px 14px', background: '#fce8e6', color: '#c5221f', borderRadius: '10px', fontWeight: '600', fontSize: '0.88rem' }}
        >
          ✕ {cartErrorMessage}
        </div>
      ) : null}

      {validationMessages.length > 0 && !cartErrorMessage && !cartSuccessMessage ? (
        <div className="validation-box">
          {validationMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="pricing-card pricing-card--summary">
        <div className="pricing-row">
          <span>Total</span>
          <strong>₹{safeTotal.toLocaleString('en-IN')}</strong>
        </div>
      </div>

      <button
        type="button"
        className={`button button--full${isSubmitting ? ' button--disabled' : ''}`}
        onClick={onAddToCart}
        disabled={!isReady || isSubmitting}
      >
        {isSubmitting ? 'Adding...' : 'Add to Cart'}
      </button>
      <Link to="/cart" className="button button--ghost button--full" style={{ marginTop: '8px' }}>
        View Cart
      </Link>
    </aside>
  );
}

export default BookingSummary;
