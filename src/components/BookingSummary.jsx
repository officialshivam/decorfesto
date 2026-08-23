import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getCustomizationsForDesign } from '../services/mockCustomizations';
import { formatDisplayDate } from '../utils/dateTimeUtils';

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
  const basePrice = product?.price || 0;

  const effectivePincode = (typeof availability === 'object' && availability?.pincode) ? availability.pincode : (typeof pincode === 'string' ? pincode : 'Pending');
  const selectedTheme = selections.balloonTheme || selections.themePalette || 'Signature Theme';
  const selectedColors = selections.balloonColors || selections.petalPalette || selections.brandColors || 'Default Colors';

  // Get available add-ons for this product
  const availableAddons = useMemo(() => {
    if (!product?.id) return [];
    return getCustomizationsForDesign(product.id, 'addon');
  }, [product?.id]);

  const availableFlorals = useMemo(() => {
    if (!product?.id) return [];
    return getCustomizationsForDesign(product.id, 'floralArrangement');
  }, [product?.id]);

  // Determine add-on cost breakdown
  const addonBreakdown = useMemo(() => {
    const list = [];

    // Florals
    availableFlorals.forEach((floral) => {
      if (floral.price === 0) return; // Skip "No Floral" base options in add-on list
      const isSelected = Object.values(selections).some(
        (val) => typeof val === 'string' && val.includes(floral.name),
      );
      list.push({
        id: floral.id,
        name: floral.name,
        isSelected,
        price: floral.price,
      });
    });

    // General Addons
    availableAddons.forEach((addon) => {
      const isSelected = Boolean(selections[addon.id]) || Object.values(selections).some(
        (val) => typeof val === 'string' && val.includes(addon.name),
      );
      list.push({
        id: addon.id,
        name: addon.name,
        isSelected,
        price: addon.price,
      });
    });

    return list;
  }, [availableAddons, availableFlorals, selections]);

  const addOnTotalCost = useMemo(() => {
    return addonBreakdown
      .filter((item) => item.isSelected)
      .reduce((sum, item) => sum + item.price, 0);
  }, [addonBreakdown]);

  return (
    <aside className="card-panel sticky-summary">
      <div className="card-panel__header">
        <h2>Booking summary</h2>
        <p>Review package details, customizations, add-ons, and pricing breakdown.</p>
      </div>

      <div className="summary-box" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. DECORATION PACKAGE */}
        <div style={{ borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)', fontWeight: '700' }}>Package</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
            <strong style={{ fontSize: '1.05rem', color: 'var(--heading, #0f172a)' }}>{product?.name}</strong>
            <span style={{ fontWeight: '700', color: 'var(--text-main, #334155)' }}>₹{basePrice.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* 2. CUSTOMIZATION */}
        <div style={{ borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)', fontWeight: '700' }}>Customization</span>
          <div className="summary-box__row" style={{ marginTop: '6px' }}>
            <span>Theme</span>
            <strong>{selectedTheme}</strong>
          </div>
          <div className="summary-box__row">
            <span>Colors</span>
            <strong>{selectedColors}</strong>
          </div>
        </div>

        {/* 3. ADD-ONS BREAKDOWN */}
        <div style={{ borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)', fontWeight: '700' }}>Add-ons</span>
          {addonBreakdown.length === 0 ? (
            <div className="summary-box__row" style={{ marginTop: '6px' }}>
              <span>Add-ons</span>
              <span style={{ color: '#94a3b8' }}>None available</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {addonBreakdown.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: item.isSelected ? '#16a34a' : '#94a3b8', fontWeight: 'bold' }}>
                      {item.isSelected ? '✓' : '✕'}
                    </span>
                    <span style={{ color: item.isSelected ? 'var(--heading, #0f172a)' : 'var(--text-muted, #64748b)' }}>
                      {item.name}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.78rem', color: item.isSelected ? '#16a34a' : '#94a3b8', background: item.isSelected ? '#f0fdf4' : '#f8fafc', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>
                      {item.isSelected ? 'Selected' : 'Not selected'}
                    </span>
                    <strong style={{ color: item.isSelected ? '#0284c7' : '#94a3b8' }}>
                      {item.isSelected ? `+₹${item.price.toLocaleString('en-IN')}` : '₹0'}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. EVENT DETAILS */}
        <div style={{ borderBottom: '1px solid var(--border, #e2e8f0)', paddingBottom: '10px' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)', fontWeight: '700' }}>Event Details</span>
          <div className="summary-box__row" style={{ marginTop: '6px' }}>
            <span>Date</span>
            <strong>{formatDisplayDate(date)}</strong>
          </div>
          <div className="summary-box__row">
            <span>Time</span>
            <strong>{time || 'Pending'}</strong>
          </div>
          <div className="summary-box__row">
            <span>Pincode</span>
            <strong>{effectivePincode || 'Pending'}</strong>
          </div>
        </div>

        {/* 5. PRICE BREAKUP SUMMARY */}
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted, #64748b)', fontWeight: '700' }}>Price Summary</span>
          <div className="summary-box__row" style={{ marginTop: '6px' }}>
            <span>Base Price</span>
            <span>₹{basePrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="summary-box__row">
            <span>Add-ons</span>
            <span>+₹{addOnTotalCost.toLocaleString('en-IN')}</span>
          </div>
          <div className="summary-box__row pricing-row--total" style={{ borderTop: '1px solid var(--border, #e2e8f0)', paddingTop: '8px', marginTop: '6px' }}>
            <span>Total</span>
            <strong style={{ color: 'var(--accent, #e11d48)', fontSize: '1.2rem' }}>₹{safeTotal.toLocaleString('en-IN')}</strong>
          </div>
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
