import { useStore } from '../store.js';
import { PALETTES, CLASSIFICATIONS } from '../hooks/useColorScale.js';

export default function ColorSettings() {
  const { paletteName, classification, classCount, setPalette, setClassification, setClassCount } =
    useStore();

  return (
    <div className="flex flex-col gap-3">
      {/* 팔레트 */}
      <div>
        <label className="text-xs font-medium text-slate-700 block mb-1">팔레트</label>
        <div className="grid grid-cols-1 gap-1">
          {Object.entries(PALETTES).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setPalette(key)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded border text-xs transition ${
                paletteName === key
                  ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-300'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex-1 flex h-4 rounded overflow-hidden">
                {p.colors.map((c, i) => (
                  <div key={i} style={{ backgroundColor: c }} className="flex-1" />
                ))}
              </div>
              <span className="text-slate-600 w-32 text-right">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 분류 방식 */}
      <div>
        <label className="text-xs font-medium text-slate-700 block mb-1">분류 방식</label>
        <div className="flex gap-1">
          {CLASSIFICATIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => setClassification(c.id)}
              className={`flex-1 px-2 py-1 text-xs rounded border transition ${
                classification === c.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 단계 수 */}
      <div>
        <label className="text-xs font-medium text-slate-700 block mb-1">구분 단계</label>
        <div className="flex gap-1">
          {[3, 4, 5, 6, 7].map((n) => (
            <button
              key={n}
              onClick={() => setClassCount(n)}
              className={`flex-1 px-2 py-1 text-sm rounded border transition ${
                classCount === n
                  ? 'border-brand-500 bg-brand-500 text-white font-bold'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
