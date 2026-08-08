import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function Profile() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    fullName: user?.fullName || '',
    mobile: user?.mobile || '',
    email: user?.email || '',
    savedAddress: user?.savedAddress || '',
  });
  const [saved, setSaved] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleEditToggle = () => {
    if (isEditing) {
      setForm({
        fullName: user?.fullName || '',
        mobile: user?.mobile || '',
        email: user?.email || '',
        savedAddress: user?.savedAddress || '',
      });
    }
    setSaved(false);
    setIsEditing((current) => !current);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateProfile(form);
    setSaved(true);
    setIsEditing(false);
  };

  if (!user) {
    return (
      <main className="page">
        <section className="container section section--tight">
          <div className="card-panel empty-state">
            <h1>Your account</h1>
            <p>Please log in to view and edit your profile.</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">My account</span>
          <h1>Profile</h1>
          <p>Manage your personal details and saved address.</p>
        </div>

        <div className="profile-layout">
          <div className="card-panel">
            <div className="card-panel__header">
              <h2>Account details</h2>
              <button type="button" className="button button--small button--ghost" onClick={handleEditToggle}>
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="search-field">
                <span>Full name</span>
                <input name="fullName" value={form.fullName} onChange={handleChange} disabled={!isEditing} />
              </label>
              <label className="search-field">
                <span>Mobile</span>
                <input name="mobile" value={form.mobile} onChange={handleChange} disabled={!isEditing} />
              </label>
              <label className="search-field">
                <span>Email</span>
                <input name="email" type="email" value={form.email} onChange={handleChange} disabled={!isEditing} />
              </label>
              <label className="search-field">
                <span>Saved address</span>
                <input name="savedAddress" value={form.savedAddress} onChange={handleChange} placeholder="Add your preferred address" disabled={!isEditing} />
              </label>
              {isEditing ? (
                <div className="auth-actions">
                  <button type="submit" className="button">Save changes</button>
                </div>
              ) : null}
              {saved ? <p className="field-success">Profile updated.</p> : null}
            </form>
          </div>

          <div className="card-panel">
            <div className="card-panel__header">
              <h2>Quick info</h2>
            </div>
            <div className="summary-box">
              <div className="summary-box__row"><span>Name</span><strong>{user.fullName}</strong></div>
              <div className="summary-box__row"><span>Mobile</span><strong>{user.mobile}</strong></div>
              <div className="summary-box__row"><span>Email</span><strong>{user.email}</strong></div>
              <div className="summary-box__row"><span>Saved address</span><strong>{user.savedAddress || 'Not added yet'}</strong></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Profile;
