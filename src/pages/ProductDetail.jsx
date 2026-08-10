import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import AvailabilityChecker from '../components/AvailabilityChecker';
import BookingSummary from '../components/BookingSummary';
import CustomizationPanel from '../components/CustomizationPanel';
import DateTimeSelector from '../components/DateTimeSelector';
import ProductImageGallery from '../components/ProductImageGallery';
import { getActiveStoredDecorations } from '../services/mockDecorations';
import { findServiceAreaByPincode } from '../services/mockServiceAreas';

function getInitialSelections(product) {
  if (!product) return {};
  const groups = (product.customizationOptions && product.customizationOptions.length > 0)
    ? product.customizationOptions
    : [];

  if (groups.length === 0) {
    return {};
  }

  const initial = {};
  groups.forEach((group) => {
    if (group.type === 'color_palette' && group.options && group.options.length > 0) {
      initial[group.id] = group.options[0].name;
    }
  });

  return initial;
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();

  const [decorations, setDecorations] = useState(() => getActiveStoredDecorations());

  useEffect(() => {
    setDecorations(getActiveStoredDecorations());
  }, [id]);

  const product = useMemo(
    () => decorations.find((item) => String(item.id) === String(id)),
    [decorations, id],
  );

  const [selections, setSelections] = useState(() => getInitialSelections(product));
  const [remarks, setRemarks] = useState('');
  const [availability, setAvailability] = useState({ available: false, pincode: '', message: '' });
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (product) {
      setSelections(getInitialSelections(product));
    }
  }, [product]);

  const addOnCost = useMemo(() => {
    if (!product || !product.customizationOptions) return 0;
    return product.customizationOptions.reduce((total, group) => {
      const selectedValue = selections[group.id];
      if (!selectedValue || !group.options) return total;
      const selectedOption = group.options.find((opt) => opt.id === selectedValue || opt.name === selectedValue);
      return total + (selectedOption?.price || 0);
    }, 0);
  }, [product, selections]);

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    return product.price + addOnCost;
  }, [product, addOnCost]);

  const savings = useMemo(() => {
    if (!product || !product.originalPrice) return 0;
    return Math.max(0, product.originalPrice - product.price);
  }, [product]);

  const validationMessages = useMemo(() => {
    const messages = [];
    if (!availability.pincode) {
      messages.push('Please enter your 6-digit celebration pincode.');
    } else if (!availability.available) {
      messages.push(availability.message || 'Decoration service is currently unavailable at this pincode.');
    }

    if (!date) {
      messages.push('Please select a date.');
    }

    if (!time) {
      messages.push('Please pick an arrival time slot.');
    }

    return messages;
  }, [availability, date, time]);

  if (!product) {
    return (
      <main className="page">
        <section className="container section">
          <div className="empty-state">
            <h1>Decoration design not found</h1>
            <p>The package you are looking for does not exist or has been disabled.</p>
            <Link to="/catalog" className="button">Browse Catalog</Link>
          </div>
        </section>
      </main>
    );
  }

  const handleSelectionChange = (key, value) => {
    setSelections((current) => {
      if (value === null || value === undefined || value === '') {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: value };
    });
  };

  const handleAddToCart = () => {
    // Live serviceability double-check before adding to cart
    const liveArea = findServiceAreaByPincode(availability.pincode);
    const isServiceableLive = liveArea ? liveArea.serviceable === true : availability.available;

    if (!isServiceableLive || !date || !time) {
      return;
    }

    const finalCustomization = {
      ...selections,
    };
    if (remarks.trim()) {
      finalCustomization.remarks = remarks.trim();
    }

    addItem({
      key: `${product.id}-${date}-${time}-${availability.pincode}`,
      productId: product.id,
      productName: product.name,
      occasion: product.occasion,
      image: product.image,
      customization: finalCustomization,
      remarks: remarks.trim(),
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
        <Link to="/catalog" className="text-link" style={{ display: 'inline-block', marginBottom: '16px' }}>
          ← Back to catalog
        </Link>

        <div className="detail-layout">
          {/* LEFT COLUMN: PROMINENT GALLERY + DESCRIPTION & INCLUDED ITEMS */}
          <div className="detail-layout__left">
            <ProductImageGallery
              images={product.images && product.images.length > 0 ? product.images : [product.image]}
              productName={product.name}
            />

            <div className="detail-section desktop-only-info" style={{ marginTop: '24px' }}>
              <h2>About this decoration</h2>
              <p className="detail-description">{product.description}</p>
            </div>

            <div className="detail-section desktop-only-info">
              <h2>What’s included</h2>
              <ul className="detail-list">
                {product.includedItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="detail-section desktop-only-info">
              <h2>Highlights</h2>
              <ul className="detail-list">
                {product.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="optional-feature-callout desktop-only-info" style={{ marginTop: '16px' }}>
              <h3>Optional experiences</h3>
              <p>AI decoration assistance and designer consultation remain optional and do not block your booking.</p>
              <div className="detail-actions">
                <Link to="/ai-assistant" className="button button--small button--ghost">Try AI assistant</Link>
                <Link to="/consultation" className="button button--small">Book consultation</Link>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: PRODUCT META, TITLE, PRICE, CUSTOMIZATION & BOOKING PANEL */}
          <div className="detail-layout__right">
            <div className="detail-meta">
              <span className="product-card__occasion">{product.occasion}</span>
              <span className="rating-pill">★ {product.rating} ({product.reviewCount} reviews)</span>
            </div>

            <h1>{product.name}</h1>

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

            <CustomizationPanel
              product={product}
              selections={selections}
              onSelectionChange={handleSelectionChange}
              remarks={remarks}
              onRemarksChange={setRemarks}
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

            {/* MOBILE ONLY DESCRIPTION & INCLUDED ITEMS */}
            <div className="mobile-only-info" style={{ marginTop: '24px' }}>
              <div className="detail-section">
                <h2>About this decoration</h2>
                <p className="detail-description">{product.description}</p>
              </div>

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

              <div className="optional-feature-callout" style={{ marginTop: '16px' }}>
                <h3>Optional experiences</h3>
                <p>AI decoration assistance and designer consultation remain optional.</p>
                <div className="detail-actions">
                  <Link to="/ai-assistant" className="button button--small button--ghost">Try AI assistant</Link>
                  <Link to="/consultation" className="button button--small">Book consultation</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ProductDetail;
