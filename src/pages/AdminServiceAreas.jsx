import { useEffect, useMemo, useState } from 'react';
import {
  deleteStoredServiceArea,
  getStoredServiceAreas,
  saveStoredServiceArea,
} from '../services/mockServiceAreas';
import { saveServiceAreaOnServer } from '../services/serviceAreaApi';
import { fetchPincodeLocation } from '../services/pincodeLookup';

function formatLastUpdated(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '—';
  }
}

const emptyServiceArea = {
  id: '',
  pincode: '',
  city: '',
  serviceable: true,
};

function AdminServiceAreas() {
  const [serviceAreas, setServiceAreas] = useState(() => getStoredServiceAreas());
  const [form, setForm] = useState(null);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Summary Metrics
  const serviceableCount = useMemo(() => serviceAreas.filter((a) => a.serviceable).length, [serviceAreas]);
  const nonServiceableCount = useMemo(() => serviceAreas.filter((a) => !a.serviceable).length, [serviceAreas]);
  const totalCount = serviceAreas.length;

  // Auto pincode lookup effect when pincode changes in form
  useEffect(() => {
    if (!form) {
      setLookupResult(null);
      setIsLookupLoading(false);
      return;
    }

    const pc = String(form.pincode || '').trim();
    if (!/^[1-9][0-9]{5}$/.test(pc)) {
      setLookupResult(null);
      setIsLookupLoading(false);
      return;
    }

    let isMounted = true;
    setIsLookupLoading(true);
    setFormError('');

    fetchPincodeLocation(pc).then((res) => {
      if (!isMounted) return;
      setIsLookupLoading(false);
      if (res.ok) {
        setLookupResult({ ok: true, location: res.location });
        setForm((current) => (current ? { ...current, city: res.location } : current));
        setFormError('');
      } else {
        setLookupResult({ ok: false, error: res.error });
        setFormError(res.error);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [form?.pincode]);

  const handleOpenAddForm = () => {
    setForm(emptyServiceArea);
    setFormError('');
    setSuccessToast('');
    setLookupResult(null);
  };

  const handleOpenEditForm = (area) => {
    setForm({
      id: area.id,
      pincode: area.pincode,
      city: area.city,
      serviceable: area.serviceable === true,
    });
    setFormError('');
    setSuccessToast('');
    setLookupResult({ ok: true, location: area.city });
  };

  const handlePincodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setForm((current) => ({ ...current, pincode: value }));
    setFormError('');
  };

  const handleServiceableToggle = (isServiceable) => {
    setForm((current) => ({ ...current, serviceable: isServiceable }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    setSuccessToast('');

    const pc = String(form.pincode || '').trim();
    if (!/^[1-9][0-9]{5}$/.test(pc)) {
      setFormError('Please enter a valid 6-digit Indian pincode.');
      return;
    }

    // Check duplicate pincode if creating new area
    const isEditing = Boolean(form.id);
    if (!isEditing) {
      const duplicate = serviceAreas.some((a) => a.pincode === pc);
      if (duplicate) {
        setFormError(`Pincode ${pc} already exists. Edit the existing service area instead.`);
        return;
      }
    }

    if (!form.city) {
      setFormError('Location not resolved. Please enter a valid Indian pincode.');
      return;
    }

    setIsSaving(true);

    const payload = {
      id: form.id || pc,
      pincode: pc,
      city: form.city,
      serviceable: form.serviceable,
    };

    try {
      await saveServiceAreaOnServer(payload);
    } catch {
      // Local fallback repository handles offline mode seamlessly
    }

    const savedArea = saveStoredServiceArea(payload);
    setServiceAreas(getStoredServiceAreas());
    setIsSaving(false);
    setForm(null);

    const toastMsg = isEditing
      ? `✓ Service area updated successfully: ${savedArea.pincode} is now ${savedArea.serviceable ? 'Serviceable' : 'Non-Serviceable'}`
      : '✓ Service area added successfully';

    setSuccessToast(toastMsg);
    setTimeout(() => {
      setSuccessToast('');
    }, 5000);
  };

  const handleDelete = (area) => {
    if (window.confirm(`Delete service area ${area.pincode} (${area.city})?`)) {
      deleteStoredServiceArea(area.pincode);
      setServiceAreas(getStoredServiceAreas());
      setSuccessToast(`✓ Service area ${area.pincode} deleted.`);
      setTimeout(() => {
        setSuccessToast('');
      }, 4000);
    }
  };

  return (
    <main className="page page--admin">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin Dashboard</span>
          <h1>Service Areas</h1>
          <p>Manage pincode serviceability and active status across cities.</p>
        </div>

        {/* SUMMARY CARDS */}
        <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="card-panel" style={{ background: '#e6f4ea', borderColor: '#ceead6', padding: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: '#137333', fontWeight: '600' }}>🟢 Serviceable Pincodes</span>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>{serviceableCount}</div>
          </div>

          <div className="card-panel" style={{ background: '#fce8e6', borderColor: '#fad2cf', padding: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: '#c5221f', fontWeight: '600' }}>🔴 Non-Serviceable Pincodes</span>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#c5221f', marginTop: '4px' }}>{nonServiceableCount}</div>
          </div>

          <div className="card-panel" style={{ background: '#e8f0fe', borderColor: '#d2e3fc', padding: '16px' }}>
            <span style={{ fontSize: '0.85rem', color: '#1a73e8', fontWeight: '600' }}>📍 Total Service Areas</span>
            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>{totalCount}</div>
          </div>
        </div>

        {successToast && (
          <div className="admin-success-banner" style={{ marginBottom: '16px' }}>
            {successToast}
          </div>
        )}

        <div className="admin-orders__toolbar" style={{ marginBottom: '16px' }}>
          <button type="button" className="button button--small" onClick={handleOpenAddForm}>
            + Add Service Area
          </button>
        </div>

        {/* ADD / EDIT FORM MODAL */}
        {form ? (
          <div className="card-panel admin-service-areas__form" style={{ marginBottom: '24px' }}>
            <div className="card-panel__header">
              <h2>{form.id ? `Edit Service Area (${form.pincode})` : 'Add Service Area'}</h2>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="search-field">
                <span>Pincode *</span>
                <input
                  name="pincode"
                  value={form.pincode}
                  onChange={handlePincodeChange}
                  placeholder="Enter 6-digit pincode (e.g. 110032)"
                  inputMode="numeric"
                  maxLength={6}
                  required
                />
              </label>

              {/* AUTOMATIC LOCATION RESOLUTION PREVIEW */}
              {isLookupLoading && (
                <div style={{ padding: '10px 14px', background: '#f1f3f4', borderRadius: '8px', color: '#5f6368', fontSize: '0.9rem', marginBottom: '12px' }}>
                  ⏳ Looking up pincode location...
                </div>
              )}

              {!isLookupLoading && lookupResult?.ok && (
                <div style={{ padding: '10px 14px', background: '#e6f4ea', border: '1px solid #ceead6', borderRadius: '8px', color: '#137333', fontSize: '0.9rem', marginBottom: '12px', fontWeight: '600' }}>
                  ✓ Location found: {lookupResult.location}
                </div>
              )}

              {!isLookupLoading && lookupResult && !lookupResult.ok && (
                <div style={{ padding: '10px 14px', background: '#fce8e6', border: '1px solid #fad2cf', borderRadius: '8px', color: '#c5221f', fontSize: '0.9rem', marginBottom: '12px', fontWeight: '600' }}>
                  ❌ {lookupResult.error}
                </div>
              )}

              <label className="search-field">
                <span>City / Area (Auto-populated from lookup)</span>
                <input
                  name="city"
                  value={form.city}
                  readOnly
                  style={{ background: '#f8f9fa', cursor: 'not-allowed', color: '#3c4043' }}
                  placeholder="Will auto-populate from pincode"
                />
              </label>

              <fieldset style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', margin: '12px 0', background: '#fff' }}>
                <legend style={{ padding: '0 8px', fontWeight: '600', color: 'var(--heading)' }}>Serviceability Status</legend>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem' }}>
                    <input
                      type="radio"
                      name="serviceableStatus"
                      checked={form.serviceable === true}
                      onChange={() => handleServiceableToggle(true)}
                    />
                    <span style={{ color: '#137333', fontWeight: '700' }}>● Serviceable</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.95rem' }}>
                    <input
                      type="radio"
                      name="serviceableStatus"
                      checked={form.serviceable === false}
                      onChange={() => handleServiceableToggle(false)}
                    />
                    <span style={{ color: '#c5221f', fontWeight: '700' }}>○ Non-Serviceable</span>
                  </label>
                </div>
                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {form.serviceable
                    ? 'Serviceable: Customers can check availability and book packages for this pincode.'
                    : 'Non-Serviceable: Customers receive "Decoration service is currently unavailable at your location." for this pincode.'}
                </small>
              </fieldset>

              {formError && <p className="field-error" style={{ marginBottom: '12px' }}>{formError}</p>}

              <div className="confirmation-actions">
                <button type="submit" className="button" disabled={isSaving || isLookupLoading || (Boolean(form.pincode) && !form.city)}>
                  {isSaving ? 'Saving…' : 'Save Service Area'}
                </button>
                <button type="button" className="button button--ghost" onClick={() => setForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {/* SERVICE AREAS TABLE */}
        <div className="card-panel admin-orders__table-wrap">
          <table className="admin-orders__table">
            <thead>
              <tr>
                <th>Pincode</th>
                <th>City / Area</th>
                <th>Serviceability</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {serviceAreas.map((area) => (
                <tr key={area.id}>
                  <td><strong>{area.pincode}</strong></td>
                  <td>{area.city}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        backgroundColor: area.serviceable ? '#e6f4ea' : '#fce8e6',
                        color: area.serviceable ? '#137333' : '#c5221f',
                      }}
                    >
                      {area.serviceable ? '🟢 Serviceable' : '🔴 Non-Serviceable'}
                    </span>
                  </td>
                  <td>{formatLastUpdated(area.updatedAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="button button--small button--ghost"
                        onClick={() => handleOpenEditForm(area)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="button button--small button--ghost"
                        onClick={() => handleDelete(area)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
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
