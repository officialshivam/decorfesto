import { useState } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileNumberInput, { validate10DigitMobile } from '../components/MobileNumberInput';

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup, isAuthenticated, loading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = location.state?.from?.pathname || '/my-orders';

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        <p>Verifying customer session...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const isCheckoutFlow = from === '/checkout';

  const validate = () => {
    const nextErrors = {};

    if (!fullName.trim()) {
      nextErrors.fullName = 'Please enter your full name.';
    }

    const mobileValidation = validate10DigitMobile(mobile);
    if (!mobileValidation.isValid) {
      nextErrors.mobile = mobileValidation.error;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (password.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validate()) {
      setSubmitError('Please fix the validation errors above (e.g. enter a full 10-digit mobile number).');
      return;
    }

    setIsSubmitting(true);

    const mobileValidation = validate10DigitMobile(mobile);
    const result = await signup({
      fullName: fullName.trim(),
      mobile: mobileValidation.clean,
      email: email ? email.trim().toLowerCase() : '',
      password,
      savedAddress: '',
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error || 'Account creation failed. Please try again.');
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <main className="page page--auth">
      <div className="auth-bg-pattern" aria-hidden="true" />
      <section className="auth-wrapper">
        <div className="auth-card">

          {/* Brand */}
          <div className="auth-card__brand">
            <div className="brand__logo">
              <span>🎉</span>
            </div>
            <div className="brand__text">
              <strong>DecorFesto</strong>
              <small>Premium celebrations</small>
            </div>
          </div>

          {/* Header */}
          <div className="auth-card__header">
            <h1>Create your DecorFesto account</h1>
            {isCheckoutFlow ? (
              <p className="auth-context-note">
                🛒 Your cart is saved. Create an account to place your order.
              </p>
            ) : (
              <p>Join thousands celebrating with DecorFesto.</p>
            )}
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>

            <label className="search-field">
              <span>Full Name *</span>
              <input
                name="fullName"
                type="text"
                value={fullName}
                autoComplete="name"
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrors((curr) => ({ ...curr, fullName: '' }));
                }}
                placeholder="e.g. Shivam Gupta"
                required
              />
              {errors.fullName ? <p className="field-error">{errors.fullName}</p> : null}
            </label>

            <MobileNumberInput
              value={mobile}
              onChange={(val) => {
                setMobile(val);
                setErrors((curr) => ({ ...curr, mobile: '' }));
                setSubmitError('');
              }}
              label="Mobile Number"
              placeholder="Enter 10 Digit Mobile No."
              required
              error={errors.mobile}
            />

            <label className="search-field">
              <span>Email Address <em className="optional-label">(optional)</em></span>
              <input
                name="email"
                type="email"
                value={email}
                autoComplete="email"
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((curr) => ({ ...curr, email: '' }));
                }}
                placeholder="name@example.com"
              />
              {errors.email ? <p className="field-error">{errors.email}</p> : null}
            </label>

            <label className="search-field">
              <span>Password *</span>
              <div className="input-with-action">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((curr) => ({ ...curr, password: '' }));
                  }}
                  placeholder="Create a password (min 6 chars)"
                  required
                />
                <button
                  type="button"
                  className="input-reveal-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              {errors.password ? <p className="field-error">{errors.password}</p> : null}
            </label>

            <label className="search-field">
              <span>Confirm Password *</span>
              <div className="input-with-action">
                <input
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((curr) => ({ ...curr, confirmPassword: '' }));
                  }}
                  placeholder="Re-enter your password"
                  required
                />
                <button
                  type="button"
                  className="input-reveal-btn"
                  onClick={() => setShowConfirm((v) => !v)}
                  tabIndex={-1}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? '🙈' : '👁'}
                </button>
              </div>
              {errors.confirmPassword ? <p className="field-error">{errors.confirmPassword}</p> : null}
            </label>

            {submitError ? (
              <div className="admin-error-banner auth-error" role="alert">
                <span>⚠ {submitError}</span>
              </div>
            ) : null}

            <div className="auth-actions">
              <button
                type="submit"
                className="button button--full button--lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating account…' : 'Create Account'}
              </button>
            </div>

            <div className="auth-divider"><span>Already have an account?</span></div>

            <Link
              to="/login"
              state={{ from: location.state?.from }}
              className="button button--ghost button--full"
            >
              Sign In
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Signup;
