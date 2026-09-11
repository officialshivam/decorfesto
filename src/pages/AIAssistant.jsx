import { useState } from 'react';
import { uploadAiSpaceImage, analyzeAiSpaceImage } from '../services/aiAssistantService';

const OCCASIONS = [
  'Birthday',
  'Anniversary',
  'Proposal',
  'Baby Shower',
  'Housewarming',
  'Wedding',
  'Kids',
  'Romantic',
  'Festival',
  'Custom',
];

function AIAssistant() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [occasion, setOccasion] = useState('Birthday');

  const [uploadedUrl, setUploadedUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [spaceAnalysis, setSpaceAnalysis] = useState(null);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPhotoName(file.name);
    setUploadedUrl('');
    setSpaceAnalysis(null);
    setErrorMsg('');

    const previewUrl = URL.createObjectURL(file);
    setPhotoPreview(previewUrl);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPhotoPreview('');
    setPhotoName('');
    setUploadedUrl('');
    setSpaceAnalysis(null);
    setErrorMsg('');
  };

  const handleSuggestDecoration = async (event) => {
    event.preventDefault();
    if (!selectedFile && !uploadedUrl) {
      setErrorMsg('Please select a wall or room photo.');
      return;
    }
    if (!occasion) {
      setErrorMsg('Please select an occasion.');
      return;
    }

    setProcessing(true);
    setErrorMsg('');
    setSpaceAnalysis(null);

    try {
      let currentUrl = uploadedUrl;
      if (!currentUrl && selectedFile) {
        const uploadResult = await uploadAiSpaceImage(selectedFile);
        currentUrl = uploadResult.imageUrl;
        setUploadedUrl(currentUrl);
      }

      const analysis = await analyzeAiSpaceImage({
        imageUrl: currentUrl,
        occasion,
      });

      setSpaceAnalysis(analysis);
    } catch (err) {
      setErrorMsg(err.message || 'AI visual analysis service unavailable.');
    } finally {
      setProcessing(false);
    }
  };

  const canSubmit = (selectedFile || uploadedUrl) && occasion && !processing;

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">AI Space Analysis</span>
          <h1>AI Decoration Assistant</h1>
          <p>Upload your wall or room photo and choose an occasion. We'll suggest a decoration that fits your space.</p>
        </div>

        <div className="checkout-layout">
          <form className="card-panel" onSubmit={handleSuggestDecoration}>
            <div className="card-panel__header">
              <h2>Step 1 — Upload Your Wall / Room Photo</h2>
              <p>Use a clear photo of the wall or free space you want to decorate.</p>
            </div>

            <div className="checkout-form">
              <label className="search-field">
                <span>Wall / Room Photo (JPG, JPEG, PNG, WEBP max 10MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileSelect}
                  disabled={processing}
                />
                <span className="upload-hint">
                  {photoName ? `Selected: ${photoName}` : 'Select a photo showing the space to decorate.'}
                </span>
              </label>

              {photoPreview ? (
                <div className="upload-preview" style={{ marginTop: '12px' }}>
                  <img
                    src={photoPreview}
                    alt="Selected space preview"
                    style={{ maxWidth: '100%', borderRadius: '8px', maxHeight: '240px', objectFit: 'cover' }}
                  />
                  <div style={{ marginTop: '8px' }}>
                    <button
                      type="button"
                      className="button button--small button--ghost"
                      onClick={handleRemovePhoto}
                      disabled={processing}
                    >
                      Remove / Replace Image
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="card-panel__header" style={{ marginTop: '24px', padding: 0 }}>
                <h2>Step 2 — Choose Occasion</h2>
              </div>

              <label className="search-field">
                <span>Occasion</span>
                <select
                  name="occasion"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  disabled={processing}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                  {OCCASIONS.map((occ) => (
                    <option key={occ} value={occ}>
                      {occ}
                    </option>
                  ))}
                </select>
              </label>

              {errorMsg && (
                <div className="alert alert--error" style={{ color: '#d32f2f', margin: '12px 0', fontSize: '0.9rem' }}>
                  <strong>Notice:</strong> {errorMsg}
                </div>
              )}
            </div>

            <button
              className="button button--full"
              type="submit"
              disabled={!canSubmit}
              style={{ marginTop: '20px' }}
            >
              {processing ? 'Analyzing Space with AI...' : 'Suggest Decoration'}
            </button>
          </form>

          <aside className="card-panel sticky-summary">
            <div className="card-panel__header">
              <h2>Your AI Decoration Suggestion</h2>
              <p>Real-time visual analysis of your space generated by AI Vision.</p>
            </div>

            {processing && (
              <div className="payment-card">
                <h3>Analyzing Your Space...</h3>
                <p>AI Vision is inspecting room dimensions, wall colors, surface type, and decoration areas.</p>
              </div>
            )}

            {!processing && spaceAnalysis && (
              <div className="summary-box" style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', color: '#1565c0' }}>
                  RECOMMENDED FOR YOUR SPACE
                </div>

                <p style={{ fontSize: '0.95rem', marginBottom: '16px', color: '#333' }}>
                  Based on your photo and <strong>{occasion}</strong> occasion, this space is suitable for a{' '}
                  <strong>{spaceAnalysis.surfaceType || 'wall-focused'}</strong> decoration.
                </p>

                <div className="summary-box__row">
                  <span>Detected Space</span>
                  <strong>{spaceAnalysis.spaceType}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Surface Type</span>
                  <strong>{spaceAnalysis.surfaceType}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Decoration Area</span>
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

                {spaceAnalysis.existingFurniture?.length > 0 && (
                  <div className="summary-box__row summary-box__row--stacked" style={{ marginTop: '8px' }}>
                    <span>Nearby Furniture / Objects</span>
                    <small style={{ color: '#555' }}>{spaceAnalysis.existingFurniture.join(', ')}</small>
                  </div>
                )}

                {spaceAnalysis.styleCompatibility?.length > 0 && (
                  <div className="summary-box__row summary-box__row--stacked" style={{ marginTop: '8px' }}>
                    <span>Recommended Style Compatibility</span>
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
                    <span>Space Constraints</span>
                    <small style={{ color: '#888' }}>{spaceAnalysis.decorationConstraints.join(', ')}</small>
                  </div>
                )}
              </div>
            )}

            {!processing && !spaceAnalysis && !errorMsg && (
              <div className="payment-card">
                <h3>AI Assistant Ready</h3>
                <p>Upload a photo of your wall or room and select your occasion, then click <strong>Suggest Decoration</strong> to receive your AI analysis.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

export default AIAssistant;
