import { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import { loadCodeTable } from '../hooks/useGeoData.js';
import { PALETTES, CLASSIFICATIONS } from '../hooks/useColorScale.js';
import DirectInput from './DirectInput.jsx';
import ExcelUpload from './ExcelUpload.jsx';
import ColorSettings from './ColorSettings.jsx';
import InstitutionModal from './InstitutionModal.jsx';
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

/** 접이식 섹션: 접혔을 때 현재 선택 요약을 헤더에 표시 */
function Section({ id, title, summary, open, onToggle, children }) {
  return (
    <section className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => onToggle(id)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-slate-50"
      >
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-700">{title}</div>
          {!open && summary && (
            <div className="text-[11px] text-slate-500 truncate mt-0.5">{summary}</div>
          )}
        </div>
        <span className={`text-slate-400 text-xs transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="px-3 pb-3 pt-1 border-t border-slate-100">{children}</div>}
    </section>
  );
}

export default function ControlPanel() {
  const {
    viewMode, selectedSido, selectedSgg,
    setViewMode, setSelectedSido, setSelectedSgg,
    values, paletteName, classification, classCount, institutions
  } = useStore();

  const [codeTable, setCodeTable] = useState(null);
  const [activeTab, setActiveTab] = useState('excel');
  const [instOpen, setInstOpen] = useState(false);

  // 초기 펼침 단계: 현재 진행 단계만 펼침
  const regionReady =
    viewMode === 'sgg' ||
    (viewMode === 'sido_emd' && selectedSido) ||
    (viewMode === 'sgg_emd' && selectedSido && selectedSgg);
  const [openId, setOpenId] = useState(
    !regionReady ? 'view' : Object.keys(values).length === 0 ? 'data' : 'color'
  );
  const toggle = (id) => setOpenId((prev) => (prev === id ? '' : id));

  useEffect(() => {
    loadCodeTable().then(setCodeTable).catch((e) => console.error(e));
  }, []);

  if (!codeTable) {
    return <div className="p-4 text-sm text-slate-500">코드 테이블 로딩 중...</div>;
  }

  const sggList = selectedSido ? codeTable.sgg[selectedSido] || [] : [];
  const mergedCities = selectedSido ? codeTable.merged_cities?.[selectedSido] || [] : [];

  // ---- 요약 문자열 ----
  const sidoName = (cd) => codeTable.sido.find((s) => s.code === cd)?.name || '';
  const sggName = (sidoCd, sggCd) => {
    if (sggCd.startsWith('CITY_')) {
      return (codeTable.merged_cities?.[sidoCd] || []).find((c) => c.virtual_code === sggCd)?.name || '';
    }
    return (codeTable.sgg[sidoCd] || []).find((s) => s.code === sggCd)?.name || '';
  };
  const modeLabel = VIEW_MODES.find((m) => m.id === viewMode)?.label || '';
  let regionPart = '';
  if (viewMode === 'sido_emd') regionPart = selectedSido ? sidoName(selectedSido) : '시도 미선택';
  else if (viewMode === 'sgg_emd') {
    regionPart = selectedSido
      ? `${sidoName(selectedSido)}${selectedSgg ? ' · ' + sggName(selectedSido, selectedSgg) : ' · 시군구 미선택'}`
      : '시도 미선택';
  }
  const viewSummary = regionPart ? `${modeLabel} ▸ ${regionPart}` : modeLabel;

  const nVals = Object.keys(values).length;
  const dataSummary = nVals > 0 ? `${nVals}개 지역 입력됨` : '미입력';

  const colorSummary =
    `${PALETTES[paletteName]?.label || paletteName} · ` +
    `${CLASSIFICATIONS.find((c) => c.id === classification)?.label || classification} ${classCount}단계`;

  return (
    <div className="flex flex-col gap-2.5 p-4 overflow-y-auto scroll-thin h-full">
      <Section id="view" title="① 보기 모드 · 지역" summary={viewSummary} open={openId === 'view'} onToggle={toggle}>
        <div className="flex flex-col gap-1 mt-1">
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

        {(viewMode === 'sido_emd' || viewMode === 'sgg_emd') && (
          <div className="mt-3">
            <h3 className="text-xs font-bold text-slate-600 mb-1">시도 선택</h3>
            <select
              value={selectedSido}
              onChange={(e) => setSelectedSido(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 bg-white text-sm"
            >
              <option value="">— 선택하시오 —</option>
              {codeTable.sido.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {viewMode === 'sgg_emd' && selectedSido && (
          <div className="mt-3">
            <h3 className="text-xs font-bold text-slate-600 mb-1">시군구 선택</h3>
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
                  <option key={s.code} value={s.code}>{s.name}</option>
                ))}
              </optgroup>
            </select>
            {selectedSgg.startsWith('CITY_') && (
              <p className="text-[11px] text-amber-700 mt-1">
                ⓘ 일반구 통합 모드. {mergedCities.find((c) => c.virtual_code === selectedSgg)?.sgg_codes.length}개 구의 모든 읍면동 표시
              </p>
            )}
          </div>
        )}
      </Section>

      <Section id="data" title="② 데이터 입력" summary={dataSummary} open={openId === 'data'} onToggle={toggle}>
        <div className="flex gap-1 mb-2 mt-1">
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
      </Section>

      <Section id="color" title="③ 색상 설정" summary={colorSummary} open={openId === 'color'} onToggle={toggle}>
        <div className="mt-1">
          <ColorSettings />
        </div>
      </Section>

      {/* ④ 기관 위치 — 모달로 분리(좌측 패널 간결화) */}
      <button
        type="button"
        onClick={() => setInstOpen(true)}
        className="flex items-center justify-between gap-2 px-3 py-2.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-left"
      >
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-700">④ 기관 위치 표시 <span className="font-normal text-slate-400">(선택)</span></div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5">
            {institutions.length > 0 ? `${institutions.length}건 표시중 · 클릭하여 수정` : '주소·좌표로 기관 점 추가하기'}
          </div>
        </div>
        <span className="text-brand-500 text-lg flex-shrink-0">＋</span>
      </button>

      <InstitutionModal open={instOpen} onClose={() => setInstOpen(false)} />

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
