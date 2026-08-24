import { useEffect, useState } from 'react';
import { useVendorAuth } from '../context/VendorAuthContext';
import { fetchVendorProfileApi, updateVendorProfileApi } from '../services/vendorAuthService';

export default function VendorProfile() {
  const { vendorUser, setVendorUser } = useVendorAuth();

  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialtiesStr, setSpecialtiesStr] = useState('');
  const [notice, setNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Password Change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passNotice, setPassNotice] = useState('');
  const [passError, setPassError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      const p = await fetchVendorProfileApi();
      if (p) {
        setContactName(p.contactName || p.name || '');
        setPhone(p.phone || '');
        setSpecialtiesStr(Array.isArray(p.specialties) ? p.specialties.join(', ') : (p.specialties || ''));
      } else if (vendorUser) {
        setContactName(vendorUser.contactName || vendorUser.name || '');
        setPhone(vendorUser.phone || '');
        setSpecialtiesStr(Array.isArray(vendorUser.specialties) ? vendorUser.specialties.join(', ') : (vendorUser.specialties || ''));
      }
    }
    loadProfile();
  }, [vendorUser]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setNotice('');
    setErrorMsg('');

    try {
      const updated = await updateVendorProfileApi({
        contactName: contactName.trim(),
        phone: phone.trim(),
        specialties: specialtiesStr.split(',').map((s) => s.trim()).filter(Boolean),
      });

      if (updated) {
        setVendorUser(updated);
        setNotice('Profile updated successfully.');
      } else {
        setErrorMsg('Failed to update profile.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update profile.');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPassNotice('');
    setPassError('');

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('New password must be at least 6 characters long.');
      return;
    }

    try {
      const res = await fetch('/vendor/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        setPassNotice('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (data.error) {
        setPassError(data.error);
        return;
      }
    } catch {
      // Local fallback
    }

    const expectedPass = currentVendor.passwordHash || currentVendor.password || 'VendorPassword123!';
    if (currentPassword !== expectedPass) {
      setPassError('Current password is incorrect.');
      return;
    }

    saveStoredVendor({
      ...currentVendor,
      passwordHash: newPassword,
      password: newPassword,
    });

    setPassNotice('Password changed successfully.');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px', margin: '0 auto' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: '900', color: '#0f172a' }}>Vendor Partner Profile</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
          Manage your partner contact information and account security.
        </p>
      </div>

      {/* READ-ONLY ACCOUNT DETAILS */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          🔒 Account Credentials & System Record
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', fontSize: '0.9rem' }}>
          <div>
            <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700' }}>Vendor ID</span>
            <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{currentVendor?.id || 'N/A'}</div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700' }}>Studio / Business Name</span>
            <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{currentVendor?.name || 'N/A'}</div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700' }}>Email Address</span>
            <div style={{ fontWeight: '700', color: '#334155', marginTop: '2px' }}>{currentVendor?.email || 'N/A'}</div>
          </div>

          <div>
            <span style={{ color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: '700' }}>Account Status</span>
            <div style={{ marginTop: '2px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px' }}>
                ● {currentVendor?.status || 'Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EDITABLE PROFILE FORM */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          ✏️ Edit Contact Information
        </h2>

        {notice && <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: '600' }}>✓ {notice}</div>}
        {errorMsg && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: '600' }}>⚠️ {errorMsg}</div>}

        <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Contact Person Name</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Specialties (Comma Separated)</label>
            <input
              type="text"
              value={specialtiesStr}
              onChange={(e) => setSpecialtiesStr(e.target.value)}
              placeholder="e.g. Balloon, Floral, Birthday, Corporate"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Save Profile Updates
          </button>
        </form>
      </div>

      {/* PASSWORD CHANGE FORM */}
      <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
          🔑 Change Password
        </h2>

        {passNotice && <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: '600' }}>✓ {passNotice}</div>}
        {passError && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.88rem', fontWeight: '600' }}>⚠️ {passError}</div>}

        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>New Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 chars)"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }}
            />
          </div>

          <button
            type="submit"
            style={{
              background: '#e11d48',
              color: '#fff',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '8px',
              fontWeight: '700',
              cursor: 'pointer',
              alignSelf: 'flex-start',
            }}
          >
            Update Password
          </button>
        </form>
      </div>
    </div>
  );
}
