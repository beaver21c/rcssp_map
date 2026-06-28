import { useEffect, useState } from 'react';
import InstitutionUpload from './InstitutionUpload.jsx';
import GeocodeUpload from './GeocodeUpload.jsx';

/**
 * ④ 기관 위치 표시 모달.
 * 좌측 패널을 짧게 유지하기 위해 무거운 업로드/지오코딩 UI를 모달로 분리.
 */
export default function InstitutionModal({ open, onClose }) {
  const [tab, setTab] = useState('coord');

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/40 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-md my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white rounded-t-lg">
          <h2 className="text-base font-bold text-slate-800">④ 기관 위치 표시</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 text-lg"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-[11px] text-slate-500 mb-2">
            코로플레스 없이 경계 + 기관 점만 출력도 가능. 표시된 기관명 라벨은 지도 우측 상단 “기관명 표시”로 켜고 끕니다.
          </p>

          <div className="flex gap-1 mb-2">
            <button
              onClick={() => setTab('coord')}
              className={`flex-1 px-2 py-1.5 text-xs rounded border transition ${
                tab === 'coord'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              좌표 직접 (WGS84)
            </button>
            <button
              onClick={() => setTab('geocode')}
              className={`flex-1 px-2 py-1.5 text-xs rounded border transition ${
                tab === 'geocode'
                  ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              주소 지오코딩
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mb-2">
            {tab === 'coord'
              ? '경도·위도 좌표가 이미 있는 경우.'
              : '주소만 있으면 V-World·카카오 API로 좌표 자동변환.'}
          </p>

          {tab === 'coord' ? <InstitutionUpload /> : <GeocodeUpload />}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
