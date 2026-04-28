import { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import { loadCodeTable } from '../hooks/useGeoData.js';
import { getTargetCodes } from '../utils/codeTable.js';

/**
 * 직접 입력 탭 - 현재 보기 모드의 지역 목록을 테이블로 표시, 값 입력
 */
export default function DirectInput() {
  const { viewMode, selectedSido, selectedSgg, values, updateValue, clearValues } =
    useStore();
  const [codeTable, setCodeTable] = useState(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    loadCodeTable().then(setCodeTable);
  }, []);

  if (!codeTable) {
    return <div className="p-3 text-xs text-slate-500">로딩 중...</div>;
  }

  const targets = getTargetCodes(codeTable, viewMode, selectedSido, selectedSgg);
  const filtered = filter
    ? targets.filter((t) =>
        t.name.includes(filter) || t.code.includes(filter)
      )
    : targets;

  if (targets.length === 0) {
    return (
      <div className="p-3 text-xs text-slate-500">
        지역을 먼저 선택하시오.
      </div>
    );
  }

  const filledCount = targets.filter((t) => values[t.code] !== undefined && values[t.code] !== '').length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>
          입력 {filledCount} / 전체 {targets.length}
        </span>
        <button
          onClick={clearValues}
          className="text-red-600 hover:underline"
        >
          전체 지우기
        </button>
      </div>
      <input
        type="text"
        placeholder="지역명 검색..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
      />
      <div className="max-h-[40vh] overflow-y-auto scroll-thin border border-slate-200 rounded">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-slate-100">
            <tr>
              <th className="text-left px-2 py-1 font-medium text-slate-700">지역명</th>
              <th className="text-right px-2 py-1 font-medium text-slate-700 w-20">값</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 500).map((t) => (
              <tr key={t.code} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-2 py-1 text-slate-700 truncate" title={t.name}>
                  {t.sgg_name && (
                    <span className="text-slate-400 mr-1">{t.sgg_name}</span>
                  )}
                  {t.name}
                </td>
                <td className="px-1 py-0.5">
                  <input
                    type="number"
                    step="any"
                    value={values[t.code] ?? ''}
                    onChange={(e) =>
                      updateValue(
                        t.code,
                        e.target.value === '' ? '' : Number(e.target.value)
                      )
                    }
                    className="w-full px-1 py-0.5 text-right border border-slate-200 rounded"
                  />
                </td>
              </tr>
            ))}
            {filtered.length > 500 && (
              <tr>
                <td colSpan={2} className="px-2 py-2 text-center text-slate-400">
                  ... 상위 500개만 표시 (검색 활용)
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
