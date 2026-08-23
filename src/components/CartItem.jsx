import { useState } from 'react';
import { useCart } from '../context/CartContext';
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
        key,
        name: match[1].trim(),
        priceText: `+₹${match[2]}`,
        isPaid: true,
      });
    } else {
      entries.push({
        key,
        name: strVal,
        priceText: null,
        isPaid: false,
      });
    }
  });
  return entries;
}

function CartItem({ item }) {
  const { updateQuantity, removeAddon, removeItem } = useCart();
  const [toastMessage, setToastMessage] = useState('');

  const basePrice = item.basePrice || item.price || 0;
  const addOnPrice = item.addOnPrice || 0;
  const unitPrice = basePrice + addOnPrice;
  const itemTotal = unitPrice * (item.quantity || 1);

  const addons = parseAddonEntries(item.customization);
  const remarks = item.remarks || item.customization?.remarks;

  const handleRemoveAddon = (addonName) => {
    removeAddon(item.key, addonName);
    setToastMessage(`"${addonName}" removed from cart`);
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <article
      className="cart-item"
      style={{
        borderRadius: '16px',
        padding: '24px',
        background: '#ffffff',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {/* TOAST NOTIFICATION */}
      {toastMessage ? (
        <div
          role="status"
          style={{
            padding: '8px 14px',
            background: '#f0fdf4',
            color: '#166534',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            fontSize: '0.88rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          ✓ {toastMessage}
        </div>
      ) : null}

      {/* ITEM TOP HEADER */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <img
          src={item.image}
          alt={item.productName}
          style={{
            borderRadius: '12px',
            width: '100px',
            height: '100px',
            objectFit: 'cover',
            border: '1px solid #e2e8f0',
          }}
        />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>
                🎉 Decoration Booking
              </span>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--heading, #0f172a)', margin: '2px 0 0 0' }}>
                {item.productName}
              </h3>
            </div>
            <strong style={{ fontSize: '1.35rem', color: 'var(--accent, #e11d48)', fontWeight: '800' }}>
              ₹{itemTotal.toLocaleString('en-IN')}
            </strong>
          </div>

          {/* EVENT LOGISTICS DETAILS */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', fontSize: '0.85rem', color: '#334155', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', marginTop: '4px' }}>
            <span><strong>📍 Pincode:</strong> {item.pincode}</span>
            <span><strong>📅 Date:</strong> {formatDisplayDate(item.date)}</span>
            <span><strong>⏰ Slot:</strong> {item.time}</span>
          </div>
        </div>
      </div>

      {/* 1. PACKAGE SECTION */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>
          Package
        </span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{item.productName}</span>
          <span style={{ fontWeight: '700', color: '#475569' }}>
            Base Price: ₹{basePrice.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* 2. YOUR CUSTOMIZATION SECTION */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>
          YOUR CUSTOMIZATION
        </span>

        {addons.length === 0 ? (
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', margin: '6px 0 0 0' }}>No customizations selected.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
            {addons.map((addon) => (
              <div
                key={addon.name}
                style={{
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.9rem',
                  padding: '8px 12px',
                  background: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #f1f5f9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓</span>
                  <span style={{ fontWeight: '600', color: '#0f172a' }}>{addon.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {addon.priceText ? (
                    <span style={{ fontWeight: '700', color: '#0284c7' }}>{addon.priceText}</span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: '600' }}>Included</span>
                  )}
                  {addon.isPaid && (
                    <button
                      type="button"
                      onClick={() => handleRemoveAddon(addon.name)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #fca5a5',
                        color: '#dc2626',
                        borderRadius: '6px',
                        padding: '3px 10px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      title={`Remove ${addon.name}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SPECIAL INSTRUCTIONS */}
      {remarks && (
        <div style={{ fontSize: '0.88rem', color: '#991b1b', background: '#fef2f2', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #ef4444' }}>
          <strong>Special Instructions:</strong> "{remarks}"
        </div>
      )}

      {/* 3. NO. OF PACKAGES & REMOVE PACKAGE ACTIONS */}
      <div
        style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '16px',
          marginTop: '4px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' }}>No. of Packages</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity - 1)}
              disabled={item.quantity <= 1}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: item.quantity <= 1 ? '#f1f5f9' : '#ffffff',
                color: item.quantity <= 1 ? '#94a3b8' : '#0f172a',
                cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1.1rem',
              }}
              title={item.quantity <= 1 ? 'Minimum 1 package required' : 'Decrease package count'}
            >
              −
            </button>
            <span style={{ fontWeight: '800', fontSize: '1.05rem', minWidth: '24px', textAlign: 'center', color: '#0f172a' }}>
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.key, item.quantity + 1)}
              disabled={item.quantity >= 3}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: item.quantity >= 3 ? '#f1f5f9' : '#ffffff',
                color: item.quantity >= 3 ? '#94a3b8' : '#0f172a',
                cursor: item.quantity >= 3 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '1.1rem',
              }}
              title={item.quantity >= 3 ? 'Maximum 3 packages per booking' : 'Increase package count'}
            >
              +
            </button>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Maximum 3 packages per booking</span>
        </div>

        <button
          type="button"
          onClick={() => removeItem(item.key)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '0.85rem',
            cursor: 'pointer',
            textDecoration: 'underline',
            padding: '4px 8px',
          }}
        >
          Remove Package
        </button>
      </div>
    </article>
  );
}

export default CartItem;
