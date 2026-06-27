/**
 * 주소 → 좌표(WGS84) 지오코딩 코어 (브라우저에서 직접 호출)
 *
 * 지원 엔진 2종 (사용자가 본인 키 입력):
 *  - 'vworld' : V-World 지오코더 (JSONP 호출 — script 태그로 CORS 우회), 도로명→지번 순 재시도
 *  - 'kakao'  : 카카오 로컬 REST API (fetch + Authorization 헤더)
 *
 * 라우팅(§ 가이드와 동일):
 *  - 둘 다 입력 → V-World 먼저, 실패한 행만 카카오로 폴백 (행 단위)
 *  - 하나만 입력 → 그 엔진 단독
 *  - 둘 다 미입력 → 실행 불가
 *
 * 카카오는 x=경도, y=위도 / V-World는 point.x=경도, point.y=위도 → {lng, lat}로 정규화.
 */

const KOREA_BOUNDS = { lngMin: 124, lngMax: 132, latMin: 33, latMax: 39 };

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/* ===================== 엔진 A: 카카오 REST ===================== */

/**
 * 카카오 로컬 REST API로 단일 주소 지오코딩.
 * @returns {Promise<{status, lat?, lng?, formatted?, error?}>}
 */
export async function geocodeKakaoREST(address, restKey, timeoutMs = 5000) {
  if (!address || !address.trim()) return { status: 'EMPTY_QUERY' };
  if (!restKey || !restKey.trim()) return { status: 'NO_KEY' };

  const url =
    'https://dapi.kakao.com/v2/local/search/address.json' +
    '?query=' + encodeURIComponent(address.trim()) +
    '&analyze_type=similar';

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { Authorization: 'KakaoAK ' + restKey.trim() },
      signal: ctrl.signal
    });
    if (!resp.ok) return { status: 'HTTP_' + resp.status }; // 401 키오류 / 403 권한 등
    const data = await resp.json();
    const docs = data.documents || [];
    if (docs.length === 0) return { status: 'ZERO_RESULTS' };

    const d = docs[0];
    const lng = parseFloat(d.x);
    const lat = parseFloat(d.y);
    if (Number.isNaN(lng) || Number.isNaN(lat)) return { status: 'COORD_PARSE_ERROR' };

    const road = d.road_address ? d.road_address.address_name : '';
    const jibun = d.address ? d.address.address_name : '';
    return { status: 'OK', lat, lng, formatted: road || jibun || d.address_name || '' };
  } catch (e) {
    const aborted = e && e.name === 'AbortError';
    return { status: aborted ? 'TIMEOUT' : 'FETCH_FAILED', error: String(e) };
  } finally {
    clearTimeout(t);
  }
}

/* ===================== 엔진 B: V-World (JSONP) ===================== */

/**
 * V-World 지오코더 단일 호출 (JSONP). <script> 태그라 동일출처정책 영향을 받지 않음.
 * @param {'road'|'parcel'} type
 */
function geocodeVworldOnce(address, key, type, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const cb = 'vw_cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    let done = false;
    const script = document.createElement('script');

    function cleanup() {
      clearTimeout(timer);
      try { delete window[cb]; } catch (_) { window[cb] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    const timer = setTimeout(() => {
      if (done) return;
      done = true; cleanup(); resolve({ status: 'TIMEOUT' });
    }, timeoutMs);

    window[cb] = (data) => {
      if (done) return;
      done = true; cleanup();
      const r = data && data.response;
      if (r && r.status === 'OK' && r.result && r.result.point) {
        resolve({
          status: 'OK',
          lng: parseFloat(r.result.point.x),
          lat: parseFloat(r.result.point.y),
          formatted: r.result.refined ? r.result.refined.text : ''
        });
      } else {
        resolve({ status: (r && r.status) || 'NO_RESULT' });
      }
    };

    const url =
      'https://api.vworld.kr/req/address' +
      '?service=address&request=getcoord&version=2.0&crs=epsg:4326' +
      '&type=' + type +
      '&address=' + encodeURIComponent(address) +
      '&format=json&key=' + encodeURIComponent(key) +
      '&callback=' + cb;

    script.src = url;
    script.onerror = () => {
      if (done) return;
      done = true; cleanup(); resolve({ status: 'SCRIPT_ERROR' });
    };
    document.body.appendChild(script);
  });
}

/**
 * V-World 지오코딩: 도로명(road) → 지번(parcel) 순으로 재시도.
 */
export async function geocodeVworld(address, key) {
  if (!address || !address.trim()) return { status: 'EMPTY_QUERY' };
  if (!key || !key.trim()) return { status: 'NO_KEY' };
  let last = { status: 'ZERO_RESULTS' };
  for (const type of ['road', 'parcel']) {
    const r = await geocodeVworldOnce(address.trim(), key.trim(), type);
    if (r.status === 'OK') return r;
    last = r;
  }
  return last;
}

/* ===================== 라우팅 ===================== */

/**
 * 입력된 키 조합으로 엔진 순서 결정.
 * @param {{vworldKey?:string, kakaoKey?:string}} keys
 * @returns {Array<'vworld'|'kakao'>}
 */
export function resolveEngineOrder(keys) {
  const hasV = !!(keys.vworldKey && keys.vworldKey.trim());
  const hasK = !!(keys.kakaoKey && keys.kakaoKey.trim());
  if (hasV && hasK) return ['vworld', 'kakao']; // V-World 우선, 카카오 폴백
  if (hasV) return ['vworld'];
  if (hasK) return ['kakao'];
  return [];
}

/** 단일 주소를 엔진 순서대로 시도(앞 엔진 실패 시 다음 엔진). */
async function geocodeOneRouted(address, keys, order) {
  let last = { status: 'NO_ENGINE' };
  for (const engine of order) {
    let r;
    if (engine === 'vworld') r = await geocodeVworld(address, keys.vworldKey);
    else if (engine === 'kakao') r = await geocodeKakaoREST(address, keys.kakaoKey);
    else continue;
    if (r.status === 'OK') return { ...r, engine };
    last = r;
  }
  return { ...last, engine: null };
}

/* ===================== 전체 실행 루프 ===================== */

/**
 * 행 배열 전체를 순차 지오코딩.
 * @param {Array<object>} rows
 * @param {string} nameCol  기관명 컬럼 키('' 가능)
 * @param {string} addrCol  주소 컬럼 키
 * @param {{vworldKey?:string, kakaoKey?:string, delayMs?:number}} keys
 * @param {(p:{done,total,okCount,failCount,name,status,engine})=>void} [onProgress]
 * @param {()=>boolean} [shouldStop]
 */
export async function geocodeAll(rows, nameCol, addrCol, keys, onProgress, shouldStop) {
  const order = resolveEngineOrder(keys);
  if (order.length === 0) throw new Error('API 키를 하나 이상 입력하세요 (V-World 또는 카카오).');

  const delayMs = keys.delayMs ?? 50;
  const results = [];
  let okCount = 0;
  let failCount = 0;
  let outOfBounds = 0;

  for (let i = 0; i < rows.length; i++) {
    if (shouldStop && shouldStop()) break;
    const row = rows[i];
    const name = nameCol ? String(row[nameCol] ?? '').trim() : '';
    const addr = String(row[addrCol] ?? '').trim();

    let r;
    if (!addr) r = { status: 'EMPTY_QUERY', engine: null };
    else r = await geocodeOneRouted(addr, keys, order);

    let status = r.status;
    if (status === 'OK') {
      if (
        r.lng < KOREA_BOUNDS.lngMin || r.lng > KOREA_BOUNDS.lngMax ||
        r.lat < KOREA_BOUNDS.latMin || r.lat > KOREA_BOUNDS.latMax
      ) {
        status = 'OUT_OF_BOUNDS';
        outOfBounds++;
      }
    }

    if (status === 'OK') okCount++;
    else failCount++;

    results.push({
      row: i + 2, // 헤더 1행 가정 → 엑셀 실제 행번호
      name,
      addr,
      lat: status === 'OK' ? r.lat : null,
      lng: status === 'OK' ? r.lng : null,
      status,
      engine: r.engine || '',
      formatted: r.formatted ?? '',
      error: r.error
    });

    if (onProgress) {
      onProgress({ done: i + 1, total: rows.length, okCount, failCount, name, status, engine: r.engine || '' });
    }
    if (delayMs > 0 && i < rows.length - 1) await sleep(delayMs);
  }

  return { results, stats: { total: rows.length, okCount, failCount, outOfBounds } };
}

/** 엔진 코드 → 표시명 */
export function engineLabel(engine) {
  if (engine === 'vworld') return 'V-World';
  if (engine === 'kakao') return '카카오';
  return '';
}

/** 상태 코드 → 사용자용 한글 사유 */
export function statusLabel(status) {
  const map = {
    OK: '성공',
    EMPTY_QUERY: '주소 비어 있음',
    ZERO_RESULTS: '검색 결과 없음(주소 정제 필요)',
    NO_RESULT: '검색 결과 없음',
    NO_KEY: 'API 키 미입력',
    NO_ENGINE: '사용할 엔진 없음',
    COORD_PARSE_ERROR: '좌표 변환 오류',
    OUT_OF_BOUNDS: '좌표가 한국 범위 밖',
    TIMEOUT: '응답 지연(타임아웃)',
    FETCH_FAILED: '네트워크/CORS 차단(카카오)',
    SCRIPT_ERROR: 'V-World 호출 차단/오류',
    ERROR: '검색 오류',
    NOT_FOUND: '주소를 찾지 못함',
    HTTP_401: '카카오 키 오류(401)',
    HTTP_403: '권한/도메인 오류(403)',
    HTTP_429: '호출 한도 초과(429)'
  };
  return map[status] || status;
}
