import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import AvailabilityChecker from '../components/AvailabilityChecker';
import BookingSummary from '../components/BookingSummary';
import CustomizationPanel from '../components/CustomizationPanel';
import DateTimeSelector from '../components/DateTimeSelector';
import { getActiveStoredDecorations } from '../services/mockDecorations';

function getInitialSelections(product) {
  if (!product) return {};
  const groups = (product.customizationOptions && product.customizationOptions.length > 0)
    ? product.customizationOptions
    : [];

  if (groups.length === 0) {
    return {
      balloonTheme: 'Classic',
      balloonColors: 'Pink & White',
      nameCustomization: 'No',
      ledLights: 'No additional cost',
      extraFlowers: 'None',
      cakeTable: 'Included',
    };
  }

  const initial = {};
  groups.forEach((group) => {
    if (group.options && group.options.length > 0) {
      const defaultOpt = group.options[0];
      const val = defaultOpt.price ? `${defaultOpt.value} +₹${defaultOpt.price}` : defaultOpt.value;
      initial[group.key] = val;
    }
  });
  return initial;
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const product = useMemo(
    () => getActiveStoredDecorations().find((item) => String(item.id) === id),
    [id],
  );

  const [selections, setSelections] = useState(() => getInitialSelections(product));
  const [availability, setAvailability] = useState({ available: false, message: '', pincode: '' });
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (product) {
      setSelections(getInitialSelections(product));
    }
  }, [product?.id]);

  if (!product) {
    return (
      <main className="page page--detail">
        <section className="container section">
          <h1>Package not found</h1>
          <p>The decoration package you are looking for is not available right now.</p>
          <Link to="/catalog" className="button">
            Return to catalog
          </Link>
        </section>
      </main>
    );
  }

  const savings = product.originalPrice - product.price;
  const addOnCost = Object.values(selections).reduce((sum, value) => {
    const match = String(value || '').match(/\+(₹\d+)/);
    if (!match) {
      return sum;
    }
    return sum + Number(match[1].replace(/[₹,]/g, ''));
  }, 0);

  const totalPrice = product.price + addOnCost;
  const validationMessages = [];

  if (!availability.available) {
    validationMessages.push('Please check your pincode availability.');
  }
  if (!date) {
    validationMessages.push('Please select a celebration date.');
  }
  if (!time) {
    validationMessages.push('Please select a time slot.');
  }

  const handleSelectionChange = (key, value) => {
    setSelections((current) => ({ ...current, [key]: value }));
  };

  const handleAddToCart = () => {
    if (!availability.available || !date || !time) {
      return;
    }

    addItem({
      key: `${product.id}-${date}-${time}-${availability.pincode}`,
      productId: product.id,
      productName: product.name,
      occasion: product.occasion,
      image: product.image,
      customization: selections,
      pincode: availability.pincode,
      date,
      time,
      basePrice: product.price,
      addOnPrice: addOnCost,
      totalPrice,
    });

    navigate('/cart');
  };

  return (
    <main className="page page--detail">
      <section className="container section section--tight">
        <Link to="/catalog" className="text-link">← Back to catalog</Link>
        <div className="detail-layout">
          <div className="detail-gallery">
            {product.images.map((image, index) => (
              <img key={`${product.id}-${index}`} src={image} alt={`${product.name} view ${index + 1}`} className="detail-gallery__image" />
            ))}
          </div>

          <div className="detail-content">
            <span className="eyebrow">{product.occasion}</span>
            <h1>{product.name}</h1>
            <div className="detail-meta">
              <span className="rating-pill">★ {product.rating}</span>
              <span>{product.reviewCount} reviews</span>
              <span>{product.location}</span>
            </div>

            <div className="price-block">
              <div>
                <strong>₹{product.price.toLocaleString('en-IN')}</strong>
                <span className="product-card__strike">₹{product.originalPrice.toLocaleString('en-IN')}</span>
              </div>
              <span className="product-card__savings">You save ₹{savings.toLocaleString('en-IN')}</span>
            </div>

            <div className="booking-flow-card">
              <h2>Customize & Book</h2>
              <div className="booking-flow-steps">
                <span>1. Customize</span>
                <span>2. Check pincode</span>
                <span>3. Pick date & time</span>
                <span>4. Add to cart</span>
              </div>
            </div>

            <p className="detail-description">{product.description}</p>

            <div className="detail-section">
              <h2>What’s included</h2>
              <ul className="detail-list">
                {product.includedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="detail-section">
              <h2>Highlights</h2>
              <ul className="detail-list">
                {product.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="optional-feature-callout">
              <h3>Optional experiences</h3>
              <p>AI decoration assistance and the ₹49 designer consultation remain optional and do not block your booking.</p>
              <div className="detail-actions">
                <Link to="/ai-assistant" className="button button--small button--ghost">Try AI assistant</Link>
                <Link to="/consultation" className="button button--small">Book consultation</Link>
              </div>
            </div>

            <CustomizationPanel
              product={product}
              selections={selections}
              onSelectionChange={handleSelectionChange}
              priceBreakdown={{ addOns: addOnCost, total: totalPrice }}
              customizationGroups={product.customizationOptions}
            />

            <AvailabilityChecker
              onStatusChange={(status) =>
                setAvailability((current) => ({ ...current, available: status.available, message: status.message }))
              }
              onPincodeChange={(pincode) => setAvailability((current) => ({ ...current, pincode }))}
            />

            <DateTimeSelector
              dateValue={date}
              onDateChange={setDate}
              selectedTime={time}
              onTimeChange={setTime}
              disabled={!availability.available}
            />

            <BookingSummary
              product={product}
              total={totalPrice}
              selections={selections}
              availability={availability}
              date={date}
              time={time}
              onAddToCart={handleAddToCart}
              isReady={Boolean(availability.available && date && time)}
              validationMessages={validationMessages}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export default ProductDetail;
