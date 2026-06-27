import { useState } from 'react';
import { useStore } from '../store.js';
import { downloadInstitutionTemplate, parseInstitutionExcel } from '../utils/excelTemplate.js';

export default function InstitutionUpload() {
  const { institutions, setInstitutions, clearInstitutions } = useStore();
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const onFile = async (e) => {
    setError(null); setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = await parseInstitutionExcel(file);
      setResult(r);
      setInstitutions(r.points);
    } catch (err) {
      console.error('[기관 엑셀] 파싱 실패:', err);
      setError(err.message || '파일 파싱 실패');
    } finally {
      e.target.value = '';
    }
  };

  const onReset = () => { setError(null); setResult(null); clearInstitutions(); };

  return (
    <div className="flex flex-col gap-3">
      <div className="p-2 text-[11px] bg-sky-50 text-sky-800 border border-sky-200 rounded leading-relaxed">
        좌표계: <b>WGS84 경위도(EPSG:4326)</b> 십진수 입력.<br />
        경도(X) 124~132 · 위도(Y) 33~39 범위. TM·미터 좌표 미지원.
      </div>

      <button
        onClick={downloadInstitutionTemplate}
        className="w-full px-3 py-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100"
      >
        ⬇ 기관 위치 양식 다운로드 (WGS84)
      </button>

      <label className="block w-full px-3 py-2 text-xs text-center border-2 border-dashed border-brand-500 bg-brand-50 text-brand-700 rounded cursor-pointer hover:bg-brand-100">
        ⬆ 기관 위치 엑셀 업로드 (.xlsx)
        <input type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
      </label>

      {error && (
        <div className="p-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded">
          <div className="font-medium mb-1">⚠ 오류</div>
          <div className="whitespace-pre-wrap break-words">{error}</div>
          <button
            onClick={onReset}
            className="mt-2 px-2 py-1 text-[11px] bg-white border border-red-300 rounded hover:bg-red-50"
          >
            기관 입력 초기화
          </button>
        </div>
      )}

      {result && (
        <div className="p-2 text-xs bg-slate-50 border border-slate-200 rounded">
          <div className="font-medium text-slate-700 mb-1">업로드 결과</div>
          <div className="text-slate-600 leading-relaxed">
            전체 행: {result.stats.totalRows}<br />
            유효 좌표: <span className="text-emerald-600 font-medium">{result.stats.okCount}</span><br />
            제외: <span className={result.stats.failedCount > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}>{result.stats.failedCount}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">※ 선택 지역 밖 기관은 지도에 표시되지 않음.</div>
          {result.failed.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-600">
                제외 상세 ({Math.min(result.failed.length, 10)}건 / 총 {result.failed.length}건)
              </summary>
              <ul className="mt-1 text-[11px] text-slate-600 list-disc list-inside max-h-24 overflow-y-auto">
                {result.failed.slice(0, 10).map((f, i) => (
                  <li key={i}>행 {f.row}: {f.name || '(무명)'} ({f.reason})</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {institutions.length > 0 && !result && (
        <div className="text-[11px] text-slate-500">현재 {institutions.length}건 업로드됨.</div>
      )}
    </div>
  );
}
