import React from 'react';

interface ErrorBoundaryProps {
  name: string;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[ErrorBoundary:${this.props.name}]`, error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            width: '100%',
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            padding: 24,
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Something went wrong in {this.props.name}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 16,
                wordBreak: 'break-word',
              }}
            >
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  background: 'var(--button-bg)',
                  color: 'var(--button-text)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 4,
                  padding: '5px 14px',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  background: 'var(--button-active-bg, #3B82F6)',
                  color: '#FFFFFF',
                  border: '1px solid var(--border-primary)',
                  borderRadius: 4,
                  padding: '5px 14px',
                  cursor: 'pointer',
                  fontSize: 11,
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
