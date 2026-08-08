import { Link } from 'react-router-dom';

function ProductCard({ product }) {
  const savings = product.originalPrice - product.price;

  return (
    <article className="product-card">
      <img src={product.imageUrl || product.image} alt={product.name} className="product-card__image" />
      <div className="product-card__content">
        <div className="product-card__meta">
          <span className="product-card__occasion">{product.occasion}</span>
          <span className="product-card__rating">★ {product.rating}</span>
        </div>

        <h3>{product.name}</h3>
        <p>{product.description}</p>

        <div className="product-card__price-row">
          <div>
            <strong>₹{product.price.toLocaleString('en-IN')}</strong>
            <span className="product-card__strike">₹{product.originalPrice.toLocaleString('en-IN')}</span>
          </div>
          <span className="product-card__savings">Save ₹{savings.toLocaleString('en-IN')}</span>
        </div>

        <div className="product-card__footer">
          <span>{product.reviewCount} reviews</span>
          <Link to={`/product/${product.id}`} className="button button--small">
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}

export default ProductCard;
