import { useStore } from '../store.js';

const STEPS = [
  { id: 1, label: '지역 선택' },
  { id: 2, label: '엑셀 업로드 / 직접 입력' },
  { id: 3, label: '색상 팔레트 선택' },
  { id: 4, label: '구분 단계(3~7) 선택' },
  { id: 5, label: '지도 생성' }
];

export default function UsageGuide() {
  const { viewMode, selectedSido, selectedSgg, values } = useStore();

  // 현재 진행 단계 추정
  let currentStep = 1;
  const regionPicked =
    viewMode === 'sgg' ||
    (viewMode === 'sido_emd' && selectedSido) ||
    (viewMode === 'sgg_emd' && selectedSido && selectedSgg);
  if (regionPicked) currentStep = 2;
  if (Object.keys(values).length > 0) currentStep = 3;

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs">
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded ${
                currentStep > s.id
                  ? 'bg-emerald-100 text-emerald-700'
                  : currentStep === s.id
                  ? 'bg-brand-500 text-white font-semibold'
                  : 'bg-white text-slate-400'
              }`}
            >
              <span>{currentStep > s.id ? '✓' : `${s.id}`}</span>
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <span className="text-slate-300">→</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
