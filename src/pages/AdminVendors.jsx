import { useState } from 'react';
import { getStoredVendors, saveStoredVendor } from '../services/mockVendors';

const emptyVendor = {
  id: '',
  name: '',
  contactName: '',
  phone: '',
  email: '',
  servicePincodes: '',
  specialties: '',
  status: 'active',
};

function toFormVendor(vendor) {
  return {
    ...vendor,
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
          <h1>Vendors</h1>
          <p>Manage local mock vendor details and availability.</p>
        </div>

        <div className="admin-orders__toolbar">
          <button type="button" className="button button--small" onClick={() => setForm(emptyVendor)}>Add Vendor</button>
        </div>

        {form ? (
          <div className="card-panel admin-vendors__form">
            <div className="card-panel__header">
              <h2>{form.id ? 'Edit Vendor' : 'Add Vendor'}</h2>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="search-field"><span>Vendor name</span><input name="name" value={form.name} onChange={handleChange} required /></label>
              <label className="search-field"><span>Contact person</span><input name="contactName" value={form.contactName} onChange={handleChange} /></label>
              <label className="search-field"><span>Phone</span><input name="phone" value={form.phone} onChange={handleChange} /></label>
              <label className="search-field"><span>Email</span><input name="email" type="email" value={form.email} onChange={handleChange} /></label>
              <label className="search-field"><span>Service pincodes</span><input name="servicePincodes" value={form.servicePincodes} onChange={handleChange} placeholder="110001, 400001" /></label>
              <label className="search-field"><span>Speciality</span><input name="specialties" value={form.specialties} onChange={handleChange} placeholder="Balloon, Floral" /></label>
              <label className="search-field">
                <span>Status</span>
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className="confirmation-actions">
                <button type="submit" className="button">Save Vendor</button>
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
                <th>Email</th>
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
                  <td><span className="status-pill">{vendor.status === 'inactive' ? 'Inactive' : 'Active'}</span></td>
                  <td><button type="button" className="button button--small button--ghost" onClick={() => setForm(toFormVendor(vendor))}>Edit</button></td>
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
