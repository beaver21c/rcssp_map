import { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import { loadCodeTable } from '../hooks/useGeoData.js';
import DirectInput from './DirectInput.jsx';
import ExcelUpload from './ExcelUpload.jsx';
import ColorSettings from './ColorSettings.jsx';
import InstitutionUpload from './InstitutionUpload.jsx';
import GeocodeUpload from './GeocodeUpload.jsx';
import { _bm } from '../utils/_meta.js';

const VIEW_MODES = [
  { id: 'sgg', label: '전국 → 시군구 비교' },
  { id: 'sido_emd', label: '시도 선택 → 읍면동' },
  { id: 'sgg_emd', label: '시군구 선택 → 읍면동' }
];

const TABS = [
  { id: 'excel', label: '엑셀 업로드' },
  { id: 'direct', label: '직접 입력' }
];

export default function ControlPanel() {
  const { viewMode, selectedSido, selectedSgg, setViewMode, setSelectedSido, setSelectedSgg } =
    useStore();
  const [codeTable, setCodeTable] = useState(null);
  const [activeTab, setActiveTab] = useState('excel');
  const [instTab, setInstTab] = useState('coord');

  useEffect(() => {
    loadCodeTable().then(setCodeTable).catch((e) => console.error(e));
  }, []);

  if (!codeTable) {
    return <div className="p-4 text-sm text-slate-500">코드 테이블 로딩 중...</div>;
  }

  const sggList = selectedSido ? codeTable.sgg[selectedSido] || [] : [];
  const mergedCities = selectedSido ? codeTable.merged_cities?.[selectedSido] || [] : [];

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto scroll-thin h-full">
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-2">① 보기 모드</h2>
        <div className="flex flex-col gap-1">
          {VIEW_MODES.map((m) => (
            <label
              key={m.id}
              className={`flex items-center gap-2 px-3 py-2 rounded border text-sm cursor-pointer transition ${
                viewMode === m.id
                  ? 'bg-brand-50 border-brand-500 text-brand-700 font-medium'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="viewMode"
                checked={viewMode === m.id}
                onChange={() => setViewMode(m.id)}
                className="accent-brand-500"
              />
              {m.label}
            </label>
          ))}
        </div>
      </section>

      {(viewMode === 'sido_emd' || viewMode === 'sgg_emd') && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-2">시도 선택</h2>
          <select
            value={selectedSido}
            onChange={(e) => setSelectedSido(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-sm"
          >
            <option value="">— 선택하시오 —</option>
            {codeTable.sido.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </section>
      )}

      {viewMode === 'sgg_emd' && selectedSido && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-2">시군구 선택</h2>
          <select
            value={selectedSgg}
            onChange={(e) => setSelectedSgg(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-sm"
          >
            <option value="">— 선택하시오 —</option>
            {mergedCities.length > 0 && (
              <optgroup label="일반구 통합 (시 단위)">
                {mergedCities.map((c) => (
                  <option key={c.virtual_code} value={c.virtual_code}>
                    {c.name} (전체 {c.sgg_codes.length}개 구)
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={mergedCities.length > 0 ? '시군구 (개별)' : '시군구'}>
              {sggList.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          </select>
          {selectedSgg.startsWith('CITY_') && (
            <p className="text-[11px] text-amber-700 mt-1">
              ⓘ 일반구 통합 모드. {mergedCities.find(c => c.virtual_code === selectedSgg)?.sgg_codes.length}개 구의 모든 읍면동 표시
            </p>
          )}
        </section>
      )}

      <section className="pt-3 border-t border-slate-200">
        <h2 className="text-sm font-bold text-slate-700 mb-2">② 데이터 입력</h2>
        <div className="flex gap-1 mb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 px-2 py-1.5 text-xs rounded border transition ${
                activeTab === t.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {activeTab === 'excel' ? <ExcelUpload /> : <DirectInput />}
      </section>

      <section className="pt-3 border-t border-slate-200">
        <h2 className="text-sm font-bold text-slate-700 mb-2">③ 색상 설정</h2>
        <ColorSettings />
      </section>

      <section className="pt-3 border-t border-slate-200">
        <h2 className="text-sm font-bold text-slate-700 mb-2">④ 기관 위치 표시 (선택)</h2>
        <p className="text-[11px] text-slate-500 mb-2">
          코로플레스 없이 경계 + 기관 점만 출력도 가능.
        </p>
        <div className="flex gap-1 mb-2">
          <button
            onClick={() => setInstTab('coord')}
            className={`flex-1 px-2 py-1.5 text-xs rounded border transition ${
              instTab === 'coord'
                ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            좌표 직접 (WGS84)
          </button>
          <button
            onClick={() => setInstTab('geocode')}
            className={`flex-1 px-2 py-1.5 text-xs rounded border transition ${
              instTab === 'geocode'
                ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            주소 지오코딩
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mb-2">
          {instTab === 'coord'
            ? '경도·위도 좌표가 이미 있는 경우.'
            : '주소만 있으면 카카오 API로 좌표 자동변환.'}
        </p>
        {instTab === 'coord' ? <InstitutionUpload /> : <GeocodeUpload />}
      </section>

      <div style={{ flex: 1 }} aria-hidden="true" />
      <div
        aria-hidden="true"
        style={{
          fontSize: '8px',
          color: '#eef0f3',
          letterSpacing: '0.02em',
          userSelect: 'none',
          textAlign: 'left',
          paddingLeft: '2px',
          marginTop: '4px',
          fontWeight: 300,
          lineHeight: '1'
        }}
      >
        {_bm}
      </div>
    </div>
  );
}
