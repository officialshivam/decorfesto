import { useMemo, useState } from 'react';
import { getStoredDecorations } from '../services/mockDecorations';
import {
  deleteStoredCustomization,
  getStoredCustomizations,
  saveStoredCustomization,
} from '../services/mockCustomizations';

const TYPE_TABS = [
  { id: 'colorPalette', label: 'Theme Color Palettes' },
  { id: 'floralArrangement', label: 'Floral Arrangements' },
  { id: 'addon', label: 'Add-Ons & Recommended Experience Cards' },
];

function AdminCustomizations() {
  const [activeTab, setActiveTab] = useState('colorPalette');
  const [customizations, setCustomizations] = useState(() => getStoredCustomizations());
  const [editingItem, setEditingItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState('');

  // Filters for assigning designs inside form
  const [assignOccasionFilter, setAssignOccasionFilter] = useState('All');
  const [assignSearchQuery, setAssignSearchQuery] = useState('');

  const decorations = useMemo(() => getStoredDecorations(), []);

  // Occasions list for design assignment filter
  const occasionsList = useMemo(() => {
    const set = new Set(['All']);
    decorations.forEach((d) => {
      if (d.occasion || d.category) {
        set.add(d.occasion || d.category);
      }
    });
    return Array.from(set);
  }, [decorations]);

  // Filtered designs inside form modal
  const filteredAssignmentDesigns = useMemo(() => {
    return decorations.filter((d) => {
      const matchesOccasion = assignOccasionFilter === 'All' || (d.occasion || d.category) === assignOccasionFilter;
      const q = assignSearchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        d.name.toLowerCase().includes(q) ||
        (d.style && d.style.toLowerCase().includes(q));
      return matchesOccasion && matchesQuery;
    });
  }, [decorations, assignOccasionFilter, assignSearchQuery]);

  const filteredItems = useMemo(
    () => customizations.filter((item) => item.type === activeTab),
    [customizations, activeTab],
  );

  const initialFormState = {
    id: '',
    type: activeTab,
    name: '',
    category: activeTab === 'colorPalette' ? 'Theme Color Palette' : activeTab === 'floralArrangement' ? 'Floral Arrangement' : 'Recommended',
    description: '',
    price: 0,
    active: true,
    image: '',
    colorsHex: '#FFC0CB, #FFFFFF',
    assignedDesigns: [], // Default is EMPTY (no designs assigned)
  };

  const [form, setForm] = useState(initialFormState);

  const handleOpenAddForm = () => {
    setForm({
      ...initialFormState,
      type: activeTab,
      category: activeTab === 'colorPalette' ? 'Theme Color Palette' : activeTab === 'floralArrangement' ? 'Floral Arrangement' : 'Recommended',
      assignedDesigns: [], // Default empty
    });
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (item) => {
    setEditingItem(item);
    setForm({
      id: item.id,
      type: item.type,
      name: item.name || '',
      category: item.category || '',
      description: item.description || '',
      price: item.price || 0,
      active: item.active !== false,
      image: item.image || '',
      colorsHex: Array.isArray(item.colors) ? item.colors.join(', ') : '',
      assignedDesigns: Array.isArray(item.assignedDesigns) ? item.assignedDesigns.map(String) : [],
    });
    setIsFormOpen(true);
  };

  const handleToggleStatus = (item) => {
    const updated = saveStoredCustomization({ ...item, active: !item.active });
    setCustomizations(getStoredCustomizations());
    setNotice(`"${updated.name}" is now ${updated.active ? 'Active' : 'Disabled'}.`);
  };

  const handleDelete = (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      deleteStoredCustomization(item.id);
      setCustomizations(getStoredCustomizations());
      setNotice(`"${item.name}" has been deleted.`);
    }
  };

  const handleCheckboxDesignToggle = (designId) => {
    const dId = String(designId);
    setForm((current) => {
      const exists = current.assignedDesigns.includes(dId);
      const nextDesigns = exists
        ? current.assignedDesigns.filter((id) => id !== dId)
        : [...current.assignedDesigns, dId];
      return { ...current, assignedDesigns: nextDesigns };
    });
  };

  const handleSelectAllFilteredDesigns = () => {
    const filteredIds = filteredAssignmentDesigns.map((d) => String(d.id));
    setForm((current) => {
      const merged = Array.from(new Set([...current.assignedDesigns, ...filteredIds]));
      return { ...current, assignedDesigns: merged };
    });
  };

  const handleDeselectAllFilteredDesigns = () => {
    const filteredIds = filteredAssignmentDesigns.map((d) => String(d.id));
    setForm((current) => {
      const remaining = current.assignedDesigns.filter((id) => !filteredIds.includes(id));
      return { ...current, assignedDesigns: remaining };
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    const colors = form.colorsHex
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    const saved = saveStoredCustomization({
      id: form.id || undefined,
      type: form.type,
      name: form.name.trim(),
      category: form.category.trim() || 'Customization',
      description: form.description.trim(),
      price: Number(form.price || 0),
      active: form.active,
      image: form.image.trim(),
      colors: colors.length > 0 ? colors : undefined,
      assignedDesigns: form.assignedDesigns,
    });

    setCustomizations(getStoredCustomizations());
    setIsFormOpen(false);
    setNotice(`Successfully saved "${saved.name}"! (${saved.assignedDesigns.length} designs assigned)`);
  };

  return (
    <main className="page page--admin">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin Dashboard</span>
          <h1>Customization Management</h1>
          <p>Assign Theme Color Palettes, Floral Arrangements, and Add-ons to specific decoration designs.</p>
        </div>

        {notice && <div className="admin-success-banner">✓ {notice}</div>}

        <div className="catalog-toolbar">
          <div className="filter-group">
            {TYPE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`chip${activeTab === tab.id ? ' chip--active' : ''}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsFormOpen(false);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button type="button" className="button button--small" onClick={handleOpenAddForm}>
            + Add New {TYPE_TABS.find((t) => t.id === activeTab)?.label.slice(0, -1) || 'Item'}
          </button>
        </div>

        {isFormOpen && (
          <div className="card-panel admin-customizations__form-card">
            <h2>{editingItem ? `Edit Customization: "${editingItem.name}"` : 'Create New Customization Option'}</h2>
            <form onSubmit={handleSubmit} className="admin-decorations__form">
              <div className="admin-decorations__grid">
                <label className="search-field">
                  <span>Option Name *</span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Red & Gold Luxury"
                  />
                </label>

                <label className="search-field">
                  <span>Category</span>
                  <input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Theme Color Palette"
                  />
                </label>

                <label className="search-field">
                  <span>Add-on Price (₹)</span>
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0 for Included, or add-on price"
                  />
                </label>

                {activeTab === 'colorPalette' && (
                  <label className="search-field">
                    <span>Color Hex Swatches (comma separated)</span>
                    <input
                      value={form.colorsHex}
                      onChange={(e) => setForm({ ...form, colorsHex: e.target.value })}
                      placeholder="#DC143C, #FFD700"
                    />
                  </label>
                )}

                {(activeTab === 'floralArrangement' || activeTab === 'addon') && (
                  <label className="search-field">
                    <span>Image URL</span>
                    <input
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </label>
                )}
              </div>

              <label className="search-field">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description displayed to customers..."
                />
              </label>

              {/* HIERARCHICAL & SEARCHABLE DESIGN ASSIGNMENT PANEL */}
              <div className="admin-decorations__section">
                <legend>Assign to Specific Decoration Designs ({form.assignedDesigns.length} Selected)</legend>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                  Filter by Occasion or search designs, then check off only the specific designs that should receive this customization option.
                </p>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  <label className="search-field" style={{ minWidth: '180px' }}>
                    <span>Filter by Occasion</span>
                    <select
                      value={assignOccasionFilter}
                      onChange={(e) => setAssignOccasionFilter(e.target.value)}
                    >
                      {occasionsList.map((occ) => (
                        <option key={occ} value={occ}>
                          {occ}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="search-field" style={{ minWidth: '220px', flex: 1 }}>
                    <span>Search Design Name</span>
                    <input
                      value={assignSearchQuery}
                      onChange={(e) => setAssignSearchQuery(e.target.value)}
                      placeholder="Search design or style..."
                    />
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button
                    type="button"
                    className="button button--small button--ghost"
                    onClick={handleSelectAllFilteredDesigns}
                  >
                    Check All Visible
                  </button>
                  <button
                    type="button"
                    className="button button--small button--ghost"
                    onClick={handleDeselectAllFilteredDesigns}
                  >
                    Uncheck All Visible
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: '220px',
                    overflowY: 'auto',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    padding: '12px',
                    background: '#fff',
                    display: 'grid',
                    gap: '8px',
                  }}
                >
                  {filteredAssignmentDesigns.map((d) => {
                    const isChecked = form.assignedDesigns.includes(String(d.id));
                    return (
                      <label
                        key={d.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          background: isChecked ? 'var(--surface-soft)' : 'transparent',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxDesignToggle(d.id)}
                        />
                        <span>
                          <strong>{d.name}</strong>{' '}
                          <small style={{ color: 'var(--text-muted)' }}>
                            ({d.occasion} › {d.style || 'Signature Theme'})
                          </small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="detail-actions" style={{ marginTop: '16px' }}>
                <button type="submit" className="button">
                  {editingItem ? 'Save Changes' : 'Create Option'}
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="card-panel">
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Preview / Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Assigned Designs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const assignedCount = Array.isArray(item.assignedDesigns) ? item.assignedDesigns.length : 0;
                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }}
                            />
                          )}
                          {Array.isArray(item.colors) && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {item.colors.map((hex, i) => (
                                <span
                                  key={`${item.id}-${i}`}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    borderRadius: '50%',
                                    backgroundColor: hex,
                                    border: '1px solid #ccc',
                                  }}
                                />
                              ))}
                            </div>
                          )}
                          <div>
                            <strong>{item.name}</strong>
                            {item.description && (
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                                {item.description.slice(0, 50)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{item.category}</td>
                      <td>{item.price ? `+₹${item.price.toLocaleString('en-IN')}` : 'Included (₹0)'}</td>
                      <td>
                        <span className={`chip ${item.active ? 'chip--active' : ''}`}>
                          {item.active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: assignedCount > 0 ? 'var(--accent-dark)' : 'var(--text-muted)' }}>
                          {assignedCount > 0 ? `${assignedCount} Designs Assigned` : 'Unassigned (0)'}
                        </strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            className="button button--small button--ghost"
                            onClick={() => handleOpenEditForm(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="button button--small button--ghost"
                            onClick={() => handleToggleStatus(item)}
                          >
                            {item.active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            className="button button--small button--ghost"
                            onClick={() => handleDelete(item)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminCustomizations;
