import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { getStoredDecorations, saveStoredDecoration } from '../services/mockDecorations';
import { getStoredCategories } from '../services/mockCategories';
import {
  getStoredCustomizations,
  toggleCustomizationAssignment,
} from '../services/mockCustomizations';

const emptyDecoration = {
  id: '', decorationId: '', name: '', category: 'Birthday', shortDescription: '', description: '',
  price: '', basePrice: '', originalPrice: '', imageAssets: [], rating: '4.8', reviewCount: '12',
  highlights: '', includedItems: '', excludedItems: '', customizationOptions: '', addOns: '',
  duration: '4 hours', setupRequirements: '', featured: false, active: true, displayOrder: '1',
};

const listFields = ['highlights', 'includedItems', 'excludedItems', 'addOns'];
const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const supportedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

function toFormDecoration(decoration) {
  const priceVal = decoration.price ?? decoration.basePrice ?? decoration.originalPrice ?? '';
  return {
    ...decoration,
    price: priceVal,
    basePrice: priceVal,
    originalPrice: priceVal,
    ...Object.fromEntries(listFields.map((field) => [field, (decoration[field] || []).join(', ')])),
    imageAssets: decoration.imageAssets || [],
    customizationOptions: JSON.stringify(decoration.customizationOptions || [], null, 2),
  };
}

function parseList(value) {
  return String(value || '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

function parseCustomizationOptions(value) {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createImageAsset(url, metadata = {}) {
  return {
    id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    url,
    name: metadata.name || '',
    mimeType: metadata.mimeType || '',
    source: metadata.source || 'hosted-url',
    isPrimary: metadata.isPrimary === true,
  };
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image.'));
    reader.readAsDataURL(file);
  });
}

function AdminDecorations() {
  const [decorations, setDecorations] = useState(() => getStoredDecorations());
  const [categories] = useState(() => getStoredCategories());
  const [customizationsList, setCustomizationsList] = useState(() => getStoredCustomizations());
  const [form, setForm] = useState(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [priceSort, setPriceSort] = useState('displayOrder');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageError, setImageError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const visibleDecorations = useMemo(() => {
    const minimum = minPrice === '' ? null : Number(minPrice);
    const maximum = maxPrice === '' ? null : Number(maxPrice);
    const filtered = decorations.filter((decoration) => {
      const p = Number(decoration.price ?? decoration.basePrice ?? 0);
      return (
        decoration.name.toLowerCase().includes(query.toLowerCase())
        && (category === 'All' || decoration.category === category)
        && (status === 'All' || (status === 'Active' ? decoration.active : !decoration.active))
        && (minimum === null || p >= minimum)
        && (maximum === null || p <= maximum)
      );
    });
    return filtered.sort((first, second) => {
      const p1 = Number(first.price ?? first.basePrice ?? 0);
      const p2 = Number(second.price ?? second.basePrice ?? 0);
      if (priceSort === 'lowToHigh') return p1 - p2;
      if (priceSort === 'highToLow') return p2 - p1;
      return (first.displayOrder || 0) - (second.displayOrder || 0);
    });
  }, [category, decorations, maxPrice, minPrice, priceSort, query, status]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const addImageAsset = (asset) => {
    setForm((current) => ({
      ...current,
      imageAssets: [...(current.imageAssets || []), { ...asset, isPrimary: (current.imageAssets || []).length === 0 }],
    }));
  };

  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    try {
      new URL(url);
      addImageAsset(createImageAsset(url));
      setImageUrlInput('');
      setImageError('');
    } catch {
      setImageError('Enter a valid image URL.');
    }
  };

  const handleImageFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const invalidFile = files.find((file) => !supportedImageTypes.includes(file.type) || file.size > MAX_IMAGE_SIZE_BYTES);
    event.target.value = '';
    if (invalidFile) {
      setImageError('Use JPG, PNG, or WebP images up to 2 MB each.');
      return;
    }
    try {
      const assets = await Promise.all(files.map(async (file) => createImageAsset(await readImageFile(file), {
        name: file.name, mimeType: file.type, source: 'local-preview',
      })));
      assets.forEach(addImageAsset);
      setImageError('');
    } catch {
      setImageError('Unable to read one or more images.');
    }
  };

  const setPrimaryImage = (imageId) => {
    setForm((current) => ({ ...current, imageAssets: current.imageAssets.map((asset) => ({ ...asset, isPrimary: asset.id === imageId })) }));
  };

  const removeImage = (imageId) => {
    setForm((current) => {
      const remaining = current.imageAssets.filter((asset) => asset.id !== imageId);
      return { ...current, imageAssets: remaining.map((asset, index) => ({ ...asset, isPrimary: asset.isPrimary || index === 0 })) };
    });
  };

  const saveDecoration = (decoration) => {
    const numPrice = Number(decoration.price ?? decoration.basePrice ?? 0);
    const savedDecoration = saveStoredDecoration({
      ...decoration,
      price: numPrice,
      basePrice: numPrice,
      originalPrice: numPrice,
      ...Object.fromEntries(listFields.map((field) => [field, parseList(decoration[field])])),
      imageAssets: decoration.imageAssets || [],
      customizationOptions: parseCustomizationOptions(decoration.customizationOptions),
    });
    setDecorations((current) => {
      const exists = current.some((entry) => entry.id === savedDecoration.id);
      return exists ? current.map((entry) => (entry.id === savedDecoration.id ? savedDecoration : entry)) : [...current, savedDecoration];
    });
    return savedDecoration;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    try {
      const isEditing = Boolean(form.id);
      const decName = form.name || 'Decoration';
      saveDecoration(form);
      setForm(null);
      setSuccessMessage(isEditing ? `"${decName}" updated successfully!` : `"${decName}" added successfully!`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error saving decoration:', err);
      setImageError('Unable to save decoration. Please check inputs.');
    }
  };

  const handleToggleActive = (decoration) => {
    const nextActive = !decoration.active;
    saveDecoration({ ...decoration, active: nextActive });
    setSuccessMessage(`"${decoration.name}" ${nextActive ? 'activated' : 'deactivated'} successfully!`);
    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  };

  const handleCustomizationAssignmentToggle = (itemId, isChecked) => {
    if (!form || !form.id) return;
    toggleCustomizationAssignment(itemId, form.id, isChecked);
    setCustomizationsList(getStoredCustomizations());
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Admin</span>
          <h1>Decorations</h1>
          <p>Manage local decoration packages shown in the customer catalog.</p>
        </div>

        {successMessage ? (
          <div className="admin-success-banner" role="alert">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="#137333"/>
            </svg>
            <span>{successMessage}</span>
          </div>
        ) : null}

        <div className="admin-orders__toolbar">
          <Link to="/admin/categories" className="button button--small button--ghost">Manage Categories</Link>
          <Link to="/admin/customizations" className="button button--small button--ghost">Manage Customizations</Link>
          <button type="button" className="button button--small" onClick={() => { setForm(emptyDecoration); setImageError(''); setSuccessMessage(''); }}>Add Decoration</button>
        </div>
        <div className="catalog-toolbar admin-decorations__filters">
          <label className="search-field"><span>Search decorations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" /></label>
          <label className="search-field"><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select></label>
          <label className="search-field"><span>Min price</span><input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} /></label>
          <label className="search-field"><span>Max price</span><input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} /></label>
          <label className="search-field"><span>Sort price</span><select value={priceSort} onChange={(event) => setPriceSort(event.target.value)}><option value="displayOrder">Display priority</option><option value="lowToHigh">Low to high</option><option value="highToLow">High to low</option></select></label>
        </div>
        <div className="filter-group admin-decorations__categories" role="group" aria-label="Decoration categories">
          {['All', ...categories.map((item) => item.name)].map((item) => <button key={item} type="button" className={`chip${category === item ? ' chip--active' : ''}`} onClick={() => setCategory(item)}>{item}</button>)}
        </div>

        {form ? (
          <div className="card-panel admin-decorations__form">
            <div className="card-panel__header"><h2>{form.id ? `Edit Decoration: ${form.name}` : 'Add Decoration'}</h2></div>
            <form className="auth-form" onSubmit={handleSubmit}>
              <fieldset className="admin-decorations__section"><legend>Basic Information</legend>
                <label className="search-field"><span>Name</span><input name="name" value={form.name} onChange={handleChange} required /></label>
                <label className="search-field"><span>Category</span><select name="category" value={form.category} onChange={handleChange}>{categories.filter((item) => item.active || item.name === form.category).map((item) => <option key={item.id}>{item.name}</option>)}</select></label>
                <label className="search-field"><span>Short description</span><textarea name="shortDescription" value={form.shortDescription} onChange={handleChange} required /></label>
                <label className="search-field"><span>Description</span><textarea name="description" value={form.description} onChange={handleChange} required /></label>
              </fieldset>
              <fieldset className="admin-decorations__section"><legend>Pricing</legend>
                <label className="search-field"><span>Price (₹)</span><input name="price" type="number" min="0" value={form.price !== undefined && form.price !== '' ? form.price : (form.basePrice || '')} onChange={(e) => {
                  const val = e.target.value;
                  setForm((curr) => ({ ...curr, price: val, basePrice: val, originalPrice: val }));
                }} required placeholder="e.g. 12999" /></label>
              </fieldset>

              {/* DESIGN-LEVEL ASSIGNED CUSTOMIZATIONS SECTION */}
              {form.id ? (
                <fieldset className="admin-decorations__section">
                  <legend>Customization Options Assigned to This Design</legend>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 12px' }}>
                    Select which Theme Color Palettes, Floral Arrangements, and Add-on Cards apply to <strong>{form.name}</strong>.
                  </p>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {['colorPalette', 'floralArrangement', 'addon'].map((type) => {
                      const typeLabel = type === 'colorPalette' ? 'Theme Color Palettes' : type === 'floralArrangement' ? 'Floral Arrangements' : 'Add-On Experience Cards';
                      const items = customizationsList.filter((item) => item.type === type);

                      return (
                        <div key={type} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '12px', background: '#fff' }}>
                          <h4 style={{ margin: '0 0 8px', fontSize: '0.95rem', color: 'var(--heading)' }}>{typeLabel}</h4>
                          <div style={{ display: 'grid', gap: '6px' }}>
                            {items.map((item) => {
                              const isAssigned = Array.isArray(item.assignedDesigns) && item.assignedDesigns.map(String).includes(String(form.id));
                              return (
                                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.88rem' }}>
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => handleCustomizationAssignmentToggle(item.id, e.target.checked)}
                                  />
                                  <span>
                                    <strong>{item.name}</strong> ({item.price ? `+₹${item.price}` : 'Included'})
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: '12px' }}>
                    <Link to="/admin/customizations" className="button button--small button--ghost">
                      + Manage All Customizations in Admin Panel
                    </Link>
                  </div>
                </fieldset>
              ) : null}

              <fieldset className="admin-decorations__section"><legend>Images</legend>
                <label className="search-field"><span>Hosted image URL</span><input type="url" value={imageUrlInput} onChange={(event) => setImageUrlInput(event.target.value)} placeholder="https://your-hostinger-domain.com/image.jpg" /></label>
                <button type="button" className="button button--small button--ghost" onClick={handleAddImageUrl}>Add Image URL</button>
                <label className="search-field"><span>Local image preview</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageFiles} /><small>JPG, PNG, or WebP up to 2 MB each.</small></label>
                {imageError ? <p className="field-error">{imageError}</p> : null}
                {form.imageAssets?.length ? <div className="admin-decoration-images">{form.imageAssets.map((asset) => <div key={asset.id} className="admin-decoration-images__item"><img src={asset.url} alt={asset.name || form.name || 'Decoration preview'} /><span>{asset.isPrimary ? 'Cover image' : 'Gallery image'}</span><div><button type="button" className="text-link" onClick={() => setPrimaryImage(asset.id)}>Set as cover</button><button type="button" className="text-link" onClick={() => removeImage(asset.id)}>Remove</button></div></div>)}</div> : null}
              </fieldset>
              <fieldset className="admin-decorations__section"><legend>Package Details</legend>
                <label className="search-field"><span>Rating</span><input name="rating" type="number" min="0" max="5" step="0.1" value={form.rating} onChange={handleChange} required /></label>
                <label className="search-field"><span>Review count</span><input name="reviewCount" type="number" min="0" value={form.reviewCount} onChange={handleChange} required /></label>
                <label className="search-field"><span>Highlights</span><textarea name="highlights" value={form.highlights} onChange={handleChange} placeholder="Separate items with commas" /></label>
                <label className="search-field"><span>Included items</span><textarea name="includedItems" value={form.includedItems} onChange={handleChange} placeholder="Separate items with commas" /></label>
                <label className="search-field"><span>Excluded items</span><textarea name="excludedItems" value={form.excludedItems} onChange={handleChange} placeholder="Separate items with commas" /></label>
                <label className="search-field"><span>Duration</span><input name="duration" value={form.duration} onChange={handleChange} placeholder="e.g. 4 hours" /></label>
                <label className="search-field"><span>Setup requirements</span><textarea name="setupRequirements" value={form.setupRequirements} onChange={handleChange} /></label>
              </fieldset>
              <fieldset className="admin-decorations__section"><legend>Customer Display Settings</legend>
                <label className="search-field"><span>Display priority</span><input name="displayOrder" type="number" min="0" value={form.displayOrder} onChange={handleChange} /></label>
                <label className="checkbox-row"><input name="featured" type="checkbox" checked={form.featured} onChange={handleChange} /><span>Featured / Popular</span></label>
                <label className="checkbox-row"><input name="active" type="checkbox" checked={form.active} onChange={handleChange} /><span>Active</span></label>
              </fieldset>
              <div className="confirmation-actions"><button type="submit" className="button">Save Decoration</button><button type="button" className="button button--ghost" onClick={() => setForm(null)}>Cancel</button></div>
            </form>
          </div>
        ) : null}

        <div className="card-panel admin-orders__table-wrap"><table className="admin-orders__table"><thead><tr><th>Image</th><th>Name</th><th>Category</th><th>Price</th><th>Featured</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead><tbody>
          {visibleDecorations.map((decoration) => <tr key={decoration.id}><td><img src={decoration.imageUrl} alt="" className="admin-decoration-thumbnail" /></td><td><strong>{decoration.name}</strong></td><td>{decoration.category}</td><td>₹{Number(decoration.price ?? decoration.basePrice ?? 0).toLocaleString('en-IN')}</td><td>{decoration.featured ? 'Yes' : 'No'}</td><td>{decoration.displayOrder}</td><td><span className="status-pill">{decoration.active ? 'Active' : 'Inactive'}</span></td><td><div className="admin-decorations__actions"><button type="button" className="button button--small button--ghost" onClick={() => { setForm(toFormDecoration(decoration)); setImageError(''); setSuccessMessage(''); }}>Edit</button><button type="button" className="button button--small button--ghost" onClick={() => handleToggleActive(decoration)}>{decoration.active ? 'Deactivate' : 'Activate'}</button></div></td></tr>)}
        </tbody></table></div>
      </section>
    </main>
  );
}

export default AdminDecorations;
