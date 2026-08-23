import { useMemo, useState } from 'react';
import { getStoredDecorations } from '../services/mockDecorations';
import {
  deleteStoredCustomization,
  getStoredCustomizations,
  saveStoredCustomization,
  swapCustomizationDisplayOrder,
} from '../services/mockCustomizations';

const TYPE_TABS = [
  { id: 'colorPalette', label: 'Theme Color Palettes' },
  { id: 'floralArrangement', label: 'Floral Arrangements' },
  { id: 'addon', label: 'Recommended Add-ons & Experience Cards' },
];

function checkOptionInUse(option) {
  if (!option) return false;
  if (typeof window === 'undefined') return false;

  try {
    const rawCart = window.localStorage.getItem('decorfesto-cart');
    if (rawCart) {
      const cartItems = JSON.parse(rawCart);
      if (Array.isArray(cartItems)) {
        const inCart = cartItems.some((item) => {
          if (!item.customization) return false;
          return Object.values(item.customization).some((val) => {
            const strVal = String(val || '');
            return strVal.includes(option.name) || (option.id && strVal.includes(option.id));
          });
        });
        if (inCart) return true;
      }
    }

    const rawOrders = window.localStorage.getItem('decorfesto-orders');
    if (rawOrders) {
      const orders = JSON.parse(rawOrders);
      if (Array.isArray(orders)) {
        const inOrders = orders.some((order) => {
          const items = order.items || [];
          return items.some((item) => {
            if (!item.customization) return false;
            return Object.values(item.customization).some((val) => {
              const strVal = String(val || '');
              return strVal.includes(option.name) || (option.id && strVal.includes(option.id));
            });
          });
        });
        if (inOrders) return true;
      }
    }
  } catch (err) {
    console.warn('Unable to check option usage', err);
  }

  return false;
}

function AdminCustomizations() {
  const [activeTab, setActiveTab] = useState('colorPalette');
  const [customizations, setCustomizations] = useState(() => getStoredCustomizations());
  const [editingItem, setEditingItem] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [notice, setNotice] = useState('');

  // Search & Filter controls
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [featuredFilter, setFeaturedFilter] = useState('All');
  const [priceFilter, setPriceFilter] = useState('All');
  const [sortBy, setSortBy] = useState('displayOrder');

  // Preview Modal state
  const [previewItem, setPreviewItem] = useState(null);

  // Assignment Modal state
  const [assignmentModalItem, setAssignmentModalItem] = useState(null);
  const [assignmentSelectedIds, setAssignmentSelectedIds] = useState([]);

  // Safety Delete Block Modal state
  const [deleteBlockItem, setDeleteBlockItem] = useState(null);

  // Unsaved changes tracking
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [showUnsavedGuard, setShowUnsavedGuard] = useState(false);

  // Filters for assigning designs inside form/modal
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

  // Filtered designs inside assignment panel
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

  // Filtered & Sorted items for current active tab
  const displayedItems = useMemo(() => {
    let items = customizations.filter((item) => item.type === activeTab);

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)),
      );
    }

    // Status filter
    if (statusFilter === 'Active') {
      items = items.filter((item) => item.active && !item.archived);
    } else if (statusFilter === 'Disabled') {
      items = items.filter((item) => !item.active && !item.archived);
    } else if (statusFilter === 'Archived') {
      items = items.filter((item) => Boolean(item.archived));
    }

    // Featured filter
    if (featuredFilter === 'Featured') {
      items = items.filter((item) => Boolean(item.featured || item.recommended));
    } else if (featuredFilter === 'Standard') {
      items = items.filter((item) => !item.featured && !item.recommended);
    }

    // Price filter
    if (priceFilter === 'Free') {
      items = items.filter((item) => (item.price || 0) === 0);
    } else if (priceFilter === 'Paid') {
      items = items.filter((item) => (item.price || 0) > 0);
    }

    // Sorting
    return [...items].sort((a, b) => {
      if (sortBy === 'displayOrder') return (a.displayOrder || 0) - (b.displayOrder || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'priceAsc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'priceDesc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'updatedAt') return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      return 0;
    });
  }, [customizations, activeTab, searchQuery, statusFilter, featuredFilter, priceFilter, sortBy]);

  const initialFormState = {
    id: '',
    type: activeTab,
    name: '',
    category: activeTab === 'colorPalette' ? 'Theme Color Palette' : activeTab === 'floralArrangement' ? 'Floral Arrangement' : 'Recommended',
    description: '',
    adminNotes: '',
    price: 0,
    active: true,
    archived: false,
    featured: false,
    recommended: false,
    displayOrder: 1,
    image: '',
    colors: ['#FFC0CB', '#FFFFFF'],
    assignedDesigns: [],
  };

  const [form, setForm] = useState(initialFormState);

  const updateFormField = (fields) => {
    setForm((curr) => ({ ...curr, ...fields }));
    setIsFormDirty(true);
  };

  const handleOpenAddForm = () => {
    setForm({
      ...initialFormState,
      type: activeTab,
      category: activeTab === 'colorPalette' ? 'Theme Color Palette' : activeTab === 'floralArrangement' ? 'Floral Arrangement' : 'Recommended',
      displayOrder: displayedItems.length + 1,
      assignedDesigns: [],
    });
    setEditingItem(null);
    setIsFormDirty(false);
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
      adminNotes: item.adminNotes || '',
      price: item.price || 0,
      active: item.active !== false,
      archived: Boolean(item.archived),
      featured: Boolean(item.featured),
      recommended: Boolean(item.recommended),
      displayOrder: item.displayOrder || 1,
      image: item.image || '',
      colors: Array.isArray(item.colors) && item.colors.length > 0 ? [...item.colors] : ['#FFC0CB', '#FFFFFF'],
      assignedDesigns: Array.isArray(item.assignedDesigns) ? item.assignedDesigns.map(String) : [],
    });
    setIsFormDirty(false);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (isFormDirty) {
      setShowUnsavedGuard(true);
    } else {
      setIsFormOpen(false);
    }
  };

  const handleToggleStatus = (item) => {
    const updated = saveStoredCustomization({ ...item, active: !item.active });
    setCustomizations(getStoredCustomizations());
    setNotice(`"${updated.name}" is now ${updated.active ? 'Active' : 'Disabled'}.`);
  };

  const handleToggleArchive = (item) => {
    const nextArchived = !item.archived;
    const updated = saveStoredCustomization({ ...item, archived: nextArchived });
    setCustomizations(getStoredCustomizations());
    setNotice(`"${updated.name}" has been ${nextArchived ? 'Archived' : 'Restored'}.`);
  };

  const handleDeleteAttempt = (item) => {
    const isInUse = checkOptionInUse(item);
    if (isInUse) {
      setDeleteBlockItem(item);
    } else {
      if (window.confirm(`Are you sure you want to permanently delete "${item.name}"?`)) {
        deleteStoredCustomization(item.id);
        setCustomizations(getStoredCustomizations());
        setNotice(`"${item.name}" deleted successfully.`);
      }
    }
  };

  const handleMoveOrder = (item, direction) => {
    const index = displayedItems.findIndex((e) => e.id === item.id);
    if (index < 0) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= displayedItems.length) return;

    const targetItem = displayedItems[targetIndex];
    swapCustomizationDisplayOrder(item.id, targetItem.id);
    setCustomizations(getStoredCustomizations());
    setNotice(`Updated display order for "${item.name}".`);
  };

  const handleColorChange = (index, hex) => {
    const nextColors = [...form.colors];
    nextColors[index] = hex;
    updateFormField({ colors: nextColors });
  };

  const handleAddColor = () => {
    if (form.colors.length >= 6) return;
    updateFormField({ colors: [...form.colors, '#FFD700'] });
  };

  const handleRemoveColor = (index) => {
    if (form.colors.length <= 2) return;
    const nextColors = form.colors.filter((_, i) => i !== index);
    updateFormField({ colors: nextColors });
  };

  const handleOpenAssignmentModal = (item) => {
    setAssignmentModalItem(item);
    setAssignmentSelectedIds(Array.isArray(item.assignedDesigns) ? item.assignedDesigns.map(String) : []);
  };

  const handleSaveAssignmentsModal = () => {
    if (!assignmentModalItem) return;
    const updated = saveStoredCustomization({
      ...assignmentModalItem,
      assignedDesigns: assignmentSelectedIds,
    });
    setCustomizations(getStoredCustomizations());
    setAssignmentModalItem(null);
    setNotice(`Updated design assignments for "${updated.name}" (${updated.assignedDesigns.length} designs).`);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;

    const priceNum = Math.max(0, Number(form.price || 0));

    const saved = saveStoredCustomization({
      id: form.id || undefined,
      type: form.type,
      name: form.name.trim(),
      category: form.category.trim() || 'Customization',
      description: form.description.trim(),
      adminNotes: form.adminNotes.trim(),
      price: priceNum,
      active: form.active,
      archived: form.archived,
      featured: form.featured,
      recommended: form.recommended,
      displayOrder: Number(form.displayOrder || 1),
      image: form.image.trim(),
      colors: form.type === 'colorPalette' ? form.colors : undefined,
      assignedDesigns: form.assignedDesigns,
    });

    setCustomizations(getStoredCustomizations());
    setIsFormDirty(false);
    setIsFormOpen(false);
    setNotice(`Successfully saved "${saved.name}" (Price: ₹${saved.price.toLocaleString('en-IN')}, ${saved.assignedDesigns.length} designs assigned).`);
  };

  return (
    <main className="page page--admin">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin Dashboard</span>
          <h1>Customization Management</h1>
          <p>Configure Theme Color Palettes, Floral Arrangements, and Add-on Experience Cards with real-time customer preview and safety checks.</p>
        </div>

        {notice && <div className="admin-success-banner" style={{ marginBottom: '16px', padding: '12px 16px', background: '#e6f4ea', color: '#137333', borderRadius: '10px', fontWeight: '700' }}>✓ {notice}</div>}

        {/* TABS */}
        <div className="catalog-toolbar" style={{ marginBottom: '16px' }}>
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
            + Add New Option
          </button>
        </div>

        {/* SEARCH, FILTERS & SORTING TOOLBAR */}
        <div className="card-panel" style={{ marginBottom: '20px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label className="search-field" style={{ flex: 1, minWidth: '220px' }}>
              <span>Search Options</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, description, category..."
              />
            </label>

            <label className="search-field" style={{ minWidth: '130px' }}>
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Disabled">Disabled</option>
                <option value="Archived">Archived</option>
              </select>
            </label>

            <label className="search-field" style={{ minWidth: '130px' }}>
              <span>Featured</span>
              <select value={featuredFilter} onChange={(e) => setFeaturedFilter(e.target.value)}>
                <option value="All">All</option>
                <option value="Featured">Featured / Rec.</option>
                <option value="Standard">Standard</option>
              </select>
            </label>

            <label className="search-field" style={{ minWidth: '120px' }}>
              <span>Price</span>
              <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)}>
                <option value="All">All Prices</option>
                <option value="Free">₹0 Free</option>
                <option value="Paid">Paid (&gt;₹0)</option>
              </select>
            </label>

            <label className="search-field" style={{ minWidth: '140px' }}>
              <span>Sort By</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="displayOrder">Display Order</option>
                <option value="name">Name (A-Z)</option>
                <option value="priceAsc">Price (Low to High)</option>
                <option value="priceDesc">Price (High to Low)</option>
                <option value="updatedAt">Last Updated</option>
              </select>
            </label>
          </div>
        </div>

        {/* CREATE / EDIT FORM MODAL */}
        {isFormOpen && (
          <div className="card-panel admin-customizations__form-card" style={{ marginBottom: '24px', borderRadius: '16px', padding: '24px', border: '2px solid var(--accent, #e11d48)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                {editingItem ? `Edit Option: "${editingItem.name}"` : 'Create New Customization Option'}
              </h2>
              <button type="button" onClick={handleCloseForm} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="admin-decorations__form">
              {/* SECTION: GENERAL */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>GENERAL INFORMATION</span>
                <div className="admin-decorations__grid" style={{ marginTop: '8px' }}>
                  <label className="search-field">
                    <span>Option Name *</span>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => updateFormField({ name: e.target.value })}
                      placeholder="e.g. Custom Signature Palette"
                    />
                  </label>

                  <label className="search-field">
                    <span>Category / Badge</span>
                    <input
                      value={form.category}
                      onChange={(e) => updateFormField({ category: e.target.value })}
                      placeholder="e.g. Recommended, Personalization"
                    />
                  </label>

                  <label className="search-field">
                    <span>Price (₹) *</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={form.price}
                      onChange={(e) => updateFormField({ price: e.target.value })}
                      placeholder="0 for ₹0, or add-on price"
                    />
                  </label>

                  <label className="search-field">
                    <span>Display Order</span>
                    <input
                      type="number"
                      min="1"
                      value={form.displayOrder}
                      onChange={(e) => updateFormField({ displayOrder: e.target.value })}
                    />
                  </label>
                </div>
              </div>

              {/* SECTION: THEME COLOR PALETTES (IF PALETTE TYPE) */}
              {activeTab === 'colorPalette' && (
                <div style={{ marginBottom: '16px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700' }}>
                      THEME PALETTE COLORS ({form.colors.length} Colors)
                    </span>
                    {form.colors.length < 6 && (
                      <button type="button" className="button button--small button--ghost" onClick={handleAddColor}>
                        + Add Color Swatch
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {form.colors.map((hex, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                        <input
                          type="color"
                          value={hex}
                          onChange={(e) => handleColorChange(index, e.target.value)}
                          style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '4px' }}
                        />
                        <input
                          type="text"
                          value={hex}
                          onChange={(e) => handleColorChange(index, e.target.value)}
                          style={{ width: '80px', fontSize: '0.85rem', textTransform: 'uppercase', border: 'none', fontWeight: '700' }}
                        />
                        {form.colors.length > 2 && (
                          <button type="button" onClick={() => handleRemoveColor(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: IMAGE URL (FLORAL OR ADDON) */}
              {(activeTab === 'floralArrangement' || activeTab === 'addon') && (
                <div style={{ marginBottom: '16px' }}>
                  <label className="search-field">
                    <span>Image URL</span>
                    <input
                      value={form.image}
                      onChange={(e) => updateFormField({ image: e.target.value })}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </label>
                  {form.image && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={form.image} alt="Preview" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                      <button type="button" className="button button--small button--ghost" onClick={() => updateFormField({ image: '' })}>
                        Remove Image
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: DESCRIPTIONS & NOTES */}
              <div className="admin-decorations__grid" style={{ marginBottom: '16px' }}>
                <label className="search-field">
                  <span>Customer-Facing Description</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => updateFormField({ description: e.target.value })}
                    placeholder="Short description displayed to customers on customize page..."
                    rows={2}
                  />
                </label>

                <label className="search-field">
                  <span>Internal / Admin Notes (Hidden from customers)</span>
                  <textarea
                    value={form.adminNotes}
                    onChange={(e) => updateFormField({ adminNotes: e.target.value })}
                    placeholder="Supplier notes, inventory requirements, vendor instructions..."
                    rows={2}
                  />
                </label>
              </div>

              {/* STATUS & FEATURED TOGGLES */}
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', margin: '12px 0 16px 0', padding: '12px', background: '#f8fafc', borderRadius: '10px' }}>
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => updateFormField({ active: e.target.checked })}
                  />
                  <span><strong>Active</strong> (visible to customers when assigned)</span>
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.featured || form.recommended}
                    onChange={(e) => updateFormField({ featured: e.target.checked, recommended: e.target.checked })}
                  />
                  <span><strong>⭐ Featured / Recommended Badge</strong></span>
                </label>

                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={form.archived}
                    onChange={(e) => updateFormField({ archived: e.target.checked })}
                  />
                  <span><strong>📦 Archived</strong> (hidden from new bookings)</span>
                </label>
              </div>

              {/* DESIGN ASSIGNMENT PANEL */}
              <div className="admin-decorations__section" style={{ marginBottom: '20px' }}>
                <legend>Assign to Specific Decoration Designs ({form.assignedDesigns.length} Selected)</legend>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                  Select the specific decoration packages that will offer this customization option to customers.
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
                    onClick={() => {
                      const filteredIds = filteredAssignmentDesigns.map((d) => String(d.id));
                      updateFormField({ assignedDesigns: Array.from(new Set([...form.assignedDesigns, ...filteredIds])) });
                    }}
                  >
                    Check All Visible
                  </button>
                  <button
                    type="button"
                    className="button button--small button--ghost"
                    onClick={() => {
                      const filteredIds = filteredAssignmentDesigns.map((d) => String(d.id));
                      updateFormField({ assignedDesigns: form.assignedDesigns.filter((id) => !filteredIds.includes(id)) });
                    }}
                  >
                    Uncheck All Visible
                  </button>
                </div>

                <div
                  style={{
                    maxHeight: '200px',
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
                          onChange={() => {
                            const dId = String(d.id);
                            const nextDesigns = isChecked
                              ? form.assignedDesigns.filter((id) => id !== dId)
                              : [...form.assignedDesigns, dId];
                            updateFormField({ assignedDesigns: nextDesigns });
                          }}
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

              <div className="detail-actions" style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="button">
                  {editingItem ? 'Save Changes' : 'Create Option'}
                </button>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={handleCloseForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CUSTOMIZATION OPTIONS ADMIN TABLE */}
        <div className="card-panel" style={{ borderRadius: '16px', border: '1px solid var(--border, #e2e8f0)', overflow: 'hidden' }}>
          <div className="table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Preview / Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Display Order</th>
                  <th>Assigned Designs</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No customization options found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item) => {
                    const assignedCount = Array.isArray(item.assignedDesigns) ? item.assignedDesigns.length : 0;
                    const priceText = `₹${(item.price || 0).toLocaleString('en-IN')}`;

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
                            {Array.isArray(item.colors) && item.colors.length > 0 && (
                              <div style={{ display: 'flex', gap: '3px' }}>
                                {item.colors.map((hex, i) => (
                                  <span
                                    key={`${item.id}-${i}`}
                                    style={{
                                      width: '16px',
                                      height: '16px',
                                      borderRadius: '50%',
                                      backgroundColor: hex,
                                      border: '1px solid #cbd5e1',
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{item.name}</strong>
                                {(item.featured || item.recommended) && (
                                  <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#d97706', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                    ⭐ Featured
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                                  {item.description.length > 55 ? `${item.description.slice(0, 55)}...` : item.description}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.84rem', fontWeight: '600', color: '#334155' }}>
                            {item.category}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{priceText}</strong>
                        </td>
                        <td>
                          {item.archived ? (
                            <span className="chip" style={{ background: '#f1f5f9', color: '#64748b' }}>
                              📦 Archived
                            </span>
                          ) : (
                            <span className={`chip ${item.active ? 'chip--active' : ''}`}>
                              {item.active ? '● Active' : '○ Disabled'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{item.displayOrder || 1}</span>
                            <button
                              type="button"
                              onClick={() => handleMoveOrder(item, 'up')}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                              title="Move Up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveOrder(item, 'down')}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                              title="Move Down"
                            >
                              ↓
                            </button>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => handleOpenAssignmentModal(item)}
                            style={{ background: 'none', border: 'none', color: assignedCount > 0 ? '#0284c7' : '#94a3b8', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                          >
                            {assignedCount > 0 ? `${assignedCount} Designs Assigned` : '0 Assigned'}
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
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
                              onClick={() => setPreviewItem(item)}
                            >
                              Preview
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
                              onClick={() => handleToggleArchive(item)}
                            >
                              {item.archived ? 'Restore' : 'Archive'}
                            </button>
                            <button
                              type="button"
                              className="button button--small button--ghost"
                              onClick={() => handleDeleteAttempt(item)}
                              style={{ color: '#ef4444' }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CUSTOMER IMPACT PREVIEW MODAL */}
        {previewItem && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card-panel" style={{ width: '100%', maxWidth: '440px', borderRadius: '16px', background: '#fff', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>Customer Experience Preview</h3>
                <button type="button" onClick={() => setPreviewItem(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ border: '2px solid var(--accent, #e11d48)', borderRadius: '14px', padding: '16px', background: '#fff' }}>
                {previewItem.image && (
                  <img src={previewItem.image} alt={previewItem.name} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '10px', marginBottom: '12px' }} />
                )}
                {Array.isArray(previewItem.colors) && previewItem.colors.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                    {previewItem.colors.map((hex, i) => (
                      <span key={i} style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: hex, border: '1px solid #cbd5e1' }} />
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    {(previewItem.featured || previewItem.recommended) && (
                      <span style={{ fontSize: '0.75rem', background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                        ⭐ Recommended
                      </span>
                    )}
                    <h4 style={{ margin: '4px 0 0 0', fontSize: '1.1rem', color: '#0f172a', fontWeight: '700' }}>{previewItem.name}</h4>
                  </div>
                  <strong style={{ fontSize: '1.1rem', color: '#0284c7' }}>
                    {previewItem.price > 0 ? `+₹${previewItem.price.toLocaleString('en-IN')}` : 'Included'}
                  </strong>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '8px' }}>{previewItem.description || 'Customer-facing description preview.'}</p>
                <button type="button" className="button button--small button--full" style={{ marginTop: '12px' }}>Select ✓</button>
              </div>

              <button type="button" className="button button--ghost button--full" onClick={() => setPreviewItem(null)} style={{ marginTop: '16px' }}>Close Preview</button>
            </div>
          </div>
        )}

        {/* DESIGN ASSIGNMENT MANAGER MODAL */}
        {assignmentModalItem && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card-panel" style={{ width: '100%', maxWidth: '560px', borderRadius: '16px', background: '#fff', padding: '24px', boxShadow: '0 12px 32px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a' }}>Assign Designs: "{assignmentModalItem.name}"</h3>
                <button type="button" onClick={() => setAssignmentModalItem(null)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <label className="search-field" style={{ minWidth: '160px' }}>
                  <span>Filter by Occasion</span>
                  <select value={assignOccasionFilter} onChange={(e) => setAssignOccasionFilter(e.target.value)}>
                    {occasionsList.map((occ) => (
                      <option key={occ} value={occ}>{occ}</option>
                    ))}
                  </select>
                </label>
                <label className="search-field" style={{ flex: 1 }}>
                  <span>Search Design</span>
                  <input value={assignSearchQuery} onChange={(e) => setAssignSearchQuery(e.target.value)} placeholder="Search..." />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button type="button" className="button button--small button--ghost" onClick={() => {
                  const visibleIds = filteredAssignmentDesigns.map((d) => String(d.id));
                  setAssignmentSelectedIds(Array.from(new Set([...assignmentSelectedIds, ...visibleIds])));
                }}>
                  Check All Visible
                </button>
                <button type="button" className="button button--small button--ghost" onClick={() => {
                  const visibleIds = filteredAssignmentDesigns.map((d) => String(d.id));
                  setAssignmentSelectedIds(assignmentSelectedIds.filter((id) => !visibleIds.includes(id)));
                }}>
                  Uncheck All Visible
                </button>
              </div>

              <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'grid', gap: '8px' }}>
                {filteredAssignmentDesigns.map((d) => {
                  const isChecked = assignmentSelectedIds.includes(String(d.id));
                  return (
                    <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '8px', background: isChecked ? 'var(--surface-soft)' : 'transparent', cursor: 'pointer' }}>
                      <input type="checkbox" checked={isChecked} onChange={() => {
                        const dId = String(d.id);
                        setAssignmentSelectedIds(isChecked ? assignmentSelectedIds.filter((id) => id !== dId) : [...assignmentSelectedIds, dId]);
                      }} />
                      <span><strong>{d.name}</strong> <small style={{ color: '#64748b' }}>({d.occasion})</small></span>
                    </label>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="button" onClick={handleSaveAssignmentsModal}>Save Assignments</button>
                <button type="button" className="button button--ghost" onClick={() => setAssignmentModalItem(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* SAFETY DELETE BLOCK MODAL */}
        {deleteBlockItem && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card-panel" style={{ width: '100%', maxWidth: '460px', borderRadius: '16px', background: '#fff', padding: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#dc2626' }}>Cannot Permanently Delete</h3>
              <p style={{ fontSize: '0.92rem', color: '#334155', lineHeight: 1.5 }}>
                <strong>"{deleteBlockItem.name}"</strong> has been used in existing customer bookings or cart items. Permanently deleting it would break historical order records.
              </p>
              <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
                You can safely <strong>Archive</strong> or <strong>Disable</strong> this option instead. It will disappear from new customer bookings while remaining fully intact for past orders.
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="button" onClick={() => {
                  handleToggleArchive(deleteBlockItem);
                  setDeleteBlockItem(null);
                }}>
                  Archive Option Instead
                </button>
                <button type="button" className="button button--ghost" onClick={() => setDeleteBlockItem(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* UNSAVED CHANGES GUARD MODAL */}
        {showUnsavedGuard && (
          <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card-panel" style={{ width: '100%', maxWidth: '420px', borderRadius: '16px', background: '#fff', padding: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Unsaved Changes</h3>
              <p style={{ fontSize: '0.92rem', color: '#475569' }}>
                You have unsaved changes in the form. Are you sure you want to discard them?
              </p>
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="button button--ghost" onClick={() => {
                  setIsFormDirty(false);
                  setShowUnsavedGuard(false);
                  setIsFormOpen(false);
                }}>
                  Discard Changes
                </button>
                <button type="button" className="button" onClick={() => setShowUnsavedGuard(false)}>
                  Continue Editing
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminCustomizations;
