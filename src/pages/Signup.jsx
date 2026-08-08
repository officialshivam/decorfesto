import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const initialForm = {
  fullName: '',
  mobile: '',
  email: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
};

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signup } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Please enter your full name.';
    }
    if (!/^\+91\d{10}$/.test(form.mobile.trim())) {
      nextErrors.mobile = 'Enter a valid mobile number with +91 prefix.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (form.password.length < 6) {
      nextErrors.password = 'Password should be at least 6 characters.';
    }
    if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    if (!form.acceptedTerms) {
      nextErrors.acceptedTerms = 'Please accept the terms and conditions.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const result = signup({
      fullName: form.fullName,
      mobile: form.mobile,
      email: form.email,
      password: form.password,
      savedAddress: '',
    });

    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    navigate(location.state?.from?.pathname || '/profile', { replace: true });
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="auth-card">
          <div className="auth-card__header">
            <span className="eyebrow">Create account</span>
            <h1>Join DecorFesto</h1>
            <p>Create a simple account so your bookings and profile are saved for later.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="search-field">
              <span>Full name</span>
              <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter your full name" />
              {errors.fullName ? <p className="field-error">{errors.fullName}</p> : null}
            </label>

            <label className="search-field">
              <span>Mobile number</span>
              <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="+919876543210" />
              {errors.mobile ? <p className="field-error">{errors.mobile}</p> : null}
            </label>

            <label className="search-field">
              <span>Email</span>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@example.com" />
              {errors.email ? <p className="field-error">{errors.email}</p> : null}
            </label>

            <label className="search-field">
              <span>Password</span>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create a password" />
              {errors.password ? <p className="field-error">{errors.password}</p> : null}
            </label>

            <label className="search-field">
              <span>Confirm password</span>
              <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="Confirm your password" />
              {errors.confirmPassword ? <p className="field-error">{errors.confirmPassword}</p> : null}
            </label>

            <label className="checkbox-row">
              <input name="acceptedTerms" type="checkbox" checked={form.acceptedTerms} onChange={handleChange} />
              <span>I accept the terms and conditions.</span>
            </label>
            {errors.acceptedTerms ? <p className="field-error">{errors.acceptedTerms}</p> : null}

            <div className="auth-actions">
              <button type="submit" className="button button--full">Sign up</button>
            </div>

            {submitError ? <p className="field-error field-error--summary">{submitError}</p> : null}

            <div className="auth-links">
              <Link to="/login" state={{ from: location.state?.from }} className="text-link">Already have an account? Login</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Signup;
