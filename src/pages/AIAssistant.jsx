import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadAiSpaceImage, analyzeAiSpaceImage, generateDecorationPreview } from '../services/aiAssistantService';

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
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoName, setPhotoName] = useState('');
  const [occasion, setOccasion] = useState('Birthday');

  const [uploadedUrl, setUploadedUrl] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [spaceAnalysis, setSpaceAnalysis] = useState(null);
  const [matchingDecorations, setMatchingDecorations] = useState([]);
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  const [generatingPreview, setGeneratingPreview] = useState(false);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPhotoName(file.name);
    setUploadedUrl('');
    setSpaceAnalysis(null);
    setMatchingDecorations([]);
    setGeneratedImageUrl('');
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
    setMatchingDecorations([]);
    setGeneratedImageUrl('');
    setErrorMsg('');
  };

  const handleSuggestDecoration = async (event) => {
    event?.preventDefault();
    if (!selectedFile && !uploadedUrl) {
      setErrorMsg('Please select a wall or room photo.');
      return;
    }
    if (!occasion) {
      setErrorMsg('Please select an occasion.');
      return;
    }

    setProcessing(true);
    setGeneratingPreview(true);
    setErrorMsg('');
    setSpaceAnalysis(null);
    setMatchingDecorations([]);
    setGeneratedImageUrl('');

    try {
      let currentUrl = uploadedUrl;
      if (!currentUrl && selectedFile) {
        const uploadResult = await uploadAiSpaceImage(selectedFile);
        currentUrl = uploadResult.imageUrl;
        setUploadedUrl(currentUrl);
      }

      // Step 1: Call Gemini Vision Analysis & Catalog Match
      const analyzeResult = await analyzeAiSpaceImage({
        imageUrl: currentUrl,
        occasion,
      });

      setSpaceAnalysis(analyzeResult.analysis);
      setMatchingDecorations(analyzeResult.matchingDecorations || []);

      // Step 2: Call Gemini Image Generation from Backend
      try {
        const genResult = await generateDecorationPreview({
          imageUrl: currentUrl,
          occasion,
          spaceAnalysis: analyzeResult.analysis,
          selectedDecorationIds: (analyzeResult.matchingDecorations || []).map((d) => d.id),
        });
        setGeneratedImageUrl(genResult.generatedImageUrl);
      } catch (genErr) {
        console.warn('AI Image Generation notice:', genErr.message);
        // If image generation service is unavailable, keep original preview image cleanly without crash
      }
    } catch (err) {
      setErrorMsg(err.message || 'AI visual analysis service unavailable.');
    } finally {
      setProcessing(false);
      setGeneratingPreview(false);
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

          <aside className="card-panel sticky-summary" style={{ maxWidth: '100%' }}>
            <div className="card-panel__header">
              <h2>Your Decoration Preview</h2>
              <p>See how your space could look with a DecorFesto decoration.</p>
            </div>

            {processing && (
              <div className="payment-card">
                <h3>Analyzing Your Space & Generating Preview...</h3>
                <p>AI Vision is inspecting wall proportions and adapting DecorFesto catalog designs to your room.</p>
              </div>
            )}

            {!processing && spaceAnalysis && (
              <div>
                {/* BEFORE / AFTER VISUALIZATION GRID */}
                <div className="preview-compare" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  {/* BEFORE CARD */}
                  <div className="preview-compare__card" style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', color: '#666', background: '#eee', padding: '2px 8px', borderRadius: '4px' }}>
                        BEFORE
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#555', fontWeight: '600' }}>Your Space</span>
                    </div>
                    <div className="preview-compare__image-wrap">
                      <img src={photoPreview || uploadedUrl} alt="Your original room wall before decoration" style={{ width: '100%', borderRadius: '6px', maxHeight: '280px', objectFit: 'cover' }} />
                    </div>
                  </div>

                  {/* AFTER CARD */}
                  <div className="preview-compare__card" style={{ border: '2px solid #1565c0', borderRadius: '8px', padding: '12px', background: '#f4f8ff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', color: '#fff', background: '#1565c0', padding: '2px 8px', borderRadius: '4px' }}>
                        AFTER
                      </span>
                      <span style={{ fontSize: '0.85rem', color: '#1565c0', fontWeight: 'bold' }}>AI Decoration Preview</span>
                    </div>
                    <div className="preview-compare__image-wrap" style={{ position: 'relative' }}>
                      {generatingPreview ? (
                        <div style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e3f2fd', borderRadius: '6px' }}>
                          <span>Generating AI preview...</span>
                        </div>
                      ) : generatedImageUrl ? (
                        <img src={generatedImageUrl} alt="AI decorated space preview" style={{ width: '100%', borderRadius: '6px', maxHeight: '280px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ position: 'relative' }}>
                          <img src={photoPreview || uploadedUrl} alt="Decorated room preview" style={{ width: '100%', borderRadius: '6px', maxHeight: '280px', objectFit: 'cover' }} />
                          <div className="preview-overlay preview-overlay--arch" />
                          <div className="preview-overlay preview-overlay--floral" />
                          <div className="preview-overlay preview-overlay--lighting" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* MATCHING DECORFESTO IDEAS USED */}
                {matchingDecorations.length > 0 && (
                  <div id="decorfesto-ideas-section" style={{ marginBottom: '24px', border: '1px solid #e0e0e0', padding: '16px', borderRadius: '8px', background: '#fff' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px', color: '#333' }}>
                      DecorFesto Ideas Used
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '16px' }}>
                      Visual design inspired by these actual DecorFesto catalog decorations:
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                      {matchingDecorations.map((item) => (
                        <div key={item.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '10px', background: '#fafafa', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            {item.image ? (
                              <img src={item.image} alt={item.name} style={{ width: '100%', height: '110px', objectFit: 'cover', borderRadius: '6px', marginBottom: '8px' }} />
                            ) : null}
                            <div style={{ fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '4px', color: '#222' }}>{item.name}</div>
                            <div style={{ fontSize: '0.85rem', color: '#1565c0', fontWeight: 'bold', marginBottom: '8px' }}>
                              ₹{item.price ? item.price.toLocaleString('en-IN') : 'N/A'}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="button button--small button--full"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => navigate(`/product/${item.id}`)}
                          >
                            View Decoration
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI EXPLANATION SECTION */}
                <div className="summary-box" style={{ padding: '16px', borderRadius: '8px', border: '1px solid #e0e0e0', marginBottom: '20px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', color: '#1565c0' }}>
                    WHY THIS DESIGN FITS
                  </div>

                  <ul style={{ paddingLeft: '18px', margin: 0, fontSize: '0.9rem', color: '#444', lineHeight: '1.6' }}>
                    <li>Fits the detected <strong>{spaceAnalysis.spaceType}</strong> ({spaceAnalysis.surfaceType}).</li>
                    <li>Designed for <strong>{spaceAnalysis.availableDecorationArea || spaceAnalysis.usableArea}</strong> section.</li>
                    <li>Tailored for <strong>{occasion}</strong> celebration.</li>
                    {spaceAnalysis.styleCompatibility?.length > 0 && (
                      <li>Uses complementary style: <strong>{spaceAnalysis.styleCompatibility.join(', ')}</strong>.</li>
                    )}
                    {spaceAnalysis.decorationConstraints?.length > 0 && (
                      <li>Considers space constraints: <em>{spaceAnalysis.decorationConstraints.join(', ')}</em>.</li>
                    )}
                  </ul>
                </div>

                {/* ACTION BUTTONS */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="button button--full"
                    style={{ flex: 1 }}
                    onClick={() => {
                      const elem = document.getElementById('decorfesto-ideas-section');
                      if (elem) elem.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Explore This Decoration
                  </button>
                  <button
                    type="button"
                    className="button button--ghost button--full"
                    style={{ flex: 1 }}
                    onClick={handleSuggestDecoration}
                    disabled={processing}
                  >
                    Try Another Style
                  </button>
                </div>
              </div>
            )}

            {!processing && !spaceAnalysis && !errorMsg && (
              <div className="payment-card">
                <h3>AI Assistant Ready</h3>
                <p>Upload a photo of your wall or room and select your occasion, then click <strong>Suggest Decoration</strong> to receive your BEFORE/AFTER visualization and matching DecorFesto ideas.</p>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

export default AIAssistant;
