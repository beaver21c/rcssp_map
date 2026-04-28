/**
 * 지역코드 매칭 유틸리티
 * - 통계청 8자리(adm_cd) 1차 키
 * - 행안부 10자리(adm_cd2) 2차 키
 * - 지역명 문자열 3차 fallback
 * - 일반구 통합 (CITY_xx_yyy 가상 코드) 지원
 */

export function normalizeCode(input, codeTable) {
  if (!input) return null;
  const raw = String(input).trim();
  if (/^\d{8}$/.test(raw)) return raw;
  if (/^\d{10}$/.test(raw)) {
    for (const sgg_cd of Object.keys(codeTable.emd)) {
      const found = codeTable.emd[sgg_cd].find((e) => e.adm_cd2 === raw);
      if (found) return found.code;
    }
  }
  if (/^\d{5}$/.test(raw)) return raw;
  if (/^\d{2}$/.test(raw)) return raw;
  return null;
}

export function matchByName(name, codeTable) {
  if (!name) return null;
  const target = String(name).trim().replace(/\s+/g, '');
  for (const sgg_cd of Object.keys(codeTable.emd)) {
    const found = codeTable.emd[sgg_cd].find(
      (e) => e.adm_nm.replace(/\s+/g, '') === target || e.name === target
    );
    if (found) return found.code;
  }
  for (const sido_cd of Object.keys(codeTable.sgg)) {
    const found = codeTable.sgg[sido_cd].find((s) => s.name === target);
    if (found) return found.code;
  }
  const sido = codeTable.sido.find((s) => s.name === target);
  if (sido) return sido.code;
  return null;
}

/**
 * 가상 city 코드(CITY_xx_yyy) → sgg_codes 배열 반환
 */
function expandMergedCity(codeTable, sido_cd, virtualCode) {
  const list = codeTable.merged_cities?.[sido_cd] || [];
  const found = list.find((c) => c.virtual_code === virtualCode);
  return found ? found.sgg_codes : null;
}

/**
 * 보기 모드별 사용 대상 코드 목록 추출
 * - 일반구 통합 모드 (CITY_ prefix) 지원
 */
export function getTargetCodes(codeTable, viewMode, selectedSido, selectedSgg) {
  if (viewMode === 'sgg') {
    return Object.values(codeTable.sgg)
      .flat()
      .map((s) => ({ code: s.code, name: s.name }));
  }
  if (viewMode === 'sido_emd' && selectedSido) {
    const sggList = codeTable.sgg[selectedSido] || [];
    const result = [];
    for (const sgg of sggList) {
      for (const emd of codeTable.emd[sgg.code] || []) {
        result.push({ code: emd.code, name: emd.name, sgg_name: sgg.name });
      }
    }
    return result;
  }
  if (viewMode === 'sgg_emd' && selectedSgg) {
    // 일반구 통합 가상 코드
    if (selectedSgg.startsWith('CITY_')) {
      const sggCodes = expandMergedCity(codeTable, selectedSido, selectedSgg);
      if (!sggCodes) return [];
      const result = [];
      for (const sgg_cd of sggCodes) {
        const sggInfo = (codeTable.sgg[selectedSido] || []).find((s) => s.code === sgg_cd);
        for (const emd of codeTable.emd[sgg_cd] || []) {
          result.push({
            code: emd.code,
            name: emd.name,
            sgg_name: sggInfo?.name || ''
          });
        }
      }
      return result;
    }
    // 일반 시군구 단일
    return (codeTable.emd[selectedSgg] || []).map((e) => ({
      code: e.code,
      name: e.name
    }));
  }
  return [];
}
