import { useState } from 'react';
import { getStoredServiceAreas, saveStoredServiceArea } from '../services/mockServiceAreas';

const emptyServiceArea = {
  id: '',
  pincode: '',
  city: '',
  serviceable: true,
  leadTimeHours: 24,
  active: true,
};

function AdminServiceAreas() {
  const [serviceAreas, setServiceAreas] = useState(() => getStoredServiceAreas());
  const [form, setForm] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === 'serviceable' || name === 'active' ? value === 'true' : value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const savedArea = saveStoredServiceArea(form);
    setServiceAreas((current) => {
      const exists = current.some((area) => area.id === savedArea.id);
      return exists ? current.map((area) => (area.id === savedArea.id ? savedArea : area)) : [...current, savedArea];
    });
    setForm(null);
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin</span>
          <h1>Service Areas</h1>
          <p>Manage local mock serviceability and lead times.</p>
        </div>

        <div className="admin-orders__toolbar">
          <button type="button" className="button button--small" onClick={() => setForm(emptyServiceArea)}>Add Service Area</button>
        </div>

        {form ? (
          <div className="card-panel admin-service-areas__form">
            <div className="card-panel__header">
              <h2>{form.id ? 'Edit Service Area' : 'Add Service Area'}</h2>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="search-field"><span>Pincode</span><input name="pincode" value={form.pincode} onChange={handleChange} inputMode="numeric" maxLength={6} required /></label>
              <label className="search-field"><span>City</span><input name="city" value={form.city} onChange={handleChange} required /></label>
              <label className="search-field">
                <span>Serviceable status</span>
                <select name="serviceable" value={String(form.serviceable)} onChange={handleChange}>
                  <option value="true">Serviceable</option>
                  <option value="false">Not Serviceable</option>
                </select>
              </label>
              <label className="search-field"><span>Lead time (hours)</span><input name="leadTimeHours" type="number" min="0" value={form.leadTimeHours} onChange={handleChange} required /></label>
              <label className="search-field">
                <span>Active status</span>
                <select name="active" value={String(form.active)} onChange={handleChange}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </label>
              <div className="confirmation-actions">
                <button type="submit" className="button">Save Service Area</button>
                <button type="button" className="button button--ghost" onClick={() => setForm(null)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}

        <div className="card-panel admin-orders__table-wrap">
          <table className="admin-orders__table">
            <thead>
              <tr>
                <th>Pincode</th>
                <th>City</th>
                <th>Serviceable status</th>
                <th>Lead time</th>
                <th>Active status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {serviceAreas.map((area) => (
                <tr key={area.id}>
                  <td><strong>{area.pincode}</strong></td>
                  <td>{area.city}</td>
                  <td><span className="status-pill">{area.serviceable ? 'Serviceable' : 'Not Serviceable'}</span></td>
                  <td>{area.leadTimeHours} hours</td>
                  <td><span className="status-pill">{area.active ? 'Active' : 'Inactive'}</span></td>
                  <td><button type="button" className="button button--small button--ghost" onClick={() => setForm(area)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default AdminServiceAreas;
