import { Link } from 'react-router-dom';
import CartItem from '../components/CartItem';
import { useCart } from '../context/CartContext';
import { getEnabledCharges, calculateTotalCharges } from '../services/mockSettings';

function Cart() {
  const { items } = useCart();
  const enabledCharges = getEnabledCharges();
  const serviceCharges = calculateTotalCharges();

  const subtotal = items.reduce((sum, item) => {
    const basePrice = item.basePrice || item.price || 0;
    const addOnPrice = item.addOnPrice || 0;
    const itemPrice = typeof item.totalPrice === 'number' && item.totalPrice > 0
      ? item.totalPrice
      : (basePrice + addOnPrice);
    return sum + itemPrice * (item.quantity || 1);
  }, 0);

  // Calculate total original price for showing savings across all items
  const originalSubtotal = items.reduce((sum, item) => {
    const base = item.basePrice || item.price || 0;
    const originalBase = item.originalPrice && item.originalPrice > base
      ? item.originalPrice
      : base;
    return sum + (originalBase + (item.addOnPrice || 0)) * (item.quantity || 1);
  }, 0);

  const totalSavings = originalSubtotal > subtotal ? originalSubtotal - subtotal : 0;
  const total = subtotal + (items.length > 0 ? serviceCharges : 0);

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">YOUR CART</span>
          <h1>Review your decoration booking</h1>
          <p>Check your package selections, customizations, and package count before proceeding to checkout.</p>
        </div>

        {items.length === 0 ? (
          <div className="empty-state card-panel" style={{ padding: '40px', borderRadius: '16px', textAlign: 'center' }}>
            <h2>Your cart is empty</h2>
            <p>Add a decoration package to continue your celebration booking journey.</p>
            <Link to="/catalog" className="button" style={{ marginTop: '16px' }}>
              Explore Decorations
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-list" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {items.map((item) => (
                <CartItem key={item.key} item={item} />
              ))}
            </div>

            <aside className="card-panel sticky-summary" style={{ borderRadius: '16px', padding: '24px', border: '1px solid var(--border, #e2e8f0)', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
              <div className="card-panel__header" style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Price Summary</h2>
              </div>

              {totalSavings > 0 && (
                <div
                  style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#15803d',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  🎉 You're saving ₹{totalSavings.toLocaleString('en-IN')} on this booking!
                </div>
              )}

              <div className="summary-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {totalSavings > 0 && (
                  <div className="summary-box__row" style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9rem' }}>
                    <span>Original Price</span>
                    <span style={{ textDecoration: 'line-through' }}>₹{originalSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="summary-box__row">
                  <span>Subtotal</span>
                  <strong style={{ color: '#0f172a' }}>₹{subtotal.toLocaleString('en-IN')}</strong>
                </div>
                {enabledCharges.map((charge) => (
                  <div key={charge.id} className="summary-box__row">
                    <span>{charge.name}</span>
                    <strong style={{ color: '#0f172a' }}>₹{charge.amount.toLocaleString('en-IN')}</strong>
                  </div>
                ))}
                <div className="summary-box__row pricing-row--total" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginTop: '6px' }}>
                  <span>Total</span>
                  <strong style={{ color: 'var(--accent, #e11d48)', fontSize: '1.35rem' }}>₹{total.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              <p className="summary-note" style={{ fontSize: '0.82rem', color: '#64748b', margin: '16px 0' }}>
                Your celebration date & slot are reserved upon completing checkout.
              </p>

              <Link to="/checkout" className="button button--full" style={{ padding: '12px 20px', fontSize: '1rem' }}>
                Proceed to Checkout →
              </Link>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

export default Cart;
