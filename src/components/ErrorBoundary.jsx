import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="page">
          <section className="container section section--tight">
            <div className="card-panel empty-state">
              <h1 style={{ color: '#c5221f' }}>Something went wrong</h1>
              <p style={{ fontWeight: '700', color: '#0f172a' }}>
                {this.state.error?.name}: {this.state.error?.message}
              </p>
              <pre
                style={{
                  textAlign: 'left',
                  background: '#1e293b',
                  color: '#f8fafc',
                  padding: '14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  overflowX: 'auto',
                  maxHeight: '300px',
                  margin: '16px 0',
                }}
              >
                {this.state.error?.stack || String(this.state.error)}
              </pre>
              <button
                type="button"
                className="button button--small"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                Reload Page
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
