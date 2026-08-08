import { useCart } from '../context/CartContext';

function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <article className="cart-item">
      <img src={item.image} alt={item.productName} className="cart-item__image" />
      <div className="cart-item__body">
        <div className="cart-item__header">
          <div>
            <h3>{item.productName}</h3>
            <p>{item.occasion}</p>
          </div>
          <strong>₹{item.totalPrice.toLocaleString('en-IN')}</strong>
        </div>

        <div className="cart-item__details">
          <p><strong>Customization:</strong> {Object.values(item.customization).join(' • ')}</p>
          <p><strong>Pincode:</strong> {item.pincode}</p>
          <p><strong>Date:</strong> {item.date}</p>
          <p><strong>Time:</strong> {item.time}</p>
          <p><strong>Base Price:</strong> ₹{item.basePrice.toLocaleString('en-IN')}</p>
          <p><strong>Add-ons:</strong> ₹{item.addOnPrice.toLocaleString('en-IN')}</p>
          <p><strong>Booking / service charge:</strong> ₹299</p>
          <p><strong>Item total:</strong> ₹{(item.totalPrice * item.quantity).toLocaleString('en-IN')}</p>
        </div>

        <div className="cart-item__actions">
          <div className="quantity-controls">
            <button type="button" onClick={() => updateQuantity(item.key, item.quantity - 1)}>-</button>
            <span>{item.quantity}</span>
            <button type="button" onClick={() => updateQuantity(item.key, item.quantity + 1)}>+</button>
          </div>
          <button type="button" className="text-link" onClick={() => removeItem(item.key)}>
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}

export default CartItem;
