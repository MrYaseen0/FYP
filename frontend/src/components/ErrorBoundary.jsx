import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Healtheon ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: '#f9f8f6', fontFamily: 'Inter, sans-serif', padding: 40,
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontFamily: 'Merriweather, Georgia, serif', fontSize: 24, color: '#c0392b', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, color: '#7f8c8d', marginBottom: 24, textAlign: 'center', maxWidth: 400 }}>
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '10px 24px', background: '#067857', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >Go to Dashboard</button>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '10px 24px', background: 'transparent', color: '#067857', border: '1px solid #067857',
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', marginTop: 12,
            }}
          >Try Again</button>
          {this.state.error && (
            <pre style={{
              marginTop: 24, padding: 16, background: '#fde8e8', border: '1px solid #c0392b',
              borderRadius: 8, fontSize: 11, color: '#c0392b', maxWidth: 600, overflow: 'auto',
            }}>
              {import.meta.env.DEV ? this.state.error.message : 'An unexpected error occurred. Please try again.'}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
