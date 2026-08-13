import { useState } from 'react';
import MobileNumberInput, { validate10DigitMobile } from './MobileNumberInput';

function QuickCustomerModal({ isOpen, onClose, onSubmit, pendingProduct }) {
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    const mobileValidation = validate10DigitMobile(mobile);
    if (!mobileValidation.isValid) {
      setError(mobileValidation.error);
      return;
    }

    setIsSubmitting(true);

    try {
      onSubmit({
        fullName: fullName.trim(),
        mobile: mobileValidation.clean,
        fullMobile: mobileValidation.fullMobile,
        email: email.trim(),
      });
    } catch (err) {
      console.error('Customer creation error:', err);
      setError('Unable to create your customer account. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="quick-customer-title">
      <div className="modal-card">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">×</button>

        <div className="modal-header">
          <span className="brand__mark" style={{ margin: '0 auto 8px', display: 'grid' }}>D</span>
          <h2 id="quick-customer-title">Complete your details</h2>
          <p>Enter your details to save your booking and proceed to cart.</p>
        </div>

        {error ? (
          <div className="admin-error-banner" role="alert" style={{ marginBottom: '14px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.88rem', fontWeight: '600' }}>
            <span>✕ {error}</span>
          </div>
        ) : null}

        {pendingProduct ? (
          <div className="quick-booking-preview" style={{ background: 'var(--surface-soft)', padding: '10px 14px', borderRadius: '10px', marginBottom: '16px', fontSize: '0.88rem' }}>
            <strong>Selected:</strong> {pendingProduct.productName} (₹{pendingProduct.totalPrice?.toLocaleString('en-IN')})
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="search-field">
            <span>Full Name *</span>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              required
            />
          </label>

          <MobileNumberInput
            value={mobile}
            onChange={setMobile}
            label="Mobile Number"
            placeholder="9876543210"
            required
            error={error && error.includes('mobile') ? error : ''}
          />

          <label className="search-field">
            <span>Email Address (Optional)</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </label>

          <div className="modal-actions" style={{ marginTop: '18px', display: 'flex', gap: '10px' }}>
            <button type="submit" className="button button--full" disabled={isSubmitting}>
              {isSubmitting ? 'Continuing...' : 'Continue & Add to Cart'}
            </button>
            <button type="button" className="button button--ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuickCustomerModal;
