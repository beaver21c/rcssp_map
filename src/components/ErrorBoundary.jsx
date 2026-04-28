import { Component } from 'react';

/**
 * React ErrorBoundary - 컴포넌트 트리 내 예외 포착
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex items-center justify-center w-full h-full bg-red-50">
          <div className="max-w-md p-6 bg-white border border-red-200 rounded shadow">
            <div className="text-red-700 font-bold mb-2">화면 렌더링 오류</div>
            <div className="text-xs text-slate-600 mb-3 break-all">
              {String(this.state.error?.message || this.state.error)}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
