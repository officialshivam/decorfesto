import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { optionalFeatureService } from '../services/optionalFeatures';
import { uploadAiSpaceImage, analyzeAiSpaceImage } from '../services/aiAssistantService';
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
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState('');
  const [spaceAnalysis, setSpaceAnalysis] = useState(null);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const runSpaceAnalysis = async (imageUrl) => {
    setAnalyzing(true);
    setAiAnalysisError('');
    try {
      const analysis = await analyzeAiSpaceImage({
        imageUrl,
        roomType: form.roomType,
        occasion: form.occasion,
      });
      setSpaceAnalysis(analysis);
    } catch (err) {
      setAiAnalysisError(err.message || 'AI Space Analysis unavailable.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploading(true);
    setUploadError('');
    setAiAnalysisError('');
    setSpaceAnalysis(null);

    try {
      const uploaded = await uploadAiSpaceImage(file);
      setPhotoName(file.name);
      setPhotoPreview(uploaded.imageUrl);
      setUploading(false);

      // Trigger Phase 2 AI Space Analysis automatically after successful upload
      await runSpaceAnalysis(uploaded.imageUrl);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload image.');
      setUploading(false);
    }
  };

  const handleRetryAnalysis = () => {
    if (photoPreview) {
      runSpaceAnalysis(photoPreview);
    }
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
    setSpaceAnalysis(null);
    setUploadError('');
    setAiAnalysisError('');
    setResult(null);
  };

  const featuredProducts = useMemo(() => products.slice(0, 3), []);

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Real AI Experience</span>
          <h1>AI Decor Assistant</h1>
          <p>Upload a photo of your space for real AI visual space analysis and tailored decor suggestions.</p>
        </div>

        <div className="checkout-layout">
          <form className="card-panel" onSubmit={handleSubmit}>
            <div className="card-panel__header">
              <h2>Tell us about your event</h2>
              <p>Upload a room photo to receive real-time AI space & wall analysis.</p>
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
                <span>Room / space photo upload (JPG, PNG, WEBP max 10MB)</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} disabled={uploading || analyzing} />
                <span className="upload-hint">
                  {uploading
                    ? 'Uploading image to server...'
                    : analyzing
                    ? 'Analyzing room space with AI Vision...'
                    : photoName
                    ? `Selected: ${photoName}`
                    : 'Upload wall or room photo for AI space analysis.'}
                </span>
              </label>

              {uploadError && (
                <div className="alert alert--error" style={{ color: '#d32f2f', margin: '8px 0', fontSize: '0.9rem' }}>
                  <strong>Upload Error:</strong> {uploadError}
                </div>
              )}

              {photoPreview ? (
                <div className="upload-preview" style={{ marginTop: '12px' }}>
                  <img src={photoPreview} alt="Uploaded room preview" style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '240px', objectFit: 'cover' }} />
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

            <button className="button button--full" type="submit" disabled={loading || uploading || analyzing}>
              {loading ? 'Generating ideas…' : 'Generate AI Recommendation'}
            </button>
          </form>

          <aside className="card-panel sticky-summary">
            <div className="card-panel__header">
              <h2>AI recommendation preview</h2>
              <p>Use this space analysis as a styling starting point for your booking.</p>
            </div>

            {/* REAL AI SPACE ANALYSIS SECTION */}
            {analyzing && (
              <div className="payment-card">
                <h3>Analyzing Your Space...</h3>
                <p>AI Vision is inspecting room dimensions, lighting, surface type, and decoration areas.</p>
              </div>
            )}

            {aiAnalysisError && !analyzing && (
              <div className="payment-card" style={{ borderLeft: '4px solid #d32f2f' }}>
                <h3 style={{ color: '#d32f2f' }}>AI Analysis Notice</h3>
                <p>{aiAnalysisError}</p>
                <button type="button" className="button button--small button--ghost" style={{ marginTop: '8px' }} onClick={handleRetryAnalysis}>
                  Retry AI Analysis
                </button>
              </div>
            )}

            {spaceAnalysis && !analyzing && (
              <div className="summary-box" style={{ marginBottom: '16px', border: '1px solid #e0e0e0', padding: '16px', borderRadius: '8px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', color: '#666' }}>
                  AI SPACE ANALYSIS
                </div>
                <div className="summary-box__row">
                  <span>Space</span>
                  <strong>{spaceAnalysis.spaceType}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Surface</span>
                  <strong>{spaceAnalysis.surfaceType}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Available Area</span>
                  <strong>{spaceAnalysis.availableDecorationArea || spaceAnalysis.usableArea}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Wall Color</span>
                  <strong>{spaceAnalysis.wallColor}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Lighting</span>
                  <strong>{spaceAnalysis.lighting}</strong>
                </div>

                {spaceAnalysis.styleCompatibility?.length > 0 && (
                  <div className="summary-box__row summary-box__row--stacked" style={{ marginTop: '8px' }}>
                    <span>Style Compatibility</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {spaceAnalysis.styleCompatibility.map((style, idx) => (
                        <span key={idx} style={{ background: '#e3f2fd', color: '#1565c0', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {spaceAnalysis.decorationConstraints?.length > 0 && (
                  <div className="summary-box__row summary-box__row--stacked" style={{ marginTop: '8px' }}>
                    <span>Decoration Constraints</span>
                    <small style={{ color: '#888' }}>{spaceAnalysis.decorationConstraints.join(', ')}</small>
                  </div>
                )}
              </div>
            )}

            {!result && !spaceAnalysis && !analyzing && !aiAnalysisError ? (
              <div className="payment-card">
                <h3>AI Assistant Ready</h3>
                <p>Upload a photo of your space to view live AI Space Analysis, or submit your preferences to generate package recommendations.</p>
              </div>
            ) : null}

            {result ? (
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
                    <small>{result.photoName} attached for styling pass.</small>
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
            ) : null}

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
