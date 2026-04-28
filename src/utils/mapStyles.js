/**
 * Leaflet 폴리곤 스타일 함수
 */

const DEFAULT_FILL = '#e2e8f0'; // 미입력 지역 회색
const HOVER_WEIGHT = 2.5;

export function baseStyle(fillColor = DEFAULT_FILL) {
  return {
    fillColor,
    fillOpacity: 0.78,
    color: '#ffffff',
    weight: 0.7,
    opacity: 1
  };
}

export function hoverStyle(fillColor = DEFAULT_FILL) {
  return {
    fillColor,
    fillOpacity: 0.92,
    color: '#1f2937',
    weight: HOVER_WEIGHT,
    opacity: 1
  };
}

/**
 * 폴리곤 properties → 식별 코드 추출
 * sido_cd / sgg_cd / emd_cd 우선순위
 */
export function extractCode(props) {
  return props?.emd_cd || props?.sgg_cd || props?.sido_cd || null;
}

export function extractName(props) {
  return props?.emd_nm || props?.sggnm || props?.sidonm || '';
}
