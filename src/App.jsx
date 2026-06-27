import { useState } from 'react';
import MapView from './components/MapView.jsx';
import ControlPanel from './components/ControlPanel.jsx';
import UsageGuide from './components/UsageGuide.jsx';
import Footer from './components/Footer.jsx';
import ExportButton from './components/ExportButton.jsx';
import ResetButton from './components/ResetButton.jsx';
import ServiceGuide from './components/ServiceGuide.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

export default function App() {
  const [panelOpen, setPanelOpen] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="flex flex-col h-screen w-screen">
      <header className="bg-white border-b border-slate-200 px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            className="md:hidden p-1.5 -ml-1 rounded hover:bg-slate-100 flex-shrink-0"
            onClick={() => setPanelOpen((v) => !v)}
            aria-label="패널 토글"
          >
            <span className="block w-5 h-0.5 bg-slate-700 mb-1"></span>
            <span className="block w-5 h-0.5 bg-slate-700 mb-1"></span>
            <span className="block w-5 h-0.5 bg-slate-700"></span>
          </button>
          <h1 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 truncate">
            <span className="hidden md:inline">지역사회보장계획 수립을 위한 GIS분석</span>
            <span className="md:hidden">지보계 GIS분석</span>
            <span className="text-slate-500 font-normal text-xs sm:text-sm ml-1">
              (읍면동 단위 코로플레스 맵)
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setGuideOpen(true)}
            className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm border border-brand-500 text-brand-600 rounded hover:bg-brand-50 font-medium whitespace-nowrap"
          >
            <span className="hidden sm:inline">📖 이용 가이드</span>
            <span className="sm:hidden">📖</span>
          </button>
          <ResetButton />
          <ExportButton />
        </div>
      </header>

      <ServiceGuide open={guideOpen} onClose={() => setGuideOpen(false)} />

      <main className="flex flex-1 overflow-hidden relative">
        <aside
          className={`bg-white border-r border-slate-200 flex-shrink-0 transition-transform duration-200 z-[700]
            md:static md:w-80 md:translate-x-0
            absolute inset-y-0 left-0 w-72 ${
              panelOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
          <ErrorBoundary>
            <ControlPanel />
          </ErrorBoundary>
        </aside>

        {panelOpen && (
          <div
            className="md:hidden absolute inset-0 bg-black/30 z-[650]"
            onClick={() => setPanelOpen(false)}
          />
        )}

        <section
          id="map-export-area"
          className="flex-1 relative bg-slate-100"
        >
          <ErrorBoundary>
            <MapView />
          </ErrorBoundary>
        </section>
      </main>

      <UsageGuide />
      <Footer />
    </div>
  );
}
