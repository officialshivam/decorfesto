import { useEffect, useState } from 'react';
import MobileNumberInput, { sanitize10DigitMobile, validate10DigitMobile } from './MobileNumberInput';
import { checkPincodeServiceability } from '../services/mockServiceAreas';

function AddAddressDrawer({ isOpen, onClose, initialData = {}, registeredMobile = '', onSaveAddress, isSaving = false }) {
  const [form, setForm] = useState({
    fullAddress: '',
    flatNo: '',
    pincode: '',
    mobile: sanitize10DigitMobile(registeredMobile),
    altMobile: '',
    landmark: '',
    addressType: 'Home',
  });

  const [errors, setErrors] = useState({});
  const [pincodeStatus, setPincodeStatus] = useState({ isValidating: false, isServiceable: null, message: '', city: '', state: '' });

  useEffect(() => {
    if (isOpen) {
      const regMob = sanitize10DigitMobile(initialData?.mobile || registeredMobile || '');
      setForm({
        fullAddress: initialData?.fullAddress || initialData?.address || '',
        flatNo: initialData?.flatNo || initialData?.flatAddress || '',
        pincode: initialData?.pincode || '',
        mobile: regMob,
        altMobile: sanitize10DigitMobile(initialData?.altMobile || initialData?.alternateMobile || ''),
        landmark: initialData?.landmark || '',
        addressType: initialData?.addressType || 'Home',
      });
      setErrors({});

      if (initialData?.pincode && initialData.pincode.length === 6) {
        const check = checkPincodeServiceability(initialData.pincode);
        setPincodeStatus({
          isValidating: false,
          isServiceable: check.isServiceable,
          message: check.message || (check.isServiceable ? 'Service area available' : 'Service unavailable'),
          city: check.city || 'Delhi NCR',
          state: check.state || 'Delhi',
        });
      } else {
        setPincodeStatus({ isValidating: false, isServiceable: null, message: '', city: '', state: '' });
      }
    }
  }, [isOpen, initialData, registeredMobile]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((curr) => ({ ...curr, [name]: value }));
    setErrors((curr) => ({ ...curr, [name]: '' }));

    if (name === 'pincode') {
      const cleanPincode = value.replace(/\D/g, '').slice(0, 6);
      if (cleanPincode.length === 6) {
        setPincodeStatus({ isValidating: true, isServiceable: null, message: 'Validating pincode…', city: '', state: '' });
        const check = checkPincodeServiceability(cleanPincode);
        setPincodeStatus({
          isValidating: false,
          isServiceable: check.isServiceable,
          message: check.message || (check.isServiceable ? '✓ Service area available' : '✕ Service unavailable at this pincode'),
          city: check.city || 'Delhi NCR',
          state: check.state || 'Delhi',
        });
      } else {
        setPincodeStatus({ isValidating: false, isServiceable: null, message: '', city: '', state: '' });
      }
    }
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.fullAddress.trim()) {
      nextErrors.fullAddress = 'Full delivery address is required.';
    }

    if (!form.flatNo.trim()) {
      nextErrors.flatNo = 'Flat / House No. is required.';
    }

    const cleanPin = form.pincode.replace(/\D/g, '');
    if (!cleanPin || cleanPin.length !== 6) {
      nextErrors.pincode = 'Please enter a valid 6-digit Indian pincode.';
    } else {
      const check = checkPincodeServiceability(cleanPin);
      if (!check.isServiceable) {
        nextErrors.pincode = check.message || 'Decoration service is unavailable at this pincode.';
      }
    }

    if (!validate10DigitMobile(form.mobile).isValid) {
      nextErrors.mobile = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
    }

    if (form.altMobile.trim()) {
      if (!validate10DigitMobile(form.altMobile).isValid) {
        nextErrors.altMobile = 'Enter a valid 10-digit alternate mobile number.';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanPin = form.pincode.replace(/\D/g, '').slice(0, 6);
    const pinCheck = checkPincodeServiceability(cleanPin);

    const savedAddressObj = {
      fullAddress: form.fullAddress.trim(),
      flatNo: form.flatNo.trim(),
      address: `${form.flatNo.trim()}, ${form.fullAddress.trim()}`,
      pincode: cleanPin,
      mobile: validate10DigitMobile(form.mobile).fullMobile,
      altMobile: form.altMobile.trim() ? validate10DigitMobile(form.altMobile).fullMobile : '',
      landmark: form.landmark.trim(),
      addressType: form.addressType || 'Home',
      city: pinCheck.city || 'Delhi NCR',
      state: pinCheck.state || 'Delhi',
    };

    onSaveAddress(savedAddressObj);
  };

  const isEditing = Boolean(initialData?.fullAddress || initialData?.address);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <aside
        style={{
          width: '460px',
          maxWidth: '92vw',
          height: '100%',
          background: '#ffffff',
          boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.16)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1101,
          animation: 'slideInRight 0.25s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* DRAWER HEADER */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              {isEditing ? 'Edit Delivery Address' : 'Add Delivery Address'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Enter your celebration location and contact details.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '1.4rem',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px 8px',
            }}
            title="Close drawer"
          >
            ✕
          </button>
        </div>

        {/* DRAWER BODY FORM */}
        <form onSubmit={handleSubmit} style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* ADDRESS TYPE SELECTION */}
          <div>
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
              Address Type
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              {['Home', 'Office', 'Other'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm((curr) => ({ ...curr, addressType: type }))}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: form.addressType === type ? '2px solid var(--accent, #e11d48)' : '1px solid #cbd5e1',
                    background: form.addressType === type ? '#fff1f2' : '#ffffff',
                    color: form.addressType === type ? '#9F1239' : '#334155',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                  }}
                >
                  {type === 'Home' ? '🏠 Home' : type === 'Office' ? '🏢 Office' : '📍 Other'}
                </button>
              ))}
            </div>
          </div>

          {/* FLAT / HOUSE NO. */}
          <label className="search-field">
            <span>Flat / House No. *</span>
            <input
              name="flatNo"
              value={form.flatNo}
              onChange={handleChange}
              placeholder="e.g. Flat 203, Block B"
              required
            />
            {errors.flatNo && <small className="field-error">{errors.flatNo}</small>}
          </label>

          {/* FULL DELIVERY ADDRESS */}
          <label className="search-field">
            <span>Full Delivery Address *</span>
            <textarea
              name="fullAddress"
              value={form.fullAddress}
              onChange={handleChange}
              placeholder="Flat, Building, Street, Area"
              rows={3}
              required
              style={{ resize: 'vertical' }}
            />
            {errors.fullAddress && <small className="field-error">{errors.fullAddress}</small>}
          </label>

          {/* PINCODE */}
          <label className="search-field">
            <span>Pincode *</span>
            <input
              name="pincode"
              value={form.pincode}
              onChange={handleChange}
              placeholder="6-digit pincode"
              maxLength={6}
              required
            />
            {pincodeStatus.message && (
              <small style={{ color: pincodeStatus.isServiceable ? '#16a34a' : '#dc2626', fontWeight: '700', marginTop: '4px', display: 'block' }}>
                {pincodeStatus.message}
              </small>
            )}
            {errors.pincode && <small className="field-error">{errors.pincode}</small>}
          </label>

          {/* LANDMARK */}
          <label className="search-field">
            <span>Landmark (Optional)</span>
            <input
              name="landmark"
              value={form.landmark}
              onChange={handleChange}
              placeholder="e.g. Near Metro Station, Opposite Park"
            />
          </label>

          {/* REGISTERED MOBILE */}
          <MobileNumberInput
            value={form.mobile}
            onChange={(val) => {
              setForm((curr) => ({ ...curr, mobile: val }));
              setErrors((curr) => ({ ...curr, mobile: '' }));
            }}
            label="Registered Mobile *"
            placeholder="10-digit mobile number"
            required
            error={errors.mobile}
          />

          {/* ALTERNATE MOBILE */}
          <MobileNumberInput
            value={form.altMobile}
            onChange={(val) => {
              setForm((curr) => ({ ...curr, altMobile: val }));
              setErrors((curr) => ({ ...curr, altMobile: '' }));
            }}
            label="Alternate Mobile (Optional)"
            placeholder="10-digit alternate mobile number"
            error={errors.altMobile}
          />
        </form>

        {/* DRAWER FOOTER BUTTONS */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justify: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            className="button button--ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button"
            onClick={handleSubmit}
            disabled={isSaving}
            style={{ padding: '10px 24px', fontWeight: '700' }}
          >
            {isSaving ? 'Saving…' : 'Save Address'}
          </button>
        </div>
      </aside>
    </div>
  );
}

export default AddAddressDrawer;
