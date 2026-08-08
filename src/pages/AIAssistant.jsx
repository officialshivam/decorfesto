import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { optionalFeatureService } from '../services/optionalFeatures';
import { products } from '../data/products';

const initialForm = {
  occasion: 'Birthday',
  roomType: 'Living room',
  dimensions: '4m x 5m',
  budget: '20000',
  themePreferences: 'Soft luxury',
  colorPreferences: 'Blush pink and ivory',
  decorationPreferences: 'Statement entrance with soft lighting',
};

function AIAssistant() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [photoName, setPhotoName] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const recommendation = await optionalFeatureService.getAssistantRecommendation({
      occasion: form.occasion,
      roomType: form.roomType,
      dimensions: form.dimensions,
      budget: form.budget,
      themePreferences: form.themePreferences,
      colorPreferences: form.colorPreferences,
      decorationPreferences: form.decorationPreferences,
      photoName,
      photoDataUrl: photoPreview,
    });
    setResult(recommendation);
    setLoading(false);
  };

  const handleTryAnotherStyle = () => {
    setResult(null);
  };

  const handleUploadAnotherSpace = () => {
    setPhotoName('');
    setPhotoPreview('');
    setResult(null);
  };

  const featuredProducts = useMemo(() => products.slice(0, 3), []);

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Optional AI experience</span>
          <h1>AI Decor Assistant</h1>
          <p>Get a polished decor direction in seconds. This experience is optional and does not replace the main booking flow.</p>
        </div>

        <div className="checkout-layout">
          <form className="card-panel" onSubmit={handleSubmit}>
            <div className="card-panel__header">
              <h2>Tell us about your event</h2>
              <p>We’ll use mock AI suggestions to recommend decor packages that fit your space and budget.</p>
            </div>

            <div className="checkout-form">
              <label className="search-field">
                <span>Occasion</span>
                <input name="occasion" value={form.occasion} onChange={handleChange} placeholder="Birthday, Wedding, etc." />
              </label>
              <label className="search-field">
                <span>Room / space</span>
                <input name="roomType" value={form.roomType} onChange={handleChange} placeholder="Living room, terrace, stage, etc." />
              </label>
              <label className="search-field">
                <span>Room / space photo upload</span>
                <input type="file" accept="image/*" onChange={handlePhotoUpload} />
                <span className="upload-hint">{photoName ? `Selected: ${photoName}` : 'Optional photo for richer mock AI suggestions.'}</span>
              </label>
              {photoPreview ? (
                <div className="upload-preview">
                  <img src={photoPreview} alt="Selected room preview" />
                </div>
              ) : null}
              <label className="search-field">
                <span>Dimensions</span>
                <input name="dimensions" value={form.dimensions} onChange={handleChange} placeholder="e.g. 4m x 5m" />
              </label>
              <label className="search-field">
                <span>Budget (₹)</span>
                <input name="budget" type="number" value={form.budget} onChange={handleChange} placeholder="20000" />
              </label>
              <label className="search-field">
                <span>Theme / style preference</span>
                <input name="themePreferences" value={form.themePreferences} onChange={handleChange} placeholder="Soft luxury, glam, minimal" />
              </label>
              <label className="search-field">
                <span>Colour preferences</span>
                <input name="colorPreferences" value={form.colorPreferences} onChange={handleChange} placeholder="Blush pink and ivory" />
              </label>
              <label className="search-field">
                <span>Decoration preferences</span>
                <input name="decorationPreferences" value={form.decorationPreferences} onChange={handleChange} placeholder="Statement entrance, floral arch, balloon glow" />
              </label>
            </div>

            <button className="button button--full" type="submit" disabled={loading}>
              {loading ? 'Generating ideas…' : 'Generate AI Recommendation'}
            </button>
          </form>

          <aside className="card-panel sticky-summary">
            <div className="card-panel__header">
              <h2>AI recommendation preview</h2>
              <p>Use this as a styling starting point before placing your decoration booking.</p>
            </div>

            {!result ? (
              <div className="payment-card">
                <h3>Mock AI assistant ready</h3>
                <p>Once you submit the form, a mock recommendation will appear here with package suggestions and styling direction.</p>
              </div>
            ) : (
              <div className="summary-box">
                <div className="summary-box__row">
                  <span>Confidence</span>
                  <strong>{result.confidence}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Estimated budget</span>
                  <strong>{result.estimatedBudget}</strong>
                </div>
                <div className="preview-stage-card">
                  <div className="preview-stage-card__header">
                    <span className="eyebrow">AI Decorated Preview</span>
                    <h3>Before & After</h3>
                  </div>
                  <div className="preview-compare">
                    <div className="preview-compare__card">
                      <span className="preview-compare__label">Your Space</span>
                      <div className="preview-compare__image-wrap">
                        {photoPreview ? <img src={photoPreview} alt="Uploaded room before decoration" /> : <div className="preview-placeholder">Upload a room image to preview the transformation.</div>}
                      </div>
                    </div>
                    <div className="preview-compare__card preview-compare__card--after">
                      <span className="preview-compare__label">AI Decorated Preview</span>
                      <div className="preview-compare__image-wrap preview-compare__image-wrap--after">
                        {photoPreview ? (
                          <>
                            <img src={photoPreview} alt="Decorated room preview" />
                            <div className="preview-overlay preview-overlay--arch" />
                            <div className="preview-overlay preview-overlay--floral" />
                            <div className="preview-overlay preview-overlay--lighting" />
                            <div className="preview-overlay preview-overlay--balloons" />
                          </>
                        ) : (
                          <div className="preview-placeholder">Your decorated preview will appear here.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="preview-meta-grid">
                  <div>
                    <span>Selected occasion</span>
                    <strong>{form.occasion}</strong>
                  </div>
                  <div>
                    <span>Theme</span>
                    <strong>{form.themePreferences}</strong>
                  </div>
                  <div>
                    <span>Budget</span>
                    <strong>{result.estimatedBudget}</strong>
                  </div>
                  <div>
                    <span>Dimensions</span>
                    <strong>{form.dimensions}</strong>
                  </div>
                </div>

                <div className="summary-box__row summary-box__row--stacked">
                  <span>Why this fits</span>
                  <small>{result.explanation}</small>
                </div>
                {result.photoName ? (
                  <div className="summary-box__row summary-box__row--stacked">
                    <span>Photo reference</span>
                    <small>{result.photoName} attached for the mock styling pass.</small>
                  </div>
                ) : null}
                <div className="summary-box__row summary-box__row--stacked">
                  <span>AI analysis</span>
                  <small>{result.designNotes.join(' ')}</small>
                </div>
                <div className="summary-box__row summary-box__row--stacked">
                  <span>Recommended packages</span>
                  <small>
                    {result.recommendedPackages.map((item) => `${item.name} · ₹${item.price.toLocaleString('en-IN')}`).join(' • ')}
                  </small>
                </div>
                {result.recommendedPackages[0] ? (
                  <button type="button" className="button button--full" onClick={() => navigate(`/product/${result.recommendedPackages[0].id}`)}>
                    Book this recommendation
                  </button>
                ) : null}
                <div className="preview-actions">
                  <button type="button" className="button button--ghost button--small" onClick={handleTryAnotherStyle}>
                    Try another style
                  </button>
                  <button type="button" className="button button--small" onClick={handleUploadAnotherSpace}>
                    Upload another space
                  </button>
                </div>
              </div>
            )}

            <div className="payment-card">
              <h3>Suggested packages</h3>
              <p>Browse the catalog and continue your normal booking anytime.</p>
              <div className="detail-list">
                {featuredProducts.map((product) => (
                  <div key={product.id} className="summary-box__row">
                    <span>{product.name}</span>
                    <strong>₹{product.price.toLocaleString('en-IN')}</strong>
                  </div>
                ))}
              </div>
            </div>

            <Link to="/catalog" className="text-link">Browse catalog</Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default AIAssistant;
