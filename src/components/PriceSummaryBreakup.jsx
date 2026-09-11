import { useMemo } from 'react';

export function getCartItemAddOns(item) {
  if (!item) return [];
  const qty = item.quantity || 1;
  const list = [];
  const customization = item.customization || {};

  const rawArray = customization.selectedAddOns || item.selectedAddOns;
  if (Array.isArray(rawArray) && rawArray.length > 0) {
    rawArray.forEach((entry, idx) => {
      if (!entry) return;
      if (typeof entry === 'object' && typeof entry.price === 'number' && entry.price > 0) {
        list.push({
          id: entry.id || `addon-arr-${idx}`,
          name: entry.name || entry.title || 'Add-on',
          unitPrice: entry.price,
          totalPrice: entry.price * qty,
          quantity: qty,
        });
      } else if (typeof entry === 'string') {
        const match = entry.match(/^(.*?)\s*\+\s*₹\s*([\d,]+)$/);
        if (match) {
          const name = match[1].trim();
          const price = parseInt(match[2].replace(/,/g, ''), 10);
          if (!isNaN(price) && price > 0) {
            list.push({
              id: `addon-str-${idx}`,
              name,
              unitPrice: price,
              totalPrice: price * qty,
              quantity: qty,
            });
          }
        }
      }
    });
    if (list.length > 0) return list;
  }

  Object.entries(customization).forEach(([key, val]) => {
    if (!val || key === 'remarks' || key === 'selectedAddOns' || key === 'landmark') return;

    if (typeof val === 'number' && val > 0) {
      list.push({
        id: `addon-num-${key}`,
        name: key,
        unitPrice: val,
        totalPrice: val * qty,
        quantity: qty,
      });
      return;
    }

    if (typeof val === 'object' && val !== null && typeof val.price === 'number' && val.price > 0) {
      list.push({
        id: `addon-obj-${key}`,
        name: val.name || val.title || key,
        unitPrice: val.price,
        totalPrice: val.price * qty,
        quantity: qty,
      });
      return;
    }

    if (typeof val === 'string') {
      const strVal = val.trim();
      if (strVal.toLowerCase() === 'no' || strVal.toLowerCase() === 'none') return;

      const match = strVal.match(/^(.*?)\s*\+\s*₹\s*([\d,]+)$/);
      if (match) {
        const name = match[1].trim();
        const price = parseInt(match[2].replace(/,/g, ''), 10);
        if (!isNaN(price) && price > 0) {
          list.push({
            id: `addon-str-${key}`,
            name,
            unitPrice: price,
            totalPrice: price * qty,
            quantity: qty,
          });
        }
      }
    }
  });

  return list;
}

function PriceSummaryBreakup({ items = [], enabledCharges = [], totalSavings = 0, originalSubtotal = 0, appliedCoupon = null, discountAmount = 0 }) {
  const { totalBasePrice, allAddOns, subtotal, total } = useMemo(() => {
    const basePriceTotal = items.reduce((sum, item) => {
      const base = item.basePrice || item.price || 0;
      const qty = item.quantity || 1;
      return sum + base * qty;
    }, 0);

    const extractedAddOns = [];
    items.forEach((item) => {
      const itemAddOns = getCartItemAddOns(item);
      itemAddOns.forEach((addon) => {
        extractedAddOns.push({
          ...addon,
          key: `${item.key || item.productId}-${addon.name}`,
        });
      });
    });

    const addOnTotal = extractedAddOns.reduce((sum, a) => sum + a.totalPrice, 0);
    const calculatedSubtotal = basePriceTotal + addOnTotal;

    const chargesTotal = items.length > 0
      ? enabledCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
      : 0;

    const grandTotal = Math.max(0, calculatedSubtotal - (discountAmount || 0) + chargesTotal);

    return {
      totalBasePrice: basePriceTotal,
      allAddOns: extractedAddOns,
      subtotal: calculatedSubtotal,
      serviceCharges: chargesTotal,
      total: grandTotal,
    };
  }, [items, enabledCharges, discountAmount]);

  return (
    <div className="summary-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {totalSavings > 0 && originalSubtotal > 0 && (
        <div className="summary-box__row" style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>
          <span>Original Price</span>
          <span style={{ textDecoration: 'line-through' }}>₹{originalSubtotal.toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* 1. Base Price */}
      <div className="summary-box__row" style={{ color: '#334155', fontSize: '0.95rem' }}>
        <span>Base Price</span>
        <strong style={{ color: '#0f172a', fontWeight: '700' }}>₹{totalBasePrice.toLocaleString('en-IN')}</strong>
      </div>

      {/* 2. Add-ons Section */}
      {allAddOns.length > 0 && (
        <div style={{ marginTop: '2px', marginBottom: '2px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Add-ons
          </div>
          {allAddOns.map((addon) => (
            <div
              key={addon.key}
              className="summary-box__row"
              style={{
                paddingLeft: '12px',
                fontSize: '0.88rem',
                color: '#475569',
              }}
            >
              <span>
                {addon.name}
                {addon.quantity > 1 ? ` (×${addon.quantity})` : ''}
              </span>
              <span style={{ color: '#0369a1', fontWeight: '600' }}>
                ₹{addon.totalPrice.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Subtle Divider before Subtotal */}
      <div style={{ borderTop: '1px solid #e2e8f0', margin: '4px 0 2px 0' }} />

      {/* 3. Subtotal */}
      <div className="summary-box__row">
        <span style={{ fontWeight: '600', color: '#0f172a' }}>Subtotal</span>
        <strong style={{ color: '#0f172a', fontWeight: '800' }}>₹{subtotal.toLocaleString('en-IN')}</strong>
      </div>

      {/* 4. Coupon Discount (if applied) */}
      {appliedCoupon && discountAmount > 0 && (
        <div className="summary-box__row" style={{ color: '#16a34a', fontSize: '0.92rem', fontWeight: 600 }}>
          <span>Coupon ({appliedCoupon.code})</span>
          <strong>-₹{discountAmount.toLocaleString('en-IN')}</strong>
        </div>
      )}

      {/* 5. Booking Service Fee & Charges */}
      {enabledCharges.map((charge) => (
        <div key={charge.id} className="summary-box__row" style={{ fontSize: '0.92rem', color: '#475569' }}>
          <span>{charge.name}</span>
          <strong style={{ color: '#0f172a' }}>₹{Number(charge.amount).toLocaleString('en-IN')}</strong>
        </div>
      ))}

      {/* 6. Total */}
      <div className="summary-box__row pricing-row--total" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
        <span>Total</span>
        <strong style={{ color: 'var(--accent, #e11d48)', fontSize: '1.35rem', fontWeight: '800' }}>₹{total.toLocaleString('en-IN')}</strong>
      </div>
    </div>
  );
}

export default PriceSummaryBreakup;
