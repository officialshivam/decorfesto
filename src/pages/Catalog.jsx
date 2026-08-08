import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { getActiveStoredDecorations } from '../services/mockDecorations';
import { getStoredCategories } from '../services/mockCategories';

function Catalog() {
  const [selectedOccasion, setSelectedOccasion] = useState('All');
  const [query, setQuery] = useState('');
  const products = useMemo(() => getActiveStoredDecorations(), []);
  const categories = useMemo(() => getStoredCategories().filter((category) => category.active), []);

  const occasions = ['All', ...categories.map((category) => category.name)];

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesOccasion = selectedOccasion === 'All' || product.occasion === selectedOccasion;
      const matchesQuery = product.name.toLowerCase().includes(query.toLowerCase()) || product.description.toLowerCase().includes(query.toLowerCase());
      return matchesOccasion && matchesQuery;
    });
  }, [products, query, selectedOccasion]);

  return (
    <main className="page page--catalog">
      <section className="container section section--tight">
        <div className="section__heading section__heading--left">
          <span className="eyebrow">Decoration catalog</span>
          <h1>Browse premium décor experiences</h1>
          <p>Discover curated celebrations designed for weddings, birthdays, proposals, and more.</p>
        </div>

        <div className="catalog-toolbar">
          <label className="search-field">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search decorations"
            />
          </label>

          <div className="filter-group" role="group" aria-label="Occasion filters">
            {occasions.map((occasion) => (
              <button
                key={occasion}
                type="button"
                className={`chip${selectedOccasion === occasion ? ' chip--active' : ''}`}
                onClick={() => setSelectedOccasion(occasion)}
              >
                {occasion}
              </button>
            ))}
          </div>
        </div>

        <div className="catalog-results">
          <div className="catalog-results__summary">
            <p>{filteredProducts.length} packages available</p>
            <div className="detail-actions">
              <Link to="/ai-assistant" className="button button--small button--ghost">AI assistant</Link>
              <Link to="/consultation" className="button button--small">₹49 consultation</Link>
              <Link to="/" className="text-link">Back to home</Link>
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

export default Catalog;
