import { useEffect, useRef } from 'react';
import { useStore } from '../store.js';

const STEPS = [
  { id: 1, label: '보기 모드·지역' },
  { id: 2, label: '데이터 입력' },
  { id: 3, label: '색상 설정' },
  { id: 4, label: '기관 위치 (선택)' },
  { id: 5, label: 'PNG 내보내기' }
];

export default function UsageGuide() {
  const { viewMode, selectedSido, selectedSgg, values, institutions } = useStore();
  const rowRef = useRef(null);
  const activeRef = useRef(null);

  // 현재 진행 단계 추정 (좌측 패널 ①~④ 흐름과 동일)
  let currentStep = 1;
  const regionPicked =
    viewMode === 'sgg' ||
    (viewMode === 'sido_emd' && selectedSido) ||
    (viewMode === 'sgg_emd' && selectedSido && selectedSgg);
  if (regionPicked) currentStep = 2;
  if (Object.keys(values).length > 0) currentStep = 3;
  if (institutions.length > 0) currentStep = 4;

  // 좁은 폭에서는 줄이 가로로 스크롤되므로, 현재 단계 칩이 화면 밖이면 그 칩만큼 가로로 당겨 온다.
  // (scrollIntoView 는 세로로도 움직여 페이지가 튀므로 쓰지 않음)
  useEffect(() => {
    const row = rowRef.current;
    const el = activeRef.current;
    if (!row || !el) return;
    const left = el.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < row.scrollLeft) row.scrollLeft = Math.max(0, left - 8);
    else if (right > row.scrollLeft + row.clientWidth) row.scrollLeft = right - row.clientWidth + 8;
  }, [currentStep]);

  return (
    <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs">
      {/* 좁은 폭에서는 줄바꿈 대신 가로 스크롤 — 줄바꿈으로 3~4줄이 되면 그만큼 지도 높이를 잠식함 */}
      <div
        ref={rowRef}
        tabIndex={0}
        role="group"
        aria-label="진행 단계"
        className="flex items-center gap-2 flex-nowrap overflow-x-auto scroll-thin md:flex-wrap md:overflow-x-visible"
      >
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            ref={currentStep === s.id ? activeRef : null}
            className="flex items-center gap-2 flex-shrink-0"
          >
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
