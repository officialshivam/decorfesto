import { useState } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MobileNumberInput, { validate10DigitMobile } from '../components/MobileNumberInput';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, loading } = useAuth();

  const [identifierType, setIdentifierType] = useState('mobile'); // 'mobile' | 'email'
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    if (identifierType === 'mobile') {
      const mobileValidation = validate10DigitMobile(mobile);
      if (!mobileValidation.isValid) {
        nextErrors.mobile = mobileValidation.error;
      }
    } else {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        nextErrors.email = 'Please enter a valid email address.';
      }
    }

    if (!password) {
      nextErrors.password = 'Please enter your password.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');

    if (!validate()) return;

    setIsSubmitting(true);

    let identifier;
    if (identifierType === 'mobile') {
      const mobileValidation = validate10DigitMobile(mobile);
      identifier = mobileValidation.clean;
    } else {
      identifier = email.trim().toLowerCase();
    }

    const result = await login({ identifier, password });

    setIsSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error || 'Invalid credentials. Please check your mobile/email and password.');
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
            <h1>{isCheckoutFlow ? 'Sign in to continue your booking' : 'Welcome back'}</h1>
            {isCheckoutFlow && (
              <p className="auth-context-note">
                🛒 Your cart is saved. Sign in to place your order.
              </p>
            )}
            {!isCheckoutFlow && (
              <p>Access your bookings and account details.</p>
            )}
          </div>

          {/* Identifier type toggle */}
          <div className="auth-toggle">
            <button
              type="button"
              className={`auth-toggle__btn${identifierType === 'mobile' ? ' auth-toggle__btn--active' : ''}`}
              onClick={() => { setIdentifierType('mobile'); setErrors({}); setSubmitError(''); }}
            >
              Mobile Number
            </button>
            <button
              type="button"
              className={`auth-toggle__btn${identifierType === 'email' ? ' auth-toggle__btn--active' : ''}`}
              onClick={() => { setIdentifierType('email'); setErrors({}); setSubmitError(''); }}
            >
              Email Address
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>

            {identifierType === 'mobile' ? (
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
            ) : (
              <label className="search-field">
                <span>Email Address *</span>
                <input
                  name="email"
                  type="email"
                  value={email}
                  autoComplete="email"
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((curr) => ({ ...curr, email: '' }));
                    setSubmitError('');
                  }}
                  placeholder="name@example.com"
                  required
                />
                {errors.email ? <p className="field-error">{errors.email}</p> : null}
              </label>
            )}

            <label className="search-field">
              <span>Password *</span>
              <div className="input-with-action">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((curr) => ({ ...curr, password: '' }));
                    setSubmitError('');
                  }}
                  placeholder="Enter your password"
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
                {isSubmitting ? 'Signing in…' : 'Sign In'}
              </button>
            </div>

            <div className="auth-divider"><span>Don&apos;t have an account?</span></div>

            <Link
              to="/signup"
              state={{ from: location.state?.from }}
              className="button button--ghost button--full"
            >
              Create Account
            </Link>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Login;
