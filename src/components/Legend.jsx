import { useStore } from '../store.js';
import { useColorScale } from '../hooks/useColorScale.js';

/**
 * 우측 하단 범례 컴포넌트
 * - 코로플레스 미선택(값 없음) 시에도 기관 업로드 시 범례 표시
 */
export default function Legend() {
  const { values, paletteName, classification, classCount, institutions } = useStore();
  const { breaks, colors } = useColorScale(values, paletteName, classification, classCount);

  const hasChoro = breaks.length > 0 && colors.length > 0;
  const hasInst = (institutions?.length || 0) > 0;

  if (!hasChoro && !hasInst) return null;

  const fmt = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '-';
    if (Math.abs(v) >= 1000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(2);
  };

  return (
    // max-h: 범례는 바닥에 붙어 위로 자라므로, 구분 단계를 많이 두면 지도가 낮을 때
    //        윗 구간부터 지도 밖으로 나가 보이지 않았음. 높이를 지도 안으로 제한하고 자체 스크롤을 줌
    <div className="absolute right-3 bottom-3 z-[600] bg-white border border-slate-400 rounded-md shadow-md px-3 py-2 text-xs max-h-[calc(100%-1.5rem)] overflow-y-auto scroll-thin">
      <div className="font-medium text-slate-700 mb-1.5">범례</div>
      <div className="flex flex-col gap-0.5">
        {hasChoro && colors.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-5 h-3.5 border border-slate-400"
              style={{ backgroundColor: c }}
            />
            <span className="text-slate-700">
              {fmt(breaks[i])} ~ {fmt(breaks[i + 1])}
            </span>
          </div>
        ))}
        {hasChoro && (
          <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-300">
            <div className="w-5 h-3.5 bg-slate-200 border border-slate-400" />
            <span className="text-slate-600">미입력</span>
          </div>
        )}
        {hasInst && (
          <div className={`flex items-center gap-2 ${hasChoro ? 'mt-1 pt-1 border-t border-slate-300' : ''}`}>
            <span className="w-5 text-center font-bold text-slate-700" style={{ fontSize: '13px', lineHeight: 1 }}>✕</span>
            <span className="text-slate-700">기관위치</span>
          </div>
        )}
      </div>
    </div>
  );
}
