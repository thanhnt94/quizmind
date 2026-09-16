import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by QuizMind ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-white tracking-wide">Something went wrong</h2>
              <p className="text-xs font-medium text-slate-400">
                An unexpected interface error occurred. You can reload the page or return to the home dashboard.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-black/40 border border-slate-700/50 text-left overflow-x-auto max-h-32 custom-scrollbar">
                <p className="text-[11px] font-mono text-rose-300 break-words">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}

            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
              <a
                href="/"
                className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
