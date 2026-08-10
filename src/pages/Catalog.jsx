import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getActiveStoredDecorations } from '../services/mockDecorations';
import { getStoredCategories } from '../services/mockCategories';

function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeOccasion = searchParams.get('occasion') || '';
  const [query, setQuery] = useState('');

  const products = useMemo(() => getActiveStoredDecorations(), []);
  const categories = useMemo(() => getStoredCategories().filter((category) => category.active), []);

  // 1. Group products by Occasion for Level 1 (Occasion Landing Page)
  const occasionsData = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      map.set(cat.name, {
        name: cat.name,
        products: [],
        image: '',
      });
    });

    products.forEach((product) => {
      const occ = product.occasion || product.category || 'Custom';
      if (!map.has(occ)) {
        map.set(occ, {
          name: occ,
          products: [],
          image: '',
        });
      }
      const entry = map.get(occ);
      entry.products.push(product);
      if (!entry.image && product.image) {
        entry.image = product.image;
      }
    });

    return Array.from(map.values())
      .filter((occ) => occ.products.length > 0)
      .map((occ) => ({
        ...occ,
        packageCount: occ.products.length,
        image: occ.image || 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
      }));
  }, [products, categories]);

  // Filtered Occasions for Level 1 Search
  const filteredOccasions = useMemo(() => {
    if (!query.trim()) return occasionsData;
    const q = query.toLowerCase();
    return occasionsData.filter(
      (occ) =>
        occ.name.toLowerCase().includes(q) ||
        occ.products.some(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            (p.style && p.style.toLowerCase().includes(q)),
        ),
    );
  }, [occasionsData, query]);

  // 2. Filtered Products for Level 2 (Selected Occasion Page)
  const filteredProducts = useMemo(() => {
    if (!activeOccasion) return [];
    return products.filter((p) => {
      const matchesOccasion = (p.occasion || p.category || 'Custom') === activeOccasion;
      const matchesQuery =
        !query.trim() ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase()) ||
        (p.style && p.style.toLowerCase().includes(query.toLowerCase()));
      return matchesOccasion && matchesQuery;
    });
  }, [products, activeOccasion, query]);

  const handleSelectOccasion = (occasionName) => {
    setSearchParams({ occasion: occasionName });
    setQuery('');
  };

  const handleBackToOccasions = () => {
    setSearchParams({});
    setQuery('');
  };

  // --- LEVEL 2: Occasion Selected -> Display ALL Designs/Packages WITH Prices & Ratings ---
  if (activeOccasion) {
    return (
      <main className="page page--catalog">
        <section className="container section section--tight">
          <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
            <button type="button" className="text-link" onClick={handleBackToOccasions}>
              Catalog
            </button>
            <span>›</span>
            <strong>{activeOccasion}</strong>
          </nav>

          <div className="section__heading section__heading--left">
            <div className="section__heading-top">
              <button type="button" className="button button--small button--ghost" onClick={handleBackToOccasions}>
                ← Back to All Occasions
              </button>
            </div>
            <span className="eyebrow">{activeOccasion} Packages</span>
            <h1>{activeOccasion} Decorations</h1>
            <p>Browse all available {activeOccasion.toLowerCase()} designs, pricing, reviews, and customization options.</p>
          </div>

          <div className="catalog-toolbar">
            <label className="search-field">
              <span>Search {activeOccasion} Designs</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${activeOccasion} packages...`}
              />
            </label>
          </div>

          <div className="catalog-results">
            <div className="catalog-results__summary">
              <p>{filteredProducts.length} packages available</p>
              <div className="detail-actions">
                <Link to="/ai-assistant" className="button button--small button--ghost">
                  AI assistant
                </Link>
                <Link to="/consultation" className="button button--small">
                  ₹49 consultation
                </Link>
              </div>
            </div>

            <div className="card-grid card-grid--products">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      </main>
    );
  }

  // --- LEVEL 1: Main Catalog Page -> Display ONLY Occasion Cards (NO Prices, NO Ratings, NO Products) ---
  return (
    <main className="page page--catalog">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Decoration Catalog</span>
          <h1>Select Celebration Occasion</h1>
          <p>Choose an occasion to discover curated decoration packages for your special day.</p>
        </div>

        <div className="catalog-toolbar">
          <label className="search-field">
            <span>Search Occasions</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Birthday, Anniversary, Baby Shower, Proposal..."
            />
          </label>
        </div>

        <div className="card-grid card-grid--occasions">
          {filteredOccasions.map((occ) => (
            <div
              key={occ.name}
              className="category-card occasion-card"
              onClick={() => handleSelectOccasion(occ.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleSelectOccasion(occ.name)}
            >
              <div className="category-card__media">
                <img src={occ.image} alt={occ.name} loading="lazy" />
                <span className="category-card__badge">
                  {occ.packageCount} {occ.packageCount === 1 ? 'Package' : 'Packages'}
                </span>
              </div>
              <div className="category-card__content">
                <h2>{occ.name}</h2>
                <p>Explore all curated {occ.name.toLowerCase()} setups, backdrops, and theme packages.</p>
                <div className="category-card__footer">
                  <span className="button button--small button--ghost">Browse {occ.name} →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Catalog;
