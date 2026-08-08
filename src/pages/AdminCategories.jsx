import { useState } from 'react';
import { getStoredDecorations, saveStoredDecoration } from '../services/mockDecorations';
import { getStoredCategories, saveStoredCategory } from '../services/mockCategories';

const emptyCategory = { id: '', name: '', active: true, displayOrder: '' };

function AdminCategories() {
  const [categories, setCategories] = useState(() => getStoredCategories());
  const [form, setForm] = useState(null);
  const decorations = getStoredDecorations();

  const saveCategory = (category) => {
    const previousCategory = categories.find((entry) => entry.id === category.id);
    const savedCategory = saveStoredCategory(category);
    if (previousCategory && previousCategory.name !== savedCategory.name) {
      decorations
        .filter((decoration) => decoration.category === previousCategory.name)
        .forEach((decoration) => saveStoredDecoration({ ...decoration, category: savedCategory.name }));
    }
    setCategories((current) => {
      const exists = current.some((entry) => entry.id === savedCategory.id);
      return exists ? current.map((entry) => (entry.id === savedCategory.id ? savedCategory : entry)) : [...current, savedCategory];
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    saveCategory(form);
    setForm(null);
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin</span>
          <h1>Categories</h1>
          <p>Manage local decoration categories and their display order.</p>
        </div>

        <div className="admin-orders__toolbar"><button type="button" className="button button--small" onClick={() => setForm(emptyCategory)}>Add Category</button></div>

        {form ? (
          <div className="card-panel admin-categories__form">
            <div className="card-panel__header"><h2>{form.id ? 'Edit Category' : 'Add Category'}</h2></div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="search-field"><span>Category name</span><input name="name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label className="search-field"><span>Display order</span><input name="displayOrder" type="number" min="0" value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: event.target.value }))} required /></label>
              <label className="checkbox-row"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} /><span>Active</span></label>
              <div className="confirmation-actions"><button type="submit" className="button">Save Category</button><button type="button" className="button button--ghost" onClick={() => setForm(null)}>Cancel</button></div>
            </form>
          </div>
        ) : null}

        <div className="card-panel admin-orders__table-wrap"><table className="admin-orders__table"><thead><tr><th>Category</th><th>Display order</th><th>Decorations</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {categories.map((category) => {
            const usageCount = decorations.filter((decoration) => decoration.category === category.name).length;
            return <tr key={category.id}><td><strong>{category.name}</strong></td><td>{category.displayOrder}</td><td>{usageCount}</td><td><span className="status-pill">{category.active ? 'Active' : 'Inactive'}</span></td><td><div className="admin-decorations__actions"><button type="button" className="button button--small button--ghost" onClick={() => setForm(category)}>Edit</button><button type="button" className="button button--small button--ghost" onClick={() => saveCategory({ ...category, active: !category.active })}>{category.active ? 'Deactivate' : 'Activate'}</button></div></td></tr>;
          })}
        </tbody></table></div>
        <p className="summary-note">Categories used by decorations cannot be deleted; deactivate them instead.</p>
      </section>
    </main>
  );
}

export default AdminCategories;
