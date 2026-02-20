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
    console.error(`[ErrorBoundary] ${this.props.label || 'View'} crashed:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 32,
          textAlign: 'center',
          color: 'var(--text-muted)',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)', marginBottom: 8 }}>
            {this.props.label || 'This view'} encountered an error
          </div>
          <div style={{ fontSize: 12, marginBottom: 16, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            className="btn btn-accent"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
