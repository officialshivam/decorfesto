import { Link } from 'react-router-dom';
import CartItem from '../components/CartItem';
import { useCart } from '../context/CartContext';

function Cart() {
  const { items } = useCart();

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice * item.quantity, 0);
  const serviceCharges = items.length > 0 ? 299 : 0;
  const total = subtotal + serviceCharges;

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Your cart</span>
          <h1>Review your decoration booking</h1>
          <p>Everything you selected is stored locally so the experience feels real while remaining frontend-only.</p>
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
                <h2>Order summary</h2>
              </div>
              <div className="summary-box">
                <div className="summary-box__row">
                  <span>Subtotal</span>
                  <strong>₹{subtotal.toLocaleString('en-IN')}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Service / booking charges</span>
                  <strong>₹{serviceCharges.toLocaleString('en-IN')}</strong>
                </div>
                <div className="summary-box__row pricing-row--total">
                  <span>Total</span>
                  <strong>₹{total.toLocaleString('en-IN')}</strong>
                </div>
              </div>
              <p className="summary-note">Your booking request will be reviewed by DecorFesto after checkout.</p>
              <Link to="/checkout" className="button button--full">
                Proceed to Checkout
              </Link>
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}

export default Cart;
