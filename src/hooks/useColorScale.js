import { useMemo } from 'react';
import chroma from 'chroma-js';
import * as ss from 'simple-statistics';

/**
 * 색상 팔레트 프리셋 (chroma.js scale 키)
 * Viridis 색각이상 친화 / Spectral·RdYlGn 발산형 / Blues·Greens 단색 / YlOrRd 따뜻한 강조
 */
export const PALETTES = {
  YlOrRd:   { label: 'YlOrRd (강조형)',   colors: ['#ffffcc','#ffeda0','#fed976','#feb24c','#fd8d3c','#fc4e2a','#e31a1c','#bd0026'] },
  Blues:    { label: 'Blues (단색)',     colors: ['#f7fbff','#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#08519c'] },
  Greens:   { label: 'Greens (단색)',    colors: ['#f7fcf5','#e5f5e0','#c7e9c0','#a1d99b','#74c476','#41ab5d','#238b45','#005a32'] },
  RdYlGn:   { label: 'RdYlGn (발산)',    colors: ['#a50026','#d73027','#f46d43','#fdae61','#fee08b','#d9ef8b','#a6d96a','#66bd63','#1a9850','#006837'] },
  Spectral: { label: 'Spectral (발산)',  colors: ['#9e0142','#d53e4f','#f46d43','#fdae61','#fee08b','#e6f598','#abdda4','#66c2a5','#3288bd','#5e4fa2'] },
  Viridis:  { label: 'Viridis (색각이상)', colors: ['#440154','#482878','#3e4a89','#31688e','#26828e','#1f9e89','#35b779','#6dcd59','#b5de2b','#fde725'] }
};

export const CLASSIFICATIONS = [
  { id: 'equal',    label: '등간격(Equal)' },
  { id: 'quantile', label: '분위수(Quantile)' },
  { id: 'jenks',    label: '자연단절(Jenks)' }
];

/**
 * 분류 경계값 산출
 * @param {number[]} values - 입력 숫자 배열
 * @param {string} method - 'equal' | 'quantile' | 'jenks'
 * @param {number} n - 단계 수 3~7
 * @returns {number[]} 경계값 (n+1개)
 */
function calculateBreaks(values, method, n) {
  if (!values.length) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  if (min === max) return Array(n + 1).fill(min);

  if (method === 'equal') {
    const step = (max - min) / n;
    return Array.from({ length: n + 1 }, (_, i) => min + step * i);
  }
  if (method === 'quantile') {
    const breaks = [min];
    for (let i = 1; i < n; i++) {
      breaks.push(ss.quantileSorted(sorted, i / n));
    }
    breaks.push(max);
    return breaks;
  }
  if (method === 'jenks') {
    try {
      return ss.ckmeans(sorted, n).map((cluster, i) =>
        i === 0 ? cluster[0] : cluster[0]
      ).concat([max]);
    } catch (e) {
      console.error('[Jenks] 실패, 분위수로 대체:', e);
      return calculateBreaks(values, 'quantile', n);
    }
  }
  return [];
}

/**
 * 색상 스케일 hook
 * @param {object} valuesMap - { 지역코드: 숫자값 }
 * @param {string} paletteName - 팔레트 키
 * @param {string} classification - 'equal'|'quantile'|'jenks'
 * @param {number} classCount - 3~7
 */
export function useColorScale(valuesMap, paletteName, classification, classCount) {
  return useMemo(() => {
    const vals = Object.values(valuesMap || {})
      .map((v) => Number(v))
      .filter((v) => Number.isFinite(v));

    if (vals.length === 0) {
      return {
        getColor: () => null,
        breaks: [],
        colors: [],
        classCount
      };
    }

    const palette = PALETTES[paletteName] || PALETTES.YlOrRd;
    const colorScale = chroma.scale(palette.colors).colors(classCount);
    const breaks = calculateBreaks(vals, classification, classCount);

    const getColor = (value) => {
      const v = Number(value);
      if (!Number.isFinite(v)) return null;
      // breaks의 i번째와 i+1번째 사이 → colorScale[i]
      for (let i = 0; i < classCount; i++) {
        if (v <= breaks[i + 1]) return colorScale[i];
      }
      return colorScale[classCount - 1];
    };

    return { getColor, breaks, colors: colorScale, classCount };
  }, [valuesMap, paletteName, classification, classCount]);
}
