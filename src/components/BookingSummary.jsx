import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getCustomizationsForDesign, defaultColorPalettes } from '../services/mockCustomizations';
import { formatDisplayDate } from '../utils/dateTimeUtils';

const COLOR_NAMES_MAP = {
  'Classic Pink & White': 'Pink + White',
  'Royal Blue & White': 'Blue + White',
  'Red & Gold Luxury': 'Red + Gold',
  'Pastel Rainbow': 'Pastel Pink + Pastel Blue + Yellow + Lavender',
  'Emerald & Champagne Gold': 'Emerald Green + Champagne Gold',
  'Custom Signature Palette': 'Purple + Pink (Custom Request)',
};

function hexToColorName(hex) {
  if (!hex) return '';
  const clean = hex.toUpperCase();
  if (clean === '#FFC0CB' || clean === '#FF69B4' || clean === '#FFB6C1') return 'Pink';
  if (clean === '#FFFFFF') return 'White';
  if (clean === '#1E90FF' || clean === '#B0E0E6') return 'Blue';
  if (clean === '#DC143C') return 'Red';
  if (clean === '#FFD700' || clean === '#F7E7CE') return 'Gold';
  if (clean === '#FFFACD') return 'Yellow';
  if (clean === '#E6E6FA') return 'Lavender';
  if (clean === '#008080') return 'Emerald Green';
  if (clean === '#8A2BE2') return 'Purple';
  return clean;
}

function BookingSummary({
  product,
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
  const basePrice = product?.price || 0;

  const effectivePincode = (typeof availability === 'object' && availability?.pincode)
    ? availability.pincode
    : (typeof pincode === 'string' ? pincode : 'Pending');

  // Fetch color palettes assigned to this product or global default palettes
  const availablePalettes = useMemo(() => {
    const productPalettes = getCustomizationsForDesign(product?.id, 'colorPalette');
    return productPalettes.length > 0 ? productPalettes : defaultColorPalettes;
  }, [product?.id]);

  // Resolve selected theme palette name and cost
  const rawThemeSelection = selections.themePalette || selections.balloonTheme || '';

  const matchedPalette = useMemo(() => {
    if (!rawThemeSelection) return availablePalettes[0] || defaultColorPalettes[0];

    const found = availablePalettes.find((p) => {
      if (rawThemeSelection === p.name) return true;
      if (rawThemeSelection.startsWith(p.name)) return true;
      if (p.name.startsWith(rawThemeSelection)) return true;
      return false;
    });

    return found || availablePalettes[0] || defaultColorPalettes[0];
  }, [availablePalettes, rawThemeSelection]);

  const selectedThemeName = matchedPalette ? matchedPalette.name : 'Classic Pink & White';
  const selectedThemePrice = matchedPalette ? (matchedPalette.price || 0) : 0;
  const selectedThemePriceText = selectedThemePrice > 0 ? `+₹${selectedThemePrice.toLocaleString('en-IN')}` : 'Included';

  // Resolve colors for selected theme palette dynamically
  const selectedThemeColors = useMemo(() => {
    if (matchedPalette) {
      if (COLOR_NAMES_MAP[matchedPalette.name]) {
        return COLOR_NAMES_MAP[matchedPalette.name];
      }
      if (Array.isArray(matchedPalette.colors) && matchedPalette.colors.length > 0) {
        return matchedPalette.colors.map(hexToColorName).filter(Boolean).join(' + ');
      }
    }
    return 'Pink + White';
  }, [matchedPalette]);

  // Fetch available add-ons and florals for this product
  const availableAddons = useMemo(() => {
    if (!product?.id) return [];
    return getCustomizationsForDesign(product.id, 'addon');
  }, [product?.id]);

  const availableFlorals = useMemo(() => {
    if (!product?.id) return [];
    return getCustomizationsForDesign(product.id, 'floralArrangement');
  }, [product?.id]);

  // Determine selected add-ons list ONLY
  const selectedAddonsList = useMemo(() => {
    const list = [];

    // Paid Florals
    availableFlorals.forEach((floral) => {
      if (floral.price === 0) return;
      const isSelected = Object.values(selections).some(
        (val) => typeof val === 'string' && val.includes(floral.name),
      );
      if (isSelected) {
        list.push({
          id: floral.id,
          name: floral.name,
          price: floral.price,
        });
      }
    });

    // Paid General Addons
    availableAddons.forEach((addon) => {
      const isSelected = Boolean(selections[addon.id]) || Object.values(selections).some(
        (val) => typeof val === 'string' && val.includes(addon.name),
      );
      if (isSelected) {
        list.push({
          id: addon.id,
          name: addon.name,
          price: addon.price,
        });
      }
    });

    return list;
  }, [availableAddons, availableFlorals, selections]);

  const addOnTotalCost = useMemo(() => {
    return selectedAddonsList.reduce((sum, item) => sum + item.price, 0);
  }, [selectedAddonsList]);

  // Compute final authoritative total for summary view
  const safeTotal = useMemo(() => {
    if (typeof totalPrice === 'number' && totalPrice > 0) {
      return totalPrice;
    }
    return basePrice + selectedThemePrice + addOnTotalCost;
  }, [basePrice, selectedThemePrice, addOnTotalCost, totalPrice]);

  return (
    <aside
      className="card-panel sticky-summary"
      style={{
        borderRadius: '16px',
        padding: '24px',
        background: '#ffffff',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      <div className="card-panel__header" style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>BOOKING SUMMARY</h2>
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '4px 0 0 0' }}>Review package details, customizations, add-ons, and pricing breakdown.</p>
      </div>

      <div className="summary-box" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* 1. PACKAGE SECTION */}
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>PACKAGE</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '6px' }}>
            <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>{product?.name}</strong>
            <span style={{ fontWeight: '700', color: '#334155', fontSize: '1.05rem' }}>₹{basePrice.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* 2. CUSTOMIZATION SECTION */}
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>CUSTOMIZATION</span>
          <div className="summary-box__row" style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#475569', fontWeight: '500' }}>Theme</span>
            <div style={{ textAlign: 'right' }}>
              <strong style={{ color: '#0f172a', display: 'block' }}>{selectedThemeName}</strong>
              <span style={{ fontSize: '0.82rem', color: selectedThemePrice > 0 ? '#0284c7' : '#16a34a', fontWeight: '700' }}>
                {selectedThemePriceText}
              </span>
            </div>
          </div>
          <div className="summary-box__row" style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#475569', fontWeight: '500' }}>Colors</span>
            <strong style={{ color: '#0f172a', textAlign: 'right' }}>{selectedThemeColors}</strong>
          </div>
        </div>

        {/* 3. ADD-ONS SECTION (SHOW ONLY SELECTED ADD-ONS) */}
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>ADD-ONS</span>
          {selectedAddonsList.length === 0 ? (
            <div style={{ marginTop: '6px', color: '#64748b', fontSize: '0.88rem' }}>
              No add-ons selected
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              {selectedAddonsList.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                    <span style={{ color: '#0f172a', fontWeight: '600' }}>{item.name}</span>
                  </div>
                  <strong style={{ color: '#0284c7' }}>+₹{item.price.toLocaleString('en-IN')}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. EVENT DETAILS */}
        <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>EVENT DETAILS</span>
          <div className="summary-box__row" style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#475569' }}>Date</span>
            <strong style={{ color: '#0f172a' }}>{formatDisplayDate(date)}</strong>
          </div>
          <div className="summary-box__row" style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#475569' }}>Time</span>
            <strong style={{ color: '#0f172a' }}>{time || 'Pending'}</strong>
          </div>
          <div className="summary-box__row" style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#475569' }}>Pincode</span>
            <strong style={{ color: '#0f172a' }}>{effectivePincode || 'Pending'}</strong>
          </div>
        </div>

        {/* 5. PRICE SUMMARY */}
        <div>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>PRICE SUMMARY</span>
          <div className="summary-box__row" style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: '#475569' }}>Base Price</span>
            <span style={{ color: '#0f172a', fontWeight: '600' }}>₹{basePrice.toLocaleString('en-IN')}</span>
          </div>
          {selectedThemePrice > 0 && (
            <div className="summary-box__row" style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: '#475569' }}>Customization ({selectedThemeName})</span>
              <span style={{ color: '#0284c7', fontWeight: '600' }}>+₹{selectedThemePrice.toLocaleString('en-IN')}</span>
            </div>
          )}
          {addOnTotalCost > 0 && (
            <div className="summary-box__row" style={{ marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: '#475569' }}>Add-ons</span>
              <span style={{ color: '#0284c7', fontWeight: '600' }}>+₹{addOnTotalCost.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="summary-box__row pricing-row--total" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>TOTAL</span>
            <strong style={{ color: 'var(--accent, #e11d48)', fontSize: '1.3rem' }}>₹{safeTotal.toLocaleString('en-IN')}</strong>
          </div>
        </div>
      </div>

      {cartSuccessMessage ? (
        <div
          className="admin-success-banner"
          role="alert"
          style={{ marginTop: '16px', padding: '12px 14px', background: '#e6f4ea', color: '#137333', borderRadius: '10px', fontWeight: '700', fontSize: '0.9rem' }}
        >
          ✓ {cartSuccessMessage}
        </div>
      ) : null}

      {cartErrorMessage ? (
        <div
          className="admin-error-banner"
          role="alert"
          style={{ marginTop: '16px', padding: '12px 14px', background: '#fce8e6', color: '#c5221f', borderRadius: '10px', fontWeight: '600', fontSize: '0.88rem' }}
        >
          ✕ {cartErrorMessage}
        </div>
      ) : null}

      {validationMessages.length > 0 && !cartErrorMessage && !cartSuccessMessage ? (
        <div className="validation-box" style={{ marginTop: '16px' }}>
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
        style={{ marginTop: '16px', padding: '12px 20px', fontSize: '1rem' }}
      >
        {isSubmitting ? 'Adding...' : 'Add to Cart'}
      </button>
      <Link to="/cart" className="button button--ghost button--full" style={{ marginTop: '8px', textAlign: 'center' }}>
        View Cart
      </Link>
    </aside>
  );
}

export default BookingSummary;
