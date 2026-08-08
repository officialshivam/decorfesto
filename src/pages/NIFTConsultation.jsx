import { useState } from 'react';
import { Link } from 'react-router-dom';
import { optionalFeatureService } from '../services/optionalFeatures';

const initialForm = {
  occasion: 'Birthday',
  requirements: 'Soft luxury theme with elegant floral backdrop.',
  preferredDate: '2026-09-15',
  preferredTime: '6:00 PM',
  contactName: 'Aarav',
  contactMobile: '9876543210',
};

function NIFTConsultation() {
  const [form, setForm] = useState(initialForm);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const consultation = await optionalFeatureService.createConsultationRequest(form);
    setSummary(consultation);
    setLoading(false);
  };

  return (
    <main className="page">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Optional expert consult</span>
          <h1>₹49 NIFT Designer Consultation</h1>
          <p>Book a short design consultation without blocking your main decoration booking. The fee is intentionally mocked for now.</p>
        </div>

        <div className="checkout-layout">
          <form className="card-panel" onSubmit={handleSubmit}>
            <div className="card-panel__header">
              <h2>Share your consultation brief</h2>
              <p>Choose a date, explain your needs, and confirm your booking request.</p>
            </div>

            <div className="checkout-form">
              <label className="search-field">
                <span>Occasion</span>
                <input name="occasion" value={form.occasion} onChange={handleChange} placeholder="Birthday, Wedding, Proposal" />
              </label>
              <label className="search-field">
                <span>Requirements</span>
                <textarea name="requirements" value={form.requirements} onChange={handleChange} rows="4" style={{ padding: '12px 14px', borderRadius: '16px', border: '1px solid var(--border)' }} />
              </label>
              <label className="search-field">
                <span>Preferred date</span>
                <input name="preferredDate" type="date" value={form.preferredDate} onChange={handleChange} />
              </label>
              <label className="search-field">
                <span>Preferred time</span>
                <input name="preferredTime" value={form.preferredTime} onChange={handleChange} placeholder="6:00 PM" />
              </label>
              <label className="search-field">
                <span>Your name</span>
                <input name="contactName" value={form.contactName} onChange={handleChange} placeholder="Your name" />
              </label>
              <label className="search-field">
                <span>Mobile number</span>
                <input name="contactMobile" value={form.contactMobile} onChange={handleChange} placeholder="Mobile number" />
              </label>
            </div>

            <button className="button button--full" type="submit" disabled={loading}>
              {loading ? 'Preparing summary…' : 'Reserve consultation'}
            </button>
          </form>

          <aside className="card-panel sticky-summary">
            <div className="card-panel__header">
              <h2>Consultation summary</h2>
              <p>Your consultation request will stay separate from normal decoration bookings.</p>
            </div>

            {!summary ? (
              <div className="payment-card">
                <h3>₹49 consultation fee</h3>
                <p>Payment is mocked for now. You can complete your decoration booking separately while keeping this optional add-on available.</p>
              </div>
            ) : (
              <div className="summary-box">
                <div className="summary-box__row summary-box__row--stacked">
                  <span>Consultation confirmed</span>
                  <small>Your request is ready for the next step. No decoration booking is required.</small>
                </div>
                <div className="summary-box__row">
                  <span>Occasion</span>
                  <strong>{summary.occasion}</strong>
                </div>
                <div className="summary-box__row">
                  <span>Consultation fee</span>
                  <strong>₹{summary.fee}</strong>
                </div>
                <div className="summary-box__row summary-box__row--stacked">
                  <span>Requirements</span>
                  <small>{summary.requirements}</small>
                </div>
                <div className="summary-box__row summary-box__row--stacked">
                  <span>Preferred slot</span>
                  <small>{summary.preferredDate} • {summary.preferredTime}</small>
                </div>
                <div className="summary-box__row summary-box__row--stacked">
                  <span>Booking status</span>
                  <small>{summary.status}</small>
                </div>
              </div>
            )}

            <div className="payment-card">
              <h3>Payment status</h3>
              <p>Mock payment is ready for the next phase and will not affect your regular booking checkout.</p>
              <button className="button button--full" disabled type="button">Pay ₹49</button>
            </div>

            <Link to="/catalog" className="text-link">Continue to catalog</Link>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default NIFTConsultation;
