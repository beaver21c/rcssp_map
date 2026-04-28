import { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import { loadCodeTable } from '../hooks/useGeoData.js';
import { downloadTemplate, parseExcel } from '../utils/excelTemplate.js';

export default function ExcelUpload() {
  const { viewMode, selectedSido, selectedSgg, setValues, clearValues } = useStore();
  const [codeTable, setCodeTable] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCodeTable().then(setCodeTable);
  }, []);

  if (!codeTable) return <div className="p-3 text-xs text-slate-500">로딩 중...</div>;

  const onFile = async (e) => {
    setError(null);
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = await parseExcel(file, codeTable);
      setResult(r);
      setValues(r.matched);
    } catch (err) {
      console.error('[Excel] 파싱 실패:', err);
      setError(err.message || '파일 파싱 실패');
    } finally {
      e.target.value = '';
    }
  };

  const onDownload = () => {
    try {
      downloadTemplate(codeTable, viewMode, selectedSido, selectedSgg);
    } catch (err) {
      setError(err.message);
    }
  };

  const onReset = () => {
    setError(null);
    setResult(null);
    clearValues();
  };

  const enabled =
    viewMode === 'sgg' ||
    (viewMode === 'sido_emd' && selectedSido) ||
    (viewMode === 'sgg_emd' && selectedSido && selectedSgg);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <button
          onClick={onDownload}
          disabled={!enabled}
          className="w-full px-3 py-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⬇ 엑셀 양식 다운로드
        </button>
        <p className="text-[11px] text-slate-500 mt-1">
          현재 보기 모드 기준. 입력양식 + 사용방법 시트 동봉
        </p>
      </div>

      <div>
        <label
          className={`block w-full px-3 py-2 text-xs text-center border-2 border-dashed rounded cursor-pointer transition ${
            enabled
              ? 'border-brand-500 bg-brand-50 text-brand-700 hover:bg-brand-100'
              : 'border-slate-300 bg-slate-50 text-slate-400 cursor-not-allowed'
          }`}
        >
          ⬆ 엑셀 파일 업로드 (.xlsx)
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={onFile}
            disabled={!enabled}
            className="hidden"
          />
        </label>
        <p className="text-[11px] text-slate-500 mt-1">
          첫 시트의 "지역코드" + "값" 컬럼 자동 탐지
        </p>
      </div>

      {error && (
        <div className="p-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded">
          <div className="font-medium mb-1">⚠ 오류</div>
          <div className="whitespace-pre-wrap break-words">{error}</div>
          <button
            onClick={onReset}
            className="mt-2 px-2 py-1 text-[11px] bg-white border border-red-300 rounded hover:bg-red-50"
          >
            입력값 초기화 후 재시도
          </button>
        </div>
      )}

      {result && (
        <div className="p-2 text-xs bg-slate-50 border border-slate-200 rounded">
          <div className="font-medium text-slate-700 mb-1">매칭 결과</div>
          <div className="text-slate-600 leading-relaxed">
            전체 행: {result.stats.totalRows}<br />
            매칭 성공: <span className="text-emerald-600 font-medium">{result.stats.matchedCount}</span><br />
            매칭 실패: <span className={result.stats.failedCount > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}>{result.stats.failedCount}</span>
            {result.stats.sheetName && result.stats.sheetName !== '입력양식' && (
              <div className="text-amber-700 mt-1">
                ⚠ "{result.stats.sheetName}" 시트 사용됨 (입력양식 미발견)
              </div>
            )}
          </div>
          {result.failed.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-600">
                실패 상세 ({Math.min(result.failed.length, 10)}건 / 총 {result.failed.length}건)
              </summary>
              <ul className="mt-1 text-[11px] text-slate-600 list-disc list-inside max-h-24 overflow-y-auto">
                {result.failed.slice(0, 10).map((f, i) => (
                  <li key={i}>행 {f.row}: {f.code} ({f.reason})</li>
                ))}
              </ul>
            </details>
          )}
          {result.stats.failedCount > result.stats.matchedCount && (
            <div className="mt-2 p-1.5 bg-amber-50 text-amber-700 rounded text-[11px]">
              ⚠ 매칭 실패율 50%↑. 보기 모드 또는 양식 파일을 재확인하시오.
            </div>
          )}
        </div>
      )}

      {!enabled && (
        <div className="text-xs text-slate-500">
          지역(보기 모드 + 시도/시군구)을 먼저 선택하시오.
        </div>
      )}
    </div>
  );
}
