import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AvailabilityChecker from '../components/AvailabilityChecker';
import BookingSummary from '../components/BookingSummary';
import CustomizationPanel from '../components/CustomizationPanel';
import DateTimeSelector from '../components/DateTimeSelector';
import ProductImageGallery from '../components/ProductImageGallery';
import { useCart } from '../context/CartContext';
import { getActiveStoredDecorations } from '../services/mockDecorations';
import { checkPincodeServiceability } from '../services/mockServiceAreas';
import { calculateAddOnCost } from '../utils/customizationUtils';
import { isTimeSlotPast } from '../utils/dateTimeUtils';

function getInitialSelections(product) {
  const initial = { themePalette: 'Classic Pink & White' };
  if (!product) return initial;
  const groups = (product.customizationOptions && product.customizationOptions.length > 0)
    ? product.customizationOptions
    : [];

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

  const [cartSuccessMessage, setCartSuccessMessage] = useState('');
  const [cartErrorMessage, setCartErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scroll to top when navigating to a new product
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (product) {
      setSelections(getInitialSelections(product));
    }
  }, [product]);

  const addOnCost = useMemo(() => {
    return calculateAddOnCost(selections);
  }, [selections]);

  const totalPrice = useMemo(() => {
    if (!product) return 0;
    return product.price + addOnCost;
  }, [product, addOnCost]);

  // Discount / Savings calculation (Only positive if originalPrice > price)
  const hasDiscount = useMemo(() => {
    if (!product || !product.originalPrice) return false;
    return product.originalPrice > product.price;
  }, [product]);

  const savings = useMemo(() => {
    if (!hasDiscount) return 0;
    return product.originalPrice - product.price;
  }, [product, hasDiscount]);

  const validationMessages = useMemo(() => {
    const messages = [];
    if (!availability.pincode) {
      messages.push('Please enter your 6-digit celebration pincode.');
    } else if (!availability.available) {
      messages.push(availability.message || 'Decoration service is currently unavailable at this pincode.');
    }

    if (!date) {
      messages.push('Please select a date.');
    } else if (time && isTimeSlotPast(date, time)) {
      messages.push('This time slot is no longer available. Please select another slot.');
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
    setCartSuccessMessage('');
    setCartErrorMessage('');

    if (isSubmitting) return;

    // Validation
    if (!availability.pincode) {
      setCartErrorMessage('Please check service availability first.');
      return;
    }

    const liveCheck = checkPincodeServiceability(availability.pincode);
    if (!liveCheck.isServiceable) {
      setCartErrorMessage(liveCheck.message || 'Sorry, decoration service is not available at this pincode.');
      return;
    }

    if (!date) {
      setCartErrorMessage('Please select a celebration date.');
      return;
    }

    if (!time) {
      setCartErrorMessage('Please select a time slot.');
      return;
    }

    if (isTimeSlotPast(date, time)) {
      setCartErrorMessage('This time slot is no longer available. Please select another slot.');
      return;
    }

    setIsSubmitting(true);

    // Add to cart directly — no auth check required here
    const finalCustomization = { ...selections };
    if (remarks.trim()) {
      finalCustomization.remarks = remarks.trim();
    }

    const itemKey = `${product.id}-${date}-${time}-${availability.pincode}-${Date.now()}`;

    addItem({
      key: itemKey,
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
      originalPrice: product.originalPrice || null,
      addOnPrice: addOnCost,
      totalPrice,
    });

    setCartSuccessMessage('Added to cart!');
    setIsSubmitting(false);

    // Navigate to cart
    navigate('/cart');
  };

  return (
    <main className="page page--detail">
      <div className="product-detail-container">
        <Link to="/catalog" className="text-link" style={{ display: 'inline-block', marginBottom: '20px' }}>
          ← Back to catalog
        </Link>

        <div className="product-detail-grid">
          {/* LEFT COLUMN: GALLERY + ABOUT DECORATION + WHAT'S INCLUDED */}
          <div className="product-left-col">
            <ProductImageGallery images={product.images} productName={product.name} />

            <div className="product-about-section">
              {product.description && (
                <div className="detail-info-block">
                  <h2>About this decoration</h2>
                  <p>{product.description}</p>
                </div>
              )}

              {product.highlights && product.highlights.length > 0 && (
                <div className="detail-info-block">
                  <h2>What's included</h2>
                  <ul className="detail-list">
                    {product.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: HEADER, PRICING, STEPS, CUSTOMIZATION, PINCODE, DATE/TIME, SUMMARY */}
          <div className="product-right-col">
            {/* CATEGORY & RATING HEADER ROW */}
            <div className="product-meta-header">
              {product.occasion && (
                <span className="product-category-pill">{product.occasion}</span>
              )}
              {product.rating != null && (
                <span className="product-rating-pill">
                  ★ {product.rating} ({product.reviewCount != null ? product.reviewCount.toLocaleString('en-IN') : 0} reviews)
                </span>
              )}
            </div>

            {/* TITLE */}
            <h1 className="product-title">{product.name}</h1>

            {/* PRICE CARD */}
            <div className="product-price-card">
              <div className="price-card-left">
                <span className="product-price">
                  ₹{(product.price + addOnCost).toLocaleString('en-IN')}
                </span>
                {hasDiscount && (
                  <span className="product-original-price">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
              <div className="price-card-right">
                <span className="product-savings-tag">
                  You save ₹{savings.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* CUSTOMIZE & BOOK CARD */}
            <div className="customize-book-card">
              <h3>Customize & Book</h3>
              <div className="steps-pills-row">
                <span className="step-pill">1. Customize</span>
                <span className="step-pill">2. Check pincode</span>
                <span className="step-pill">3. Pick date & time</span>
                <span className="step-pill">4. Add to cart</span>
              </div>
            </div>

            {/* CUSTOMIZATION PANEL */}
            <div className="detail-flow-section">
              <CustomizationPanel
                product={product}
                selections={selections}
                onSelectionChange={handleSelectionChange}
                remarks={remarks}
                onRemarksChange={setRemarks}
                priceBreakdown={{ addOns: addOnCost, total: totalPrice }}
              />
            </div>

            {/* PINCODE AVAILABILITY CHECKER */}
            <div className="detail-flow-section">
              <AvailabilityChecker
                value={availability}
                onChange={setAvailability}
              />
            </div>

            {/* DATE & TIME SELECTOR */}
            {availability.available && (
              <div className="detail-flow-section">
                <DateTimeSelector
                  date={date}
                  time={time}
                  onDateChange={setDate}
                  onTimeChange={setTime}
                  pincode={availability.pincode}
                />
              </div>
            )}

            {/* REMARKS */}
            <div className="detail-flow-section card-panel">
              <div className="card-panel__header">
                <h2>Special Instructions / Remarks</h2>
                <p>Any special requirements, theme notes, accessibility needs…</p>
              </div>
              <label className="search-field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span>Custom Requests & Notes (Optional)</span>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any special requirement, color preference, name, message, or other instructions..."
                  rows={3}
                  style={{ resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
                />
              </label>
            </div>

            {/* BOOKING SUMMARY & ADD TO CART */}
            <div className="detail-flow-section">
              <BookingSummary
                product={product}
                totalPrice={totalPrice}
                selections={selections}
                availability={availability}
                pincode={availability.pincode}
                date={date}
                time={time}
                onAddToCart={handleAddToCart}
                isReady={validationMessages.length === 0}
                validationMessages={validationMessages}
                cartSuccessMessage={cartSuccessMessage}
                cartErrorMessage={cartErrorMessage}
                isSubmitting={isSubmitting}
              />
            </div>

            {/* OPTIONAL EXPERIENCES CALLOUT */}
            <div className="optional-feature-callout" style={{ marginTop: '24px' }}>
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
    </main>
  );
}

export default ProductDetail;
