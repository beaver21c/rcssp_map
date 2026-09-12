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
  // 일반구를 둔 시 이름(용인시·창원시 등)은 가상 코드로 돌려준다. 개별 구 이름은
  // '용인시처인구'처럼 시 이름과 다르므로 아래 시군구 매칭과 부딪히지 않는다.
  const merged = codeTable.merged_cities || {};
  for (const sido_cd of Object.keys(merged)) {
    const city = (merged[sido_cd] || []).find((c) => c.name === target);
    if (city) return city.virtual_code;
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
 * merged_cities 색인
 * - byGu: 일반구 코드(5자리) → 그 구가 속한 시
 * - cities: 시 목록(시도 코드 포함)
 * 전국 모드에서 일반구를 시로 묶을 때, 업로드 값을 시 기준으로 옮길 때 함께 쓴다.
 */
export function buildCityIndex(codeTable) {
  const byGu = new Map();
  const cities = [];
  const merged = codeTable?.merged_cities || {};
  for (const sido_cd of Object.keys(merged)) {
    for (const c of merged[sido_cd] || []) {
      const city = { ...c, sido_cd };
      cities.push(city);
      for (const gu of c.sgg_codes || []) byGu.set(gu, city);
    }
  }
  return { byGu, cities };
}

/**
 * 보기 모드별 사용 대상 코드 목록 추출
 * - 일반구 통합 모드 (CITY_ prefix) 지원
 * - mergeGu=true면 전국 모드 목록을 기초자치단체 기준(229개)으로 돌려준다
 */
export function getTargetCodes(codeTable, viewMode, selectedSido, selectedSgg, mergeGu = false) {
  if (viewMode === 'sgg') {
    const all = Object.values(codeTable.sgg).flat();
    if (!mergeGu) return all.map((s) => ({ code: s.code, name: s.name }));
    const { byGu } = buildCityIndex(codeTable);
    const out = [];
    const seen = new Set();
    for (const s of all) {
      const city = byGu.get(s.code);
      if (!city) { out.push({ code: s.code, name: s.name }); continue; }
      if (seen.has(city.virtual_code)) continue;   // 같은 시의 나머지 구는 건너뜀
      seen.add(city.virtual_code);
      out.push({ code: city.virtual_code, name: city.name });
    }
    return out;
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
