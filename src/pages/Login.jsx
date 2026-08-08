import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setSubmitError('');
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.identifier.trim()) {
      nextErrors.identifier = 'Please enter your email or mobile number.';
    }
    if (!form.password) {
      nextErrors.password = 'Please enter your password.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    const result = login({ identifier: form.identifier, password: form.password });
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="auth-card">
          <div className="auth-card__header">
            <span className="eyebrow">Member login</span>
            <h1>Welcome back</h1>
            <p>Sign in to manage your bookings, profile, and order history.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="search-field">
              <span>Email or mobile</span>
              <input name="identifier" value={form.identifier} onChange={handleChange} placeholder="you@example.com or 9876543210" />
              {errors.identifier ? <p className="field-error">{errors.identifier}</p> : null}
            </label>

            <label className="search-field">
              <span>Password</span>
              <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Enter your password" />
              {errors.password ? <p className="field-error">{errors.password}</p> : null}
            </label>

            <div className="auth-actions">
              <button type="submit" className="button button--full">Login</button>
            </div>

            {submitError ? <p className="field-error field-error--summary">{submitError}</p> : null}

            <div className="auth-links">
              <a href="#" className="text-link">Forgot password?</a>
              <Link to="/signup" className="text-link">Create an account</Link>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Login;
