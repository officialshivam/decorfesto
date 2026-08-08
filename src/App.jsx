import "./App.css";

function App() {
  return (
    <main className="app">
      <div className="card">
        <div className="badge">🚀 Launching Soon</div>

        <div className="emoji">🎉</div>

        <h1>DecorFesto</h1>

        <h2>Beautiful Celebrations, Thoughtfully Crafted.</h2>

        <p>
          India's premium decoration booking platform for beautiful,
          unforgettable celebrations.
        </p>

        <div className="services">
          <span>🎈 Birthday</span>
          <span>💍 Anniversary</span>
          <span>👶 Baby Shower</span>
          <span>💖 Proposal</span>
          <span>🏠 Housewarming</span>
          <span>🏢 Corporate</span>
        </div>

        <a href="mailto:hello@decorfesto.com" className="button">
          Contact Us
        </a>

        <footer>
          📍 Delhi NCR, India
          <br />
          © 2026 DecorFesto
          <br />
          <small>Designed & Developed with ❤️ by Ceta Cato</small>
        </footer>
      </div>
    </main>
  );
}

export default App;

