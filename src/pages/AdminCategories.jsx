import { useEffect, useState } from 'react';
import {
  fetchCategoriesApi,
  createCategoryApi,
  updateCategoryApi,
  toggleCategoryStatusApi,
  deleteCategoryApi,
} from '../services/categoryService';
import { fetchDecorationsApi } from '../services/decorationService';

const emptyCategory = { id: '', name: '', active: true, displayOrder: '' };

function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [decorations, setDecorations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedCategories, fetchedDecorations] = await Promise.all([
        fetchCategoriesApi(),
        fetchDecorationsApi().catch(() => []),
      ]);
      setCategories(fetchedCategories || []);
      setDecorations(fetchedDecorations || []);
    } catch (err) {
      console.error('Error loading categories from MySQL:', err);
      setError(err.message || 'Unable to load categories from MySQL server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage('');
    setSaving(true);

    try {
      const isEditing = Boolean(form.id);
      if (isEditing) {
        await updateCategoryApi(form.id, {
          name: form.name,
          displayOrder: Number(form.displayOrder || 0),
          active: form.active,
        });
        setSuccessMessage(`Category "${form.name}" updated successfully in MySQL!`);
      } else {
        await createCategoryApi({
          name: form.name,
          displayOrder: Number(form.displayOrder || categories.length + 1),
          active: form.active,
        });
        setSuccessMessage(`Category "${form.name}" added successfully to MySQL!`);
      }

      await loadData();
      setForm(null);

      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error saving category to MySQL:', err);
      setError(err.message || 'Failed to save category to MySQL.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (category) => {
    try {
      const nextActive = !category.active;
      await toggleCategoryStatusApi(category.id, nextActive);
      await loadData();
      setSuccessMessage(`Category "${category.name}" ${nextActive ? 'activated' : 'deactivated'} in MySQL!`);
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (err) {
      console.error('Error toggling category status:', err);
      setError(err.message || 'Failed to update category status.');
    }
  };

  const handleDelete = async (category) => {
    const usageCount = decorations.filter(
      (decoration) => (decoration.category && decoration.category.toLowerCase() === category.name.toLowerCase())
        || (decoration.occasion && decoration.occasion.toLowerCase() === category.name.toLowerCase())
    ).length;

    if (usageCount > 0) {
      setError(`Cannot delete "${category.name}" because it is currently used by ${usageCount} decoration(s). Deactivate it instead.`);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete category "${category.name}"?`)) {
      return;
    }

    try {
      await deleteCategoryApi(category.id);
      await loadData();
      setSuccessMessage(`Category "${category.name}" deleted successfully!`);
      setTimeout(() => {
        setSuccessMessage('');
      }, 4000);
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err.message || 'Failed to delete category.');
    }
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin</span>
          <h1>Categories</h1>
          <p>Manage decoration categories stored in MySQL server.</p>
        </div>

        {successMessage ? (
          <div className="admin-success-banner" role="alert" style={{ marginBottom: '16px', padding: '12px 16px', background: '#e6f4ea', color: '#137333', borderRadius: '8px', fontWeight: '600' }}>
            <span>✓ {successMessage}</span>
          </div>
        ) : null}

        {error ? (
          <div className="admin-error-banner" role="alert" style={{ marginBottom: '16px', padding: '12px 16px', background: '#fce8e6', color: '#c5221f', borderRadius: '8px', fontWeight: '600' }}>
            <span>⚠️ {error}</span>
          </div>
        ) : null}

        <div className="admin-orders__toolbar">
          <button type="button" className="button button--small" onClick={() => { setForm(emptyCategory); setError(null); }}>
            Add Category
          </button>
        </div>

        {form ? (
          <div className="card-panel admin-categories__form">
            <div className="card-panel__header">
              <h2>{form.id ? 'Edit Category' : 'Add Category'}</h2>
            </div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="search-field">
                <span>Category name</span>
                <input
                  name="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g. Wedding, Birthday, Festival"
                  required
                />
              </label>
              <label className="search-field">
                <span>Display order</span>
                <input
                  name="displayOrder"
                  type="number"
                  min="0"
                  value={form.displayOrder}
                  onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))}
                  required
                />
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
                />
                <span>Active</span>
              </label>
              <div className="confirmation-actions">
                <button type="submit" className="button" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
                <button type="button" className="button button--ghost" onClick={() => setForm(null)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {loading ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading categories from MySQL server...
          </div>
        ) : (
          <div className="card-panel admin-orders__table-wrap">
            <table className="admin-orders__table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Display Order</th>
                  <th>Decorations in MySQL</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      No categories found in MySQL. Click "Add Category" above to create one.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => {
                    const usageCount = decorations.filter(
                      (decoration) => (decoration.category && decoration.category.toLowerCase() === category.name.toLowerCase())
                        || (decoration.occasion && decoration.occasion.toLowerCase() === category.name.toLowerCase())
                    ).length;

                    return (
                      <tr key={category.id}>
                        <td><strong>{category.name}</strong></td>
                        <td>{category.displayOrder}</td>
                        <td>{usageCount}</td>
                        <td><span className="status-pill">{category.active ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <div className="admin-decorations__actions">
                            <button type="button" className="button button--small button--ghost" onClick={() => { setForm(category); setError(null); }}>Edit</button>
                            <button type="button" className="button button--small button--ghost" onClick={() => handleToggleActive(category)}>{category.active ? 'Deactivate' : 'Activate'}</button>
                            <button type="button" className="button button--small button--ghost" onClick={() => handleDelete(category)} style={{ color: '#c5221f' }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
        <p className="summary-note">Categories in use by active decorations in MySQL cannot be deleted; deactivate them instead.</p>
      </section>
    </main>
  );
}

export default AdminCategories;
