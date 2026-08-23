import { useCart } from '../context/CartContext';
import { getEnabledCharges, calculateTotalCharges } from '../services/mockSettings';
import { formatDisplayDate } from '../utils/dateTimeUtils';

function parseAddonEntries(customization = {}) {
  const entries = [];
  Object.entries(customization).forEach(([key, val]) => {
    if (!val || key === 'remarks') return;
    const strVal = String(val).trim();
    if (strVal.toLowerCase() === 'no' || strVal.toLowerCase() === 'none') return;

    const match = strVal.match(/^(.*?)\s*\+\s*₹\s*([\d,]+)$/);
    if (match) {
      entries.push({
        name: match[1].trim(),
        priceText: `+₹${match[2]}`,
      });
    } else {
      entries.push({
        name: strVal,
        priceText: null,
      });
    }
  });
  return entries;
}

function CartItem({ item }) {
  const { updateQuantity } = useCart();
  const enabledCharges = getEnabledCharges();
  const serviceFee = calculateTotalCharges();

  const basePrice = item.basePrice || item.price || 0;
  const addOnPrice = item.addOnPrice || 0;
  const itemTotal = (item.totalPrice || (basePrice + addOnPrice)) * (item.quantity || 1);
  const addons = parseAddonEntries(item.customization);
  const remarks = item.remarks || item.customization?.remarks;

  return (
    <article className="cart-item" style={{ borderRadius: '16px', padding: '20px', background: '#ffffff', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
      <img src={item.image} alt={item.productName} className="cart-item__image" style={{ borderRadius: '12px', width: '120px', height: '120px', objectFit: 'cover' }} />
      <div className="cart-item__body" style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
        <div className="cart-item__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--heading, #0f172a)', margin: 0 }}>{item.productName}</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontWeight: '500' }}>{item.occasion}</span>
          </div>
          <strong style={{ fontSize: '1.3rem', color: 'var(--accent, #e11d48)', fontWeight: '800' }}>
            ₹{itemTotal.toLocaleString('en-IN')}
          </strong>
        </div>

        {/* LOGISTICS DETAILS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '0.88rem', color: 'var(--text-main, #334155)', background: '#f8fafc', padding: '10px 14px', borderRadius: '10px' }}>
          <span><strong>Pincode:</strong> {item.pincode}</span>
          <span><strong>Date:</strong> {formatDisplayDate(item.date)}</span>
          <span><strong>Slot:</strong> {item.time}</span>
        </div>

        {/* PRICE BREAKDOWN LIST */}
        <div className="cart-item__breakdown" style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px dashed #e2e8f0', paddingTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: '#475569' }}>
            <span>Base Price</span>
            <strong style={{ color: '#0f172a' }}>₹{basePrice.toLocaleString('en-IN')}</strong>
          </div>

          {/* DYNAMIC INDIVIDUAL ADD-ON BREAKDOWN ROWS */}
          {addons.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--accent-light, #fecdd3)' }}>
              {addons.map((addon) => (
                <div key={addon.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#64748b' }}>
                  <span>{addon.name}</span>
                  {addon.priceText ? <strong style={{ color: '#0284c7' }}>{addon.priceText}</strong> : <span style={{ color: '#94a3b8' }}>Included</span>}
                </div>
              ))}
            </div>
          )}

          {addOnPrice > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: '#475569', fontWeight: '600' }}>
              <span>Customization / Add-ons Total</span>
              <strong style={{ color: '#0284c7' }}>+₹{addOnPrice.toLocaleString('en-IN')}</strong>
            </div>
          )}

          {enabledCharges.map((charge) => (
            <div key={charge.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', color: '#475569' }}>
              <span>{charge.name}</span>
              <strong style={{ color: '#0f172a' }}>₹{charge.amount.toLocaleString('en-IN')}</strong>
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', color: '#0f172a', fontWeight: '800', borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
            <span>Total</span>
            <strong style={{ color: 'var(--accent, #e11d48)', fontSize: '1.15rem' }}>₹{(itemTotal + serviceFee).toLocaleString('en-IN')}</strong>
          </div>
        </div>

        {remarks && (
          <div style={{ fontSize: '0.88rem', color: '#991b1b', background: '#fef2f2', padding: '8px 12px', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
            <strong>Special Instructions:</strong> "{remarks}"
          </div>
        )}

        {/* QUANTITY CONTROL (NO REMOVE BUTTON) */}
        <div className="cart-item__actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
          <div className="quantity-controls" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: '600', color: '#64748b' }}>Quantity:</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity - 1)}
              style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              -
            </button>
            <span style={{ fontWeight: '700', fontSize: '1rem', minWidth: '20px', textAlign: 'center' }}>{item.quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity + 1)}
              style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer', fontWeight: 'bold' }}
            >
              +
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default CartItem;
