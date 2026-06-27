import { create } from 'zustand';

const DEFAULTS = {
  viewMode: 'sgg',
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
