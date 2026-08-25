import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchDecorationsApi } from '../services/decorationService';
import { checkAvailabilityOnServer } from '../services/serviceAreaApi';
import ProductCard from '../components/ProductCard';

export default function Home() {
  const [decorations, setDecorations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDecorationsApi();
        if (isMounted) {
          setDecorations(Array.isArray(data) ? data.filter((item) => item.active) : []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error loading home decorations:', err);
          setError('Unable to load decoration packages. Please check connection and try again.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Derive active categories dynamically from live decorations
  const categories = useMemo(() => {
    const set = new Set();
    decorations.forEach((d) => {
      const name = d.category || d.occasion;
      if (name) set.add(name);
    });
    const derived = Array.from(set).map((name, index) => ({
      id: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      active: true,
      displayOrder: index + 1,
    }));
    return derived.length > 0
      ? derived
      : ['Birthday', 'Romantic', 'Floral', 'Balloon', 'Anniversary', 'Special Occasions'].map((name, index) => ({
          id: `category-${name.toLowerCase().replace(/\s+/g, '-')}`,
          name,
          active: true,
          displayOrder: index + 1,
        }));
  }, [decorations]);

  const featuredDecorations = useMemo(() => {
    return decorations.slice(0, 3);
  }, [decorations]);

  if (loading) {
    return (
      <main className="page page--home" style={{ background: '#faf8f5', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '16px', fontWeight: '500' }}>Loading decoration experiences...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page page--home" style={{ background: '#faf8f5', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '32px' }}>
          <p style={{ color: '#e11d48', fontSize: '16px', marginBottom: '16px' }}>{error}</p>
          <button type="button" onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: '8px', background: '#c2410c', color: '#fff', border: 'none', cursor: 'pointer' }}>Retry</button>
        </div>
      </main>
    );
  }

  // Category fallback descriptions & images
  const categoryMeta = {
    Birthday: {
      image: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=800&q=80',
      description: 'Vibrant balloon arches, backdrop themes & cake table setups for all ages.',
    },
    Romantic: {
      image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80',
      description: 'Candlelight setups, rose petal pathways & intimate anniversary surprise decor.',
    },
    Floral: {
      image: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80',
      description: 'Fresh flower mandaps, entryway garlands & elegant botanical arrangements.',
    },
    Balloon: {
      image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
      description: 'Chrome balloons, garland arches, LED number lights & party backdrops.',
    },
    Anniversary: {
      image: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=800&q=80',
      description: 'Elegant canopy setups, fairytale fairy lights & luxury couple dining decor.',
    },
    'Special Occasions': {
      image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80',
      description: 'Baby showers, housewarmings, proposals & milestone celebrations.',
    },
  };

  // 2. Serviceability Checker State
  const [pincode, setPincode] = useState('');
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);

  const handleCheckService = async (e) => {
    e.preventDefault();
    if (!pincode.trim() || pincode.length < 6) {
      setCheckResult({ ok: false, message: 'Please enter a valid 6-digit Indian pincode.' });
      return;
    }

    setChecking(true);
    setCheckResult(null);

    try {
      const res = await checkAvailabilityOnServer(pincode.trim());
      if (res && (res.available || res.serviceable)) {
        setCheckResult({
          ok: true,
          message: `Great news! DecorFesto is available in pincode ${pincode.trim()}.`,
          areaName: res.areaName || res.name || 'Serviceable Area',
        });
      } else {
        setCheckResult({
          ok: false,
          message: `DecorFesto is currently expanding and not available in pincode ${pincode.trim()} yet.`,
        });
      }
    } catch {
      setCheckResult({
        ok: false,
        message: 'Unable to verify pincode at the moment. Please try again or contact support.',
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="page page--home" style={{ background: '#faf8f5', color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ========================================================================= */}
      {/* 1. HERO SECTION */}
      {/* ========================================================================= */}
      <section
        style={{
          position: 'relative',
          padding: '64px 0 80px 0',
          background: 'radial-gradient(circle at top right, #fff7ed 0%, #faf8f5 60%)',
          overflow: 'hidden',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '48px', alignItems: 'center' }}>
          {/* Hero Content */}
          <div style={{ maxWidth: '580px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '30px',
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '20px',
              }}
            >
              <span>✨</span>
              <span>Premium Event & Celebration Decor</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.4rem, 4vw, 3.6rem)',
                fontWeight: '800',
                color: '#0f172a',
                lineHeight: '1.15',
                letterSpacing: '-0.02em',
                marginBottom: '20px',
              }}
            >
              Beautiful Moments, <br />
              <span style={{ color: '#c2410c', fontStyle: 'italic' }}>Decorated Perfectly.</span>
            </h1>

            <p style={{ fontSize: '1.1rem', color: '#475569', lineHeight: '1.6', marginBottom: '32px' }}>
              Premium decorations for birthdays, celebrations and special moments — designed, delivered and set up for you.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '40px' }}>
              <Link
                to="/catalog"
                style={{
                  padding: '16px 32px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '16px',
                  boxShadow: '0 10px 25px rgba(194, 65, 12, 0.25)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  display: 'inline-block',
                }}
              >
                Explore Decorations
              </Link>
              <a
                href="#how-it-works"
                style={{
                  padding: '16px 28px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  color: '#334155',
                  fontWeight: '600',
                  fontSize: '16px',
                  border: '1px solid #cbd5e1',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                  transition: 'background 0.2s ease',
                  display: 'inline-block',
                }}
              >
                Plan Your Celebration
              </a>
            </div>

            {/* Feature Highlights */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>500+</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Celebrations Setup</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>100%</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Premium Quality</span>
              </div>
              <div>
                <strong style={{ display: 'block', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Verified</strong>
                <span style={{ fontSize: '12px', color: '#64748b' }}>Decor Partners</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Area */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '520px', justifySelf: 'center' }}>
            <div
              style={{
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.18)',
                border: '4px solid #ffffff',
                position: 'relative',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=1000&q=80"
                alt="Luxury Celebration Setup"
                style={{ width: '100%', height: '420px', objectFit: 'cover', display: 'block' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(15, 23, 42, 0.4) 0%, transparent 60%)',
                }}
              />
            </div>

            {/* Floating Info Card 1 */}
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                left: '-20px',
                background: '#ffffff',
                padding: '14px 20px',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '24px' }}>💐</span>
              <div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a' }}>Fresh Florals & Decor</strong>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Handcrafted by Experts</span>
              </div>
            </div>

            {/* Floating Info Card 2 */}
            <div
              style={{
                position: 'absolute',
                bottom: '-20px',
                right: '-20px',
                background: '#ffffff',
                padding: '14px 20px',
                borderRadius: '16px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                border: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span style={{ fontSize: '24px' }}>⚡</span>
              <div>
                <strong style={{ display: 'block', fontSize: '13px', color: '#0f172a' }}>Hassle-Free Setup</strong>
                <span style={{ fontSize: '11px', color: '#16a34a' }}>✓ Timely Delivery</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. CATEGORY / EXPERIENCE SECTION */}
      {/* ========================================================================= */}
      <section className="container" style={{ padding: '80px 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 56px auto' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Occasions & Experiences
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 16px 0' }}>
            Celebrate Your Way
          </h2>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
            Choose from curated celebration categories crafted to elevate your milestone moments.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
          }}
        >
          {categories.slice(0, 6).map((cat) => {
            const meta = categoryMeta[cat.name] || {
              image: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=800&q=80',
              description: 'Custom celebration setups tailored to your occasion.',
            };
            return (
              <Link
                key={cat.id}
                to={`/catalog?occasion=${encodeURIComponent(cat.name)}`}
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
                  transition: 'transform 0.3s ease, boxShadow 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  textDecoration: 'none',
                }}
              >
                <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={meta.image}
                    alt={cat.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.5s ease',
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.4) 0%, transparent 60%)' }} />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '16px',
                      color: '#ffffff',
                      fontSize: '20px',
                      fontWeight: '800',
                    }}
                  >
                    {cat.name}
                  </span>
                </div>
                <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                    {meta.description}
                  </p>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#c2410c', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    Explore Packages <span>→</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FEATURED DECORATIONS SECTION */}
      {/* ========================================================================= */}
      <section style={{ background: '#f8fafc', padding: '80px 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Handcrafted Packages
              </span>
              <h2 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', margin: '6px 0 0 0' }}>
                Made for Your Moment
              </h2>
            </div>
            <Link
              to="/catalog"
              style={{
                fontSize: '14px',
                fontWeight: '700',
                color: '#c2410c',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              View Full Catalog <span>→</span>
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '28px',
            }}
          >
            {featuredDecorations.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. WHY DECORFESTO */}
      {/* ========================================================================= */}
      <section className="container" style={{ padding: '80px 16px' }}>
        <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 56px auto' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            The DecorFesto Distinction
          </span>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 16px 0' }}>
            Why Customers Trust Us
          </h2>
          <p style={{ fontSize: '1rem', color: '#64748b', margin: 0 }}>
            Thoughtfully curated decoration experiences paired with reliable local service.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff7ed', color: '#c2410c', fontSize: '22px', display: 'grid', placeItems: 'center', marginBottom: '20px' }}>
              🎨
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>Beautiful by Design</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
              Carefully curated decoration packages crafted by experienced event stylists.
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff7ed', color: '#c2410c', fontSize: '22px', display: 'grid', placeItems: 'center', marginBottom: '20px' }}>
              ⏰
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>Reliable Setup</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
              On-time delivery and professional setup by verified local decoration teams.
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff7ed', color: '#c2410c', fontSize: '22px', display: 'grid', placeItems: 'center', marginBottom: '20px' }}>
              📍
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>Local Service</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
              Expanding coverage across major Indian cities and pin codes with dedicated vendor networks.
            </p>
          </div>

          <div style={{ background: '#ffffff', padding: '32px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff7ed', color: '#c2410c', fontSize: '22px', display: 'grid', placeItems: 'center', marginBottom: '20px' }}>
              ✨
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: '0 0 10px 0' }}>Simple Booking</h3>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0, lineHeight: '1.6' }}>
              Choose, customize, verify pincode availability, and confirm your slot in a few easy clicks.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. HOW IT WORKS */}
      {/* ========================================================================= */}
      <section id="how-it-works" style={{ background: '#0f172a', color: '#ffffff', padding: '80px 0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 64px auto' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Four Simple Steps
            </span>
            <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#ffffff', margin: '8px 0 16px 0' }}>
              How DecorFesto Works
            </h2>
            <p style={{ fontSize: '1rem', color: '#94a3b8', margin: 0 }}>
              From inspiration to celebration in four seamless steps.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '32px' }}>
            <div style={{ background: '#1e293b', padding: '32px 24px', borderRadius: '20px', border: '1px solid #334155', position: 'relative' }}>
              <span style={{ fontSize: '36px', fontWeight: '900', color: '#ea580c', opacity: 0.9, display: 'block', marginBottom: '16px' }}>01</span>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '10px' }}>Choose Your Decoration</h3>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                Browse curated packages by occasion, theme, or category tailored to your event space.
              </p>
            </div>

            <div style={{ background: '#1e293b', padding: '32px 24px', borderRadius: '20px', border: '1px solid #334155', position: 'relative' }}>
              <span style={{ fontSize: '36px', fontWeight: '900', color: '#ea580c', opacity: 0.9, display: 'block', marginBottom: '16px' }}>02</span>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '10px' }}>Customize Experience</h3>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                Select color palette, lights, backdrop details, and personalized add-ons.
              </p>
            </div>

            <div style={{ background: '#1e293b', padding: '32px 24px', borderRadius: '20px', border: '1px solid #334155', position: 'relative' }}>
              <span style={{ fontSize: '36px', fontWeight: '900', color: '#ea580c', opacity: 0.9, display: 'block', marginBottom: '16px' }}>03</span>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '10px' }}>Confirm Your Booking</h3>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                Verify your pincode availability, choose date & time slot, and secure your order.
              </p>
            </div>

            <div style={{ background: '#1e293b', padding: '32px 24px', borderRadius: '20px', border: '1px solid #334155', position: 'relative' }}>
              <span style={{ fontSize: '36px', fontWeight: '900', color: '#ea580c', opacity: 0.9, display: 'block', marginBottom: '16px' }}>04</span>
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff', marginBottom: '10px' }}>We Set It Up</h3>
              <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, lineHeight: '1.6' }}>
                Our professional decor team arrives on time to set up your celebration flawlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. EMOTIONAL / BRAND SECTION */}
      {/* ========================================================================= */}
      <section style={{ position: 'relative', padding: '100px 0', background: '#451a03', color: '#ffffff', overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=1600&q=80"
          alt="Celebration Atmosphere"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }}
        />
        <div className="container" style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: '780px' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#fdba74', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Memories Made Special
          </span>
          <h2 style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', fontWeight: '800', color: '#ffffff', margin: '16px 0 20px 0', lineHeight: '1.2' }}>
            Your Moments Deserve More Than Just Decoration.
          </h2>
          <p style={{ fontSize: '1.15rem', color: '#fed7aa', lineHeight: '1.7', marginBottom: '36px' }}>
            From intimate birthdays to unforgettable celebrations, DecorFesto helps turn ordinary spaces into beautiful memories.
          </p>
          <Link
            to="/catalog"
            style={{
              padding: '16px 36px',
              borderRadius: '12px',
              background: '#ffffff',
              color: '#451a03',
              fontWeight: '800',
              fontSize: '16px',
              textDecoration: 'none',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              display: 'inline-block',
            }}
          >
            Start Planning
          </Link>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SERVICE AREA CHECKER SECTION */}
      {/* ========================================================================= */}
      <section id="service-areas" className="container" style={{ padding: '80px 16px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
            borderRadius: '24px',
            padding: '48px 32px',
            border: '1px solid #fed7aa',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '36px',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Service Availability
            </span>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '8px 0 12px 0' }}>
              Is DecorFesto Available Near You?
            </h2>
            <p style={{ fontSize: '14px', color: '#475569', margin: 0, lineHeight: '1.6' }}>
              Enter your 6-digit Indian pincode to check instant decoration setup availability in your locality.
            </p>
          </div>

          <div>
            <form onSubmit={handleCheckService} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit pincode (e.g. 110001)"
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  border: '1px solid #cbd5e1',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={checking}
                style={{
                  padding: '14px 24px',
                  borderRadius: '12px',
                  background: checking ? '#94a3b8' : '#c2410c',
                  color: '#ffffff',
                  fontWeight: '700',
                  border: 'none',
                  cursor: checking ? 'not-allowed' : 'pointer',
                  fontSize: '15px',
                }}
              >
                {checking ? 'Checking...' : 'Check Availability'}
              </button>
            </form>

            {checkResult && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: checkResult.ok ? '#f0fdf4' : '#fef2f2',
                  border: `1px solid ${checkResult.ok ? '#bbf7d0' : '#fecaca'}`,
                  color: checkResult.ok ? '#15803d' : '#991b1b',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                {checkResult.ok ? '✓ ' : '⚠️ '}
                {checkResult.message}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. FINAL CTA SECTION */}
      {/* ========================================================================= */}
      <section style={{ background: '#0f172a', padding: '80px 0', borderTop: '1px solid #1e293b' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '640px' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: '800', color: '#ffffff', marginBottom: '16px' }}>
            Ready to Make Your Celebration Special?
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#94a3b8', marginBottom: '32px' }}>
            Explore our decoration experiences and start planning your perfect setup today.
          </p>
          <Link
            to="/catalog"
            style={{
              padding: '16px 36px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '16px',
              textDecoration: 'none',
              display: 'inline-block',
              boxShadow: '0 10px 25px rgba(194, 65, 12, 0.3)',
            }}
          >
            Explore Decorations
          </Link>
        </div>
      </section>

    </main>
  );
}
