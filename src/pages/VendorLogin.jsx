import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useVendorAuth } from '../context/VendorAuthContext';

export default function VendorLogin() {
  const { isVendorAuthenticated, loginVendor, vendorAuthError } = useVendorAuth();
  const [identifier, setIdentifier] = useState('vendor@decorfesto.com');
  const [password, setPassword] = useState('VendorPassword123!');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/vendor/dashboard';

  if (isVendorAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await loginVendor({ identifier, password });
    setLoading(false);

    if (res.ok) {
      navigate(from, { replace: true });
    } else {
      setErrorMsg(res.error || 'Authentication failed.');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#ffffff',
          borderRadius: '20px',
          padding: '40px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* LOGO HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              background: '#fff1f2',
              color: '#e11d48',
              borderRadius: '16px',
              fontSize: '1.8rem',
              marginBottom: '12px',
            }}
          >
            🏪
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>
            DecorFesto
          </h1>
          <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '0.95rem', fontWeight: '600' }}>
            Vendor Partner Operations Portal
          </p>
        </div>

        {(errorMsg || vendorAuthError) && (
          <div
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '0.88rem',
              fontWeight: '600',
            }}
          >
            ⚠️ {errorMsg || vendorAuthError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Vendor Email / Phone
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. vendor@decorfesto.com"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '6px' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.95rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: '#e11d48',
              color: '#ffffff',
              border: 'none',
              padding: '14px',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.25)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Authenticating...' : 'Sign In to Vendor Portal →'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
            Need partner account assistance? Contact DecorFesto Admin Ops.
          </p>
        </div>
      </div>
    </div>
  );
}
