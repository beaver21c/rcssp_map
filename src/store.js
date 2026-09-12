import { create } from 'zustand';

const DEFAULTS = {
  viewMode: 'sgg',
  // 전국 → 시군구 비교에서 일반구를 시(기초자치단체)로 묶을지.
  // 지역사회보장계획 수립 단위가 기초자치단체이므로 기본값은 통합(229개)이다.
  mergeGu: true,
  selectedSido: '',
  selectedSgg: '',
  values: {},
  paletteName: 'YlOrRd',
  classification: 'quantile',
  classCount: 5,
  institutions: [],      // [{ name, lng, lat, addr?, source? }] — WGS84 경위도 (addr/source는 지오코딩 결과용 선택 필드)
  showInstLabels: false  // 기관명 라벨 표시 (기본 숨김)
};

export const useStore = create((set) => ({
  ...DEFAULTS,

  setViewMode: (mode) => set({
    viewMode: mode,
    selectedSido: '',
    selectedSgg: '',
    values: {}
  }),
  // 기준이 바뀌면 코드 체계가 달라지므로 입력값을 비운다(잘못 남은 값이 지도에 칠해지는 것 방지)
  setMergeGu: (b) => set({ mergeGu: !!b, values: {} }),
  setSelectedSido: (cd) => set({ selectedSido: cd, selectedSgg: '' }),
  setSelectedSgg: (cd) => set({ selectedSgg: cd }),

  setValues: (v) => set({ values: v }),
  updateValue: (code, val) => set((s) => ({ values: { ...s.values, [code]: val } })),
  clearValues: () => set({ values: {} }),

  setPalette: (name) => set({ paletteName: name }),
  setClassification: (c) => set({ classification: c }),
  setClassCount: (n) => set({ classCount: n }),

  // 기관 위치
  setInstitutions: (arr) => set({ institutions: arr }),
  clearInstitutions: () => set({ institutions: [] }),
  setShowInstLabels: (b) => set({ showInstLabels: b }),

  // 전역 리셋 - 모든 상태 초기값 복원
  resetAll: () => set({ ...DEFAULTS })
}));
