import { Link } from 'react-router-dom';
import { categories } from '../data/categories';
import { products } from '../data/products';
import CategoryCard from '../components/CategoryCard';
import ProductCard from '../components/ProductCard';

function Home() {
  const featuredProducts = products.slice(0, 3);

  return (
    <main className="page page--home">
      <section className="hero">
        <div className="container hero__grid">
          <div className="hero__content">
            <span className="eyebrow">Premium decoration booking platform</span>
            <h1>Beautiful Celebrations, Thoughtfully Crafted.</h1>
            <p>
              DecorFesto brings together curated decoration services for birthdays,
              anniversaries, baby showers, proposals, weddings, and more—across India.
            </p>
            <div className="hero__actions">
              <Link to="/catalog" className="button">
                Explore Decorations
              </Link>
              <a href="#how-it-works" className="button button--ghost">
                How It Works
              </a>
            </div>
            <div className="hero__stats">
              <div>
                <strong>12+</strong>
                <span>premium packages</span>
              </div>
              <div>
                <strong>4.9/5</strong>
                <span>trusted by clients</span>
              </div>
              <div>
                <strong>100%</strong>
                <span>customizable</span>
              </div>
            </div>
          </div>

          <div className="hero__panel">
            <div className="hero__panel-card">
              <h3>Book your dream setup</h3>
              <p>Choose an occasion, compare packages, and request availability in minutes.</p>
              <ul>
                <li>✓ Instant availability checks</li>
                <li>✓ Flexible customization</li>
                <li>✓ Premium vendor coordination</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section__heading">
          <span className="eyebrow">Occasions</span>
          <h2>Celebrate every milestone with intention</h2>
          <p>From intimate dinners to grand celebrations, each package is designed to feel personal and premium.</p>
        </div>
        <div className="card-grid card-grid--categories">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      <section className="section section--soft container">
        <div className="section__heading">
          <span className="eyebrow">Featured packages</span>
          <h2>Designer-worthy decorations that feel effortless</h2>
          <p>Explore a curated selection of décor experiences tailored for the most meaningful moments.</p>
        </div>
        <div className="card-grid card-grid--products">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section id="how-it-works" className="section container">
        <div className="section__heading">
          <span className="eyebrow">How DecorFesto Works</span>
          <h2>From inspiration to celebration in four simple steps</h2>
        </div>
        <div className="steps">
          <article className="step-card">
            <span>01</span>
            <h3>Select an occasion</h3>
            <p>Choose the celebration that matters most and browse suitable décor packages.</p>
          </article>
          <article className="step-card">
            <span>02</span>
            <h3>Customize your setup</h3>
            <p>Pick your theme, color palette, and décor details to shape the mood you want.</p>
          </article>
          <article className="step-card">
            <span>03</span>
            <h3>Check availability</h3>
            <p>Enter your pincode, review the date and time, and confirm your preferred slot.</p>
          </article>
          <article className="step-card">
            <span>04</span>
            <h3>Book with confidence</h3>
            <p>Secure your event setup with a premium booking experience designed for convenience.</p>
          </article>
        </div>
      </section>

      <section className="section section--soft container">
        <div className="section__heading">
          <span className="eyebrow">Optional experiences</span>
          <h2>Helpful touches that stay optional</h2>
        </div>
        <div className="feature-strip">
          <article className="feature-pill">
            <h3>AI Decoration Assistant</h3>
            <p>Get inspiration ideas, décor suggestions, and styling prompts whenever you need them.</p>
            <Link to="/ai-assistant" className="button button--small button--ghost">Try the AI assistant</Link>
          </article>
          <article className="feature-pill">
            <h3>₹49 Designer Consultation</h3>
            <p>Book a quick expert consultation for personalized recommendations and package guidance.</p>
            <Link to="/consultation" className="button button--small">Book a consultation</Link>
          </article>
        </div>
      </section>

      <section className="section container">
        <div className="section__heading">
          <span className="eyebrow">Why customers love DecorFesto</span>
          <h2>Luxury quality, thoughtful service, and memorable results</h2>
        </div>
        <div className="trust-grid">
          <article>
            <h3>Trusted by modern celebrators</h3>
            <p>Every package is created to feel elevated, stylish, and tailored to the occasion.</p>
          </article>
          <article>
            <h3>Flexible customization</h3>
            <p>Choose colors, themes, walkthrough details, and add-ons that suit the celebration.</p>
          </article>
          <article>
            <h3>Pan-India availability</h3>
            <p>Support for major cities and growing coverage for celebrations across the country.</p>
          </article>
        </div>
      </section>

      <section className="section container section--cta">
        <div className="cta-banner">
          <h2>Ready to plan a celebration that feels truly special?</h2>
          <p>Browse premium decoration packages and start creating your next unforgettable event.</p>
          <Link to="/catalog" className="button">
            Start Exploring
          </Link>
        </div>
      </section>
    </main>
  );
}

export default Home;
