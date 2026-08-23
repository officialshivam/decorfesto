import { useState } from 'react';
import { getStoredVendors, saveStoredVendor } from '../services/mockVendors';

const emptyVendor = {
  id: '',
  name: '',
  contactName: '',
  phone: '',
  email: '',
  passwordHash: '',
  servicePincodes: '',
  specialties: '',
  status: 'active',
};

function toFormVendor(vendor) {
  return {
    ...vendor,
    passwordHash: vendor.passwordHash || vendor.password || '',
    servicePincodes: (vendor.servicePincodes || []).join(', '),
    specialties: (vendor.specialties || []).join(', '),
  };
}

function AdminVendors() {
  const [vendors, setVendors] = useState(() => getStoredVendors());
  const [form, setForm] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const savedVendor = saveStoredVendor({
      ...form,
      servicePincodes: form.servicePincodes.split(',').map((value) => value.trim()).filter(Boolean),
      specialties: form.specialties.split(',').map((value) => value.trim()).filter(Boolean),
    });
    setVendors((current) => {
      const exists = current.some((vendor) => vendor.id === savedVendor.id);
      return exists ? current.map((vendor) => (vendor.id === savedVendor.id ? savedVendor : vendor)) : [...current, savedVendor];
    });
    setForm(null);
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin</span>
          <h1>Vendor Partner Directory & Portal Accounts</h1>
          <p>Manage vendor partner details, service areas, and portal login credentials.</p>
        </div>

        <div className="admin-orders__toolbar">
          <button type="button" className="button button--small" onClick={() => setForm(emptyVendor)}>Add New Vendor Partner</button>
        </div>

        {form ? (
          <div className="card-panel admin-vendors__form">
            <div className="card-panel__header">
              <h2>{form.id ? `Edit Vendor: ${form.name}` : 'Add New Vendor Partner'}</h2>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="search-field"><span>Vendor / Studio name *</span><input name="name" value={form.name} onChange={handleChange} required /></label>
              <label className="search-field"><span>Contact person</span><input name="contactName" value={form.contactName} onChange={handleChange} /></label>
              <label className="search-field"><span>Phone</span><input name="phone" value={form.phone} onChange={handleChange} /></label>
              <label className="search-field"><span>Email (Portal Login ID)</span><input name="email" type="email" value={form.email} onChange={handleChange} required /></label>
              <label className="search-field"><span>Portal Password</span><input name="passwordHash" type="password" value={form.passwordHash} onChange={handleChange} placeholder="Default: VendorPassword123!" /></label>
              <label className="search-field"><span>Service pincodes</span><input name="servicePincodes" value={form.servicePincodes} onChange={handleChange} placeholder="110001, 110032, 400001" /></label>
              <label className="search-field"><span>Speciality</span><input name="specialties" value={form.specialties} onChange={handleChange} placeholder="Balloon, Floral, Birthday" /></label>
              <label className="search-field">
                <span>Account Status</span>
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="active">Active (Login Allowed)</option>
                  <option value="disabled">Disabled (Login Blocked)</option>
                </select>
              </label>
              <div className="confirmation-actions">
                <button type="submit" className="button">Save Vendor Partner</button>
                <button type="button" className="button button--ghost" onClick={() => setForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="card-panel admin-orders__table-wrap">
          <table className="admin-orders__table">
            <thead>
              <tr>
                <th>Vendor name</th>
                <th>Contact person</th>
                <th>Phone</th>
                <th>Portal Email</th>
                <th>Service pincodes</th>
                <th>Speciality</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((vendor) => (
                <tr key={vendor.id}>
                  <td><strong>{vendor.name}</strong></td>
                  <td>{vendor.contactName || '—'}</td>
                  <td>{vendor.phone || '—'}</td>
                  <td>{vendor.email || '—'}</td>
                  <td>{vendor.servicePincodes?.join(', ') || '—'}</td>
                  <td>{vendor.specialties?.join(', ') || '—'}</td>
                  <td>
                    <span className="status-pill" style={{ background: vendor.status === 'disabled' || vendor.status === 'inactive' ? '#fee2e2' : '#dcfce7', color: vendor.status === 'disabled' || vendor.status === 'inactive' ? '#b91c1c' : '#15803d' }}>
                      {vendor.status === 'disabled' || vendor.status === 'inactive' ? 'Disabled' : 'Active'}
                    </span>
                  </td>
                  <td><button type="button" className="button button--small button--ghost" onClick={() => setForm(toFormVendor(vendor))}>Edit & Security</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AdminVendors;
