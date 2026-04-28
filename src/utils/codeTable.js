/**
 * 지역코드 매칭 유틸리티
 * - 통계청 8자리(adm_cd) 1차 키
 * - 행안부 10자리(adm_cd2) 2차 키
 * - 지역명 문자열 3차 fallback
 */

/**
 * 사용자 입력 코드 → 통계청 adm_cd 정규화
 * @param {string} input - 사용자 입력값
 * @param {object} codeTable - code_table.json
 * @returns {string|null} adm_cd 또는 null
 */
export function normalizeCode(input, codeTable) {
  if (!input) return null;
  const raw = String(input).trim();

  // 1차: 통계청 8자리 직접 매칭
  if (/^\d{8}$/.test(raw)) {
    return raw;
  }

  // 2차: 행안부 10자리 → adm_cd 역변환
  if (/^\d{10}$/.test(raw)) {
    for (const sgg_cd of Object.keys(codeTable.emd)) {
      const found = codeTable.emd[sgg_cd].find((e) => e.adm_cd2 === raw);
      if (found) return found.code;
    }
  }

  // 3차: 통계청/행안부 5자리 시군구
  if (/^\d{5}$/.test(raw)) {
    return raw; // sgg 모드에서 직접 사용
  }

  // 4차: 시도 2자리
  if (/^\d{2}$/.test(raw)) {
    return raw;
  }

  return null;
}

/**
 * 지역명 → adm_cd 매칭 (퍼지)
 * @param {string} name - "서울특별시 종로구 사직동" 또는 "사직동" 등
 * @param {object} codeTable
 * @returns {string|null}
 */
export function matchByName(name, codeTable) {
  if (!name) return null;
  const target = String(name).trim().replace(/\s+/g, '');

  // 읍면동 정확 매칭
  for (const sgg_cd of Object.keys(codeTable.emd)) {
    const found = codeTable.emd[sgg_cd].find(
      (e) => e.adm_nm.replace(/\s+/g, '') === target || e.name === target
    );
    if (found) return found.code;
  }

  // 시군구 매칭
  for (const sido_cd of Object.keys(codeTable.sgg)) {
    const found = codeTable.sgg[sido_cd].find((s) => s.name === target);
    if (found) return found.code;
  }

  // 시도 매칭
  const sido = codeTable.sido.find((s) => s.name === target);
  if (sido) return sido.code;

  return null;
}

/**
 * 보기 모드별 사용 대상 코드 목록 추출
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
    return (codeTable.emd[selectedSgg] || []).map((e) => ({
      code: e.code,
      name: e.name
    }));
  }
  return [];
}
