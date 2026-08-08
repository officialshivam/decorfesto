import { useMemo } from 'react';

function CustomizationPanel({ product, selections, onSelectionChange, priceBreakdown, customizationGroups }) {
  const optionGroups = useMemo(() => {
    if (customizationGroups && customizationGroups.length > 0) {
      return customizationGroups;
    }

    return [
      {
        key: 'balloonTheme',
        label: 'Balloon Theme',
        options: [
          { value: 'Classic', price: 0 },
          { value: 'Pastel', price: 0 },
          { value: 'Metallic', price: 400 },
          { value: 'Premium', price: 800 },
        ],
      },
      {
        key: 'balloonColors',
        label: 'Balloon Colors',
        options: [
          { value: 'Pink & White', price: 0 },
          { value: 'Blue & White', price: 0 },
          { value: 'Red & Gold', price: 350 },
          { value: 'Custom', price: 600 },
        ],
      },
      {
        key: 'nameCustomization',
        label: 'Name Customization',
        options: [
          { value: 'No', price: 0 },
          { value: 'Yes', price: 500 },
        ],
      },
      {
        key: 'ledLights',
        label: 'LED Lights',
        options: [
          { value: 'No additional cost', price: 0 },
          { value: 'Add LED Lights', price: 299 },
        ],
      },
      {
        key: 'extraFlowers',
        label: 'Extra Flowers',
        options: [
          { value: 'None', price: 0 },
          { value: 'Standard', price: 299 },
          { value: 'Premium', price: 499 },
        ],
      },
      {
        key: 'cakeTable',
        label: 'Cake Table',
        options: [
          { value: 'Included', price: 0 },
          { value: 'Premium Table', price: 399 },
        ],
      },
    ];
  }, [customizationGroups]);

  return (
    <div className="card-panel customization-panel">
      <div className="card-panel__header">
        <h2>Customize your decoration</h2>
        <p>Personalize your setup and see the total update instantly.</p>
      </div>

      <div className="customization-grid">
        {optionGroups.map((group) => (
          <label key={group.key} className="customization-field">
            <span>{group.label}</span>
            <select
             value={selections[group.key] || group.options[0].value}
              onChange={(event) => onSelectionChange(group.key, event.target.value)}
            >
             {group.options.map((option) => {
                const optionValue = option.price ? `${option.value} +₹${option.price}` : option.value;
                return (
                  <option key={optionValue} value={optionValue}>
                    {option.value}{option.price ? ` +₹${option.price}` : ''}
                  </option>
                );
              })}
            </select>
          </label>
        ))}
      </div>

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
