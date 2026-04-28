import { create } from 'zustand';

const DEFAULTS = {
  viewMode: 'sgg',
  selectedSido: '',
  selectedSgg: '',
  values: {},
  paletteName: 'YlOrRd',
  classification: 'quantile',
  classCount: 5
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

  // 전역 리셋 - 모든 상태 초기값 복원
  resetAll: () => set({ ...DEFAULTS })
}));
