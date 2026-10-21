import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
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
    console.error('HomeOrganizer uncaught error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetData = () => {
    if (confirm('是否重設本機暫存資料並重新載入？（這通常能解決快取結構不相容問題）')) {
      try {
        localStorage.clear();
      } catch (e) {}
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            <h2 className="text-lg font-bold text-slate-100">頁面載入遇到非預期狀況</h2>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              可能由於快取版本更新或本機資料暫存格式不相符。您可以嘗試重新整理或重設快取資料。
            </p>

            {this.state.error && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-400 text-left overflow-x-auto max-h-28">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <RotateCcw className="w-4 h-4" />
                <span>重新整理頁面</span>
              </button>
              
              <button
                onClick={this.handleResetData}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition border border-slate-700"
              >
                <span>清除快取重啟</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
