import { useId } from 'react';

export function sanitize10DigitMobile(value) {
  if (!value) return '';
  // Remove +91 or non-digits, keep only numbers up to 10 digits
  let clean = String(value).replace(/\D/g, '');
  if (clean.startsWith('91') && clean.length > 10) {
    clean = clean.slice(2);
  }
  return clean.slice(-10);
}

export function validate10DigitMobile(value) {
  const clean = sanitize10DigitMobile(value);
  if (clean.length !== 10) {
    return {
      isValid: false,
      clean,
      fullMobile: clean ? `+91${clean}` : '',
      error: 'Please enter a valid 10-digit mobile number.',
    };
  }

  return {
    isValid: true,
    clean,
    fullMobile: `+91${clean}`,
    error: '',
  };
}

function MobileNumberInput({
  value = '',
  onChange,
  label = 'Mobile Number',
  placeholder = 'Enter 10 Digit Mobile No.',
  required = true,
  disabled = false,
  error = '',
  name = 'mobile',
}) {
  const inputId = useId();

  const handleInputChange = (e) => {
    const rawVal = e.target.value;
    const cleanDigits = sanitize10DigitMobile(rawVal);
    onChange(cleanDigits);
  };

  return (
    <div className="search-field mobile-field-wrapper">
      {label && <label htmlFor={inputId}>{label}{required ? ' *' : ''}</label>}
      <div className="mobile-input-group">
        <span className="mobile-prefix-badge" aria-hidden="true">+91</span>
        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]{10}"
          maxLength={10}
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="mobile-input-control"
          aria-invalid={Boolean(error)}
        />
      </div>
      {error ? <span className="input-error-text">{error}</span> : null}
    </div>
  );
}

export default MobileNumberInput;
