import { Link } from 'react-router-dom';
import CartItem from '../components/CartItem';
import { useCart } from '../context/CartContext';
import { getEnabledCharges, calculateTotalCharges } from '../services/mockSettings';

function Cart() {
  const { items } = useCart();
  const enabledCharges = getEnabledCharges();
  const serviceCharges = calculateTotalCharges();

  console.log('CART BEFORE CHECKOUT', items);

  const subtotal = items.reduce((sum, item) => {
    const itemPrice = typeof item.totalPrice === 'number' && item.totalPrice > 0
      ? item.totalPrice
      : ((item.basePrice || item.price || 0) + (item.addOnPrice || 0));
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
          <span className="eyebrow">Your cart</span>
          <h1>Review your decoration booking</h1>
          <p>Check your selections before proceeding. Your cart is saved across page refreshes.</p>
        </div>

        {items.length === 0 ? (
          <div className="empty-state card-panel">
            <h2>Your cart is empty</h2>
            <p>Add a decoration package to continue the booking journey.</p>
            <Link to="/catalog" className="button">
              Explore Decorations
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <div className="cart-list">
              {items.map((item) => (
                <CartItem key={item.key} item={item} />
              ))}
            </div>

            <aside className="card-panel sticky-summary">
              <div className="card-panel__header">
                <h2>Order Summary</h2>
              </div>
              <div className="summary-box">
                {totalSavings > 0 && (
                  <div className="summary-box__row" style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    <span>Original Price</span>
                    <span style={{ textDecoration: 'line-through' }}>₹{originalSubtotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="summary-box__row">
                  <span>Subtotal</span>
                  <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
                </div>
                {totalSavings > 0 && (
                  <div className="summary-box__row" style={{ color: '#16a34a', fontWeight: '700' }}>
                    <span>🎉 You save</span>
                    <span>₹{totalSavings.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {enabledCharges.map((charge) => (
                  <div key={charge.id} className="summary-box__row">
                    <span>{charge.name}</span>
                    <strong>₹{charge.amount.toLocaleString('en-IN')}</strong>
                  </div>
                ))}
                <div className="summary-box__row pricing-row--total">
                  <span>Total</span>
                  <strong>₹{total.toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <p className="summary-note">
                Your booking will be confirmed after checkout. Sign in or create an account at the next step.
              </p>
              <Link to="/checkout" className="button button--full" style={{ marginTop: '8px' }}>
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
