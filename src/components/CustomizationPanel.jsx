import { useMemo, useRef } from 'react';
import { getCustomizationsForDesign, resolveCategoryName } from '../services/mockCustomizations';

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
          <h3>{resolveCategoryName('colorPalette')}</h3>
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
          <h3>{resolveCategoryName('floralArrangement')}</h3>
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
            <h3>{resolveCategoryName('addon')}</h3>
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
                    {(addon.recommended || addon.featured) ? (
                      <span className="addon-card__category" style={{ background: '#fef3c7', color: '#d97706', fontWeight: '700' }}>
                        ⭐ Recommended
                      </span>
                    ) : addon.category ? (
                      <span className="addon-card__category">{addon.category}</span>
                    ) : null}
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

      {/* PRICING BREAKDOWN CARD */}
      <div className="pricing-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="pricing-row">
          <span>Base price</span>
          <strong>₹{product.price.toLocaleString('en-IN')}</strong>
        </div>

        {/* INDIVIDUAL SELECTED ADD-ONS BREAKDOWN */}
        {(() => {
          const list = [];
          Object.values(selections || {}).forEach((val) => {
            if (!val || typeof val !== 'string') return;
            const strVal = val.trim();
            if (strVal.toLowerCase() === 'no' || strVal.toLowerCase() === 'none') return;

            const match = strVal.match(/^(.*?)\s*\+\s*₹\s*([\d,]+)$/);
            if (match) {
              const name = match[1].trim();
              const amount = parseInt(match[2].replace(/,/g, ''), 10);
              if (!isNaN(amount) && amount > 0) {
                list.push({ name, priceText: `+₹${amount.toLocaleString('en-IN')}` });
              }
            } else {
              list.push({ name: strVal, priceText: 'Included' });
            }
          });

          if (list.length === 0) return null;

          return (
            <div
              className="selected-customizations-breakdown"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                margin: '6px 0',
                padding: '10px 14px',
                background: '#f8fafc',
                borderRadius: '10px',
                borderLeft: '3px solid var(--accent, #e11d48)',
              }}
            >
              <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Selected Customizations
              </span>
              {list.map((item, idx) => (
                <div key={`${item.name}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: '#334155' }}>
                  <span>{item.name}</span>
                  {item.priceText === 'Included' ? (
                    <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Included</span>
                  ) : (
                    <strong style={{ color: '#0284c7' }}>{item.priceText}</strong>
                  )}
                </div>
              ))}
            </div>
          );
        })()}

        <div className="pricing-row">
          <span>Customization / add-ons total</span>
          <strong>₹{priceBreakdown.addOns.toLocaleString('en-IN')}</strong>
        </div>
        <div className="pricing-row pricing-row--total" style={{ borderTop: '2px solid #e2e8f0', paddingTop: '8px', marginTop: '4px' }}>
          <span>Total</span>
          <strong style={{ fontSize: '1.25rem', color: 'var(--accent, #e11d48)' }}>₹{priceBreakdown.total.toLocaleString('en-IN')}</strong>
        </div>
      </div>
    </div>
  );
}

export default CustomizationPanel;
