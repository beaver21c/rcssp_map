import { useStore } from '../store.js';

/**
 * 전역 리셋 버튼 - 보기 모드·시도·시군구·입력값·색상 설정 모두 초기화
 */
export default function ResetButton() {
  const { resetAll, values, viewMode, selectedSido, selectedSgg } = useStore();

  const hasChanges =
    Object.keys(values).length > 0 ||
    viewMode !== 'sgg' ||
    selectedSido !== '' ||
    selectedSgg !== '';

  const onReset = () => {
    if (!hasChanges) {
      resetAll();
      return;
    }
    if (confirm('모든 입력값과 선택 상태를 초기화합니다. 진행하시겠습니까?')) {
      resetAll();
    }
  };

  return (
    <button
      onClick={onReset}
      className="px-2.5 py-1.5 text-xs bg-slate-100 text-slate-700 border border-slate-300 rounded hover:bg-slate-200"
      title="모든 입력 초기화"
    >
      ↺ 리셋
    </button>
  );
}
