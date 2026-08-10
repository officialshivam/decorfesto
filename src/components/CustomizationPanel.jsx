import { useMemo, useRef } from 'react';
import { getCustomizationsForDesign } from '../services/mockCustomizations';

function CustomizationPanel({
  product,
  selections,
  onSelectionChange,
  remarks,
  onRemarksChange,
  priceBreakdown,
  customizationGroups,
}) {
  const carouselRef = useRef(null);

  // Fetch admin-managed Color Palettes assigned to this specific design
  const colorPalettes = useMemo(
    () => getCustomizationsForDesign(product?.id, 'colorPalette'),
    [product?.id],
  );

  // Fetch admin-managed Floral Arrangements assigned to this specific design
  const floralArrangements = useMemo(
    () => getCustomizationsForDesign(product?.id, 'floralArrangement'),
    [product?.id],
  );

  // Fetch admin-managed Add-on Cards assigned to this specific design
  const addOnCards = useMemo(
    () => getCustomizationsForDesign(product?.id, 'addon'),
    [product?.id],
  );

  // Additional structured groups (if configured in product metadata)
  const optionGroups = useMemo(() => {
    if (customizationGroups && customizationGroups.length > 0) {
      return customizationGroups;
    }
    return [];
  }, [customizationGroups]);

  const handleScrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -280, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 280, behavior: 'smooth' });
    }
  };

  const handleToggleAddOn = (addon) => {
    const isSelected = Boolean(selections[addon.id]);
    if (isSelected) {
      // Remove add-on from selected customization state
      onSelectionChange(addon.id, null);
    } else {
      // Add add-on to selected customization state
      const priceStr = addon.price ? `+₹${addon.price}` : 'Included';
      onSelectionChange(addon.id, `${addon.name} ${priceStr}`);
    }
  };

  return (
    <div className="card-panel customization-panel">
      <div className="card-panel__header">
        <h2>Customize your decoration</h2>
        <p>Personalize your setup with color themes, florals, and add-ons. Pricing updates instantly.</p>
      </div>

      {/* 1. ADMIN-CONTROLLED THEME COLOR PALETTES */}
      {colorPalettes.length > 0 && (
        <div className="customization-section">
          <h3>Theme Color Palette</h3>
          <div className="palette-grid">
            {colorPalettes.map((palette) => {
              const isSelected =
                selections.themePalette === palette.name ||
                selections.themePalette?.startsWith(palette.name);
              const priceText = palette.price ? `+₹${palette.price}` : 'Included';

              return (
                <div
                  key={palette.id}
                  className={`palette-card${isSelected ? ' palette-card--selected' : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      onSelectionChange('themePalette', null);
                    } else {
                      onSelectionChange(
                        'themePalette',
                        palette.price ? `${palette.name} +₹${palette.price}` : palette.name,
                      );
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (isSelected) {
                        onSelectionChange('themePalette', null);
                      } else {
                        onSelectionChange(
                          'themePalette',
                          palette.price ? `${palette.name} +₹${palette.price}` : palette.name,
                        );
                      }
                    }
                  }}
                >
                  <div className="palette-card__swatches">
                    {Array.isArray(palette.colors) &&
                      palette.colors.map((hex, i) => (
                        <span
                          key={`${palette.id}-${i}`}
                          className="palette-swatch"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                  </div>
                  <div className="palette-card__title">{palette.name}</div>
                  <div className="palette-card__price">{priceText}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. ADMIN-CONTROLLED FLORAL ARRANGEMENTS */}
      {floralArrangements.length > 0 && (
        <div className="customization-section">
          <h3>Floral Arrangement</h3>
          <div className="floral-grid">
            {floralArrangements.map((floral) => {
              const isSelected =
                selections.floralArrangement === floral.name ||
                selections.floralArrangement?.startsWith(floral.name);
              const priceText = floral.price ? `+₹${floral.price}` : 'Included';

              return (
                <div
                  key={floral.id}
                  className={`floral-card${isSelected ? ' floral-card--selected' : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      onSelectionChange('floralArrangement', null);
                    } else {
                      onSelectionChange(
                        'floralArrangement',
                        floral.price ? `${floral.name} +₹${floral.price}` : floral.name,
                      );
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (isSelected) {
                        onSelectionChange('floralArrangement', null);
                      } else {
                        onSelectionChange(
                          'floralArrangement',
                          floral.price ? `${floral.name} +₹${floral.price}` : floral.name,
                        );
                      }
                    }
                  }}
                >
                  {floral.image && (
                    <div className="floral-card__media">
                      <img src={floral.image} alt={floral.name} loading="lazy" />
                    </div>
                  )}
                  <div className="floral-card__content">
                    <h4>{floral.name}</h4>
                    {floral.description && <p>{floral.description}</p>}
                    <div className="floral-card__footer">
                      <span className="floral-card__price">{priceText}</span>
                      <button
                        type="button"
                        className={`button button--small${isSelected ? ' button--primary' : ' button--ghost'}`}
                      >
                        {isSelected ? 'Selected ✓' : 'Select'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. HORIZONTAL SCROLL CAROUSEL FOR ADD-ONS (STRICT TOGGLE & EXACT EQUAL SIZING) */}
      {addOnCards.length > 0 && (
        <div className="customization-section addon-carousel-section">
          <div className="addon-carousel__header">
            <h3>Recommended Add-ons & Experiences</h3>
            <div className="addon-carousel__controls">
              <button
                type="button"
                className="carousel-btn"
                onClick={handleScrollLeft}
                aria-label="Scroll left"
              >
                ‹
              </button>
              <button
                type="button"
                className="carousel-btn"
                onClick={handleScrollRight}
                aria-label="Scroll right"
              >
                ›
              </button>
            </div>
          </div>

          <div className="addon-carousel__track" ref={carouselRef}>
            {addOnCards.map((addon) => {
              const isSelected = Boolean(selections[addon.id]);
              const priceText = addon.price ? `+₹${addon.price}` : 'Included';

              return (
                <div
                  key={addon.id}
                  className={`addon-card${isSelected ? ' addon-card--selected' : ''}`}
                >
                  <div className="addon-card__media">
                    <img src={addon.image} alt={addon.name} loading="lazy" />
                    {addon.category && <span className="addon-card__category">{addon.category}</span>}
                  </div>
                  <div className="addon-card__content">
                    <h4 className="addon-card__title">{addon.name}</h4>
                    <p className="addon-card__desc">{addon.description}</p>
                    <div className="addon-card__footer">
                      <span className="addon-card__price">{priceText}</span>
                      <button
                        type="button"
                        className={`button button--small${isSelected ? ' button--selected' : ' button--ghost'}`}
                        onClick={() => handleToggleAddOn(addon)}
                      >
                        {isSelected ? 'Added ✓' : 'Add'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. OTHER DESIGN-SPECIFIC DROPDOWN GROUPS */}
      {optionGroups.length > 0 && (
        <div className="customization-section">
          <h3>Decoration Details</h3>
          <div className="customization-grid">
            {optionGroups.map((group) => {
              const firstOption = group.options && group.options[0];
              const defaultVal = firstOption
                ? firstOption.price
                  ? `${firstOption.value} +₹${firstOption.price}`
                  : firstOption.value
                : '';
              return (
                <label key={group.key} className="customization-field">
                  <span>{group.label}</span>
                  <select
                    value={selections[group.key] || defaultVal}
                    onChange={(event) => onSelectionChange(group.key, event.target.value)}
                  >
                    {group.options.map((option) => {
                      const optionValue = option.price
                        ? `${option.value} +₹${option.price}`
                        : option.value;
                      return (
                        <option key={optionValue} value={optionValue}>
                          {option.value}
                          {option.price ? ` +₹${option.price}` : ''}
                        </option>
                      );
                    })}
                  </select>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. SPECIAL INSTRUCTIONS / REMARKS FIELD */}
      <div className="customization-section remarks-section">
        <h3>Special Instructions / Remarks</h3>
        <label className="search-field">
          <span>Custom Requests & Notes (Optional)</span>
          <textarea
            value={remarks || ''}
            onChange={(e) => onRemarksChange && onRemarksChange(e.target.value)}
            placeholder="Any special request, color preference, name, message, or other instructions..."
            rows={3}
          />
        </label>
      </div>

      {/* PRICING BREAKDOWN CARD */}
      <div className="pricing-card">
        <div className="pricing-row">
          <span>Base price</span>
          <strong>₹{product.price.toLocaleString('en-IN')}</strong>
        </div>
        <div className="pricing-row">
          <span>Customization / add-ons</span>
          <strong>₹{priceBreakdown.addOns.toLocaleString('en-IN')}</strong>
        </div>
        <div className="pricing-row pricing-row--total">
          <span>Total</span>
          <strong>₹{priceBreakdown.total.toLocaleString('en-IN')}</strong>
        </div>
      </div>
    </div>
  );
}

export default CustomizationPanel;
