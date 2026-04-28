import { useStore } from '../store.js';
import { useColorScale } from '../hooks/useColorScale.js';

/**
 * 우측 하단 범례 컴포넌트
 */
export default function Legend() {
  const { values, paletteName, classification, classCount } = useStore();
  const { breaks, colors } = useColorScale(values, paletteName, classification, classCount);

  if (!breaks.length || colors.length === 0) {
    return null;
  }

  const fmt = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '-';
    if (Math.abs(v) >= 1000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(2);
  };

  return (
    <div className="absolute right-3 bottom-3 z-[600] bg-white/95 backdrop-blur border border-slate-200 rounded-md shadow-md px-3 py-2 text-xs">
      <div className="font-medium text-slate-700 mb-1.5">범례</div>
      <div className="flex flex-col gap-0.5">
        {colors.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-5 h-3.5 border border-white/50"
              style={{ backgroundColor: c }}
            />
            <span className="text-slate-600">
              {fmt(breaks[i])} ~ {fmt(breaks[i + 1])}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-100">
          <div className="w-5 h-3.5 bg-slate-200 border border-white/50" />
          <span className="text-slate-500">미입력</span>
        </div>
      </div>
    </div>
  );
}
