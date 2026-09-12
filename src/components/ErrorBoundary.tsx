import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);
    this.setState({ error, errorInfo });
  }


  private handleReload = () => {
    window.location.reload();
  };

  private handleResetData = () => {
    if (window.confirm('Reset data lokal (localStorage) dan muat ulang aplikasi? Data master awal akan dikembalikan.')) {
      try {
        localStorage.clear();
      } catch (e) {
        console.error(e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-lg w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Terjadi Kendala Memuat Aplikasi</h1>
                <p className="text-xs text-slate-400">Sistem mendeteksi kendala pada rendering browser.</p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs font-mono text-slate-300 space-y-2 overflow-x-auto">
              <div className="text-red-400 font-semibold break-words">
                {this.state.error?.message || 'Error tidak diketahui'}
              </div>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-[11px] text-slate-500 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>
              <button
                type="button"
                onClick={this.handleResetData}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-rose-600 hover:text-white text-slate-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Bersihkan Cache & Reset
              </button>
            </div>

            <p className="text-[11px] text-center text-slate-400">
              Jika dipublish di GitHub Pages, pastikan pengaturan <strong>Settings &gt; Pages &gt; Source</strong> dipilih <strong>GitHub Actions</strong>.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
