/**
 * 카카오 주소검색 지오코딩 코어 (브라우저에서 직접 호출)
 *
 * 두 가지 방식 지원:
 *  - 'rest' : 카카오 로컬 REST API (dapi.kakao.com) — REST API 키, fetch + Authorization 헤더
 *  - 'sdk'  : 카카오 지도 JS SDK의 services.Geocoder — JavaScript 키 + 도메인 등록, CORS 우회
 *
 * 산출 좌표는 WGS84 경위도. 카카오는 x=경도, y=위도 → {lng, lat}로 정규화.
 * 결과 객체 형태는 기존 기관 위치 스토어({name, lng, lat})와 호환되도록 맞춤.
 */

const KOREA_BOUNDS = { lngMin: 124, lngMax: 132, latMin: 33, latMax: 39 };

export const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

/* ===================== 방식 A: REST API ===================== */

/**
 * 카카오 로컬 REST API로 단일 주소 지오코딩.
 * @param {string} address  검색 주소(도로명/지번 모두 가능)
 * @param {string} restKey  카카오 REST API 키
 * @param {number} timeoutMs 타임아웃(ms)
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
    if (!resp.ok) {
      // 401: 키 오류 / 403: 도메인 미등록 등
      return { status: 'HTTP_' + resp.status };
    }
    const data = await resp.json();
    const docs = data.documents || [];
    if (docs.length === 0) return { status: 'ZERO_RESULTS' };

    const d = docs[0];
    const lng = parseFloat(d.x); // 경도
    const lat = parseFloat(d.y); // 위도
    if (Number.isNaN(lng) || Number.isNaN(lat)) return { status: 'COORD_PARSE_ERROR' };

    const road = d.road_address ? d.road_address.address_name : '';
    const jibun = d.address ? d.address.address_name : '';
    return { status: 'OK', lat, lng, formatted: road || jibun || d.address_name || '' };
  } catch (e) {
    // CORS 차단·네트워크 오류·타임아웃(AbortError) 모두 여기로 옴
    const aborted = e && e.name === 'AbortError';
    return { status: aborted ? 'TIMEOUT' : 'FETCH_FAILED', error: String(e) };
  } finally {
    clearTimeout(t);
  }
}

/* ===================== 방식 B: JS SDK Geocoder ===================== */

let _sdkPromise = null;
let _sdkKey = null;

/**
 * 카카오 지도 JS SDK(services 라이브러리)를 1회 동적 로드.
 * 동일 키로 재호출 시 캐시. 다른 키로 호출하면 재로드 시도.
 * @param {string} jsKey 카카오 JavaScript 키
 * @returns {Promise<void>}
 */
export function loadKakaoSDK(jsKey) {
  if (!jsKey || !jsKey.trim()) return Promise.reject(new Error('NO_KEY'));
  const key = jsKey.trim();

  // 이미 로드되어 있고 같은 키면 재사용
  if (_sdkPromise && _sdkKey === key && window.kakao && window.kakao.maps) {
    return _sdkPromise;
  }
  // 키가 바뀌면 기존 스크립트 제거 후 재로드
  if (_sdkKey && _sdkKey !== key) {
    const old = document.getElementById('kakao-sdk-script');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    _sdkPromise = null;
    try { delete window.kakao; } catch (_) { /* noop */ }
  }

  _sdkKey = key;
  _sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'kakao-sdk-script';
    script.async = true;
    script.src =
      'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=' +
      encodeURIComponent(key);
    script.onload = () => {
      if (!window.kakao || !window.kakao.maps) {
        reject(new Error('SDK_LOAD_FAILED'));
        return;
      }
      window.kakao.maps.load(() => {
        if (window.kakao.maps.services) resolve();
        else reject(new Error('SERVICES_LIB_MISSING'));
      });
    };
    script.onerror = () => reject(new Error('SDK_SCRIPT_ERROR'));
    document.head.appendChild(script);
  });
  return _sdkPromise;
}

/**
 * JS SDK Geocoder로 단일 주소 지오코딩 (SDK 로드 완료 가정).
 * @param {string} address
 * @returns {Promise<{status, lat?, lng?, formatted?}>}
 */
export function geocodeKakaoSDK(address) {
  if (!address || !address.trim()) return Promise.resolve({ status: 'EMPTY_QUERY' });
  if (!window.kakao || !window.kakao.maps || !window.kakao.maps.services) {
    return Promise.resolve({ status: 'SDK_NOT_READY' });
  }
  const geocoder = new window.kakao.maps.services.Geocoder();
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve({ status: 'TIMEOUT' }); }
    }, 5000);
    geocoder.addressSearch(address.trim(), (result, status) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const S = window.kakao.maps.services.Status;
      if (status === S.OK && result && result.length) {
        const d = result[0];
        const lng = parseFloat(d.x);
        const lat = parseFloat(d.y);
        if (Number.isNaN(lng) || Number.isNaN(lat)) {
          resolve({ status: 'COORD_PARSE_ERROR' });
          return;
        }
        const road = d.road_address ? d.road_address.address_name : '';
        const formatted = road || d.address_name || '';
        resolve({ status: 'OK', lat, lng, formatted });
      } else if (status === S.ZERO_RESULT) {
        resolve({ status: 'ZERO_RESULTS' });
      } else {
        resolve({ status: 'ERROR' });
      }
    });
  });
}

/* ===================== 단일 주소 라우팅 ===================== */

/**
 * 선택된 방식으로 단일 주소 지오코딩.
 * @param {string} address
 * @param {{method:'rest'|'sdk', key:string}} opts
 */
export async function geocodeOne(address, opts) {
  if (opts.method === 'sdk') return geocodeKakaoSDK(address);
  return geocodeKakaoREST(address, opts.key);
}

/* ===================== 전체 실행 루프 ===================== */

/**
 * 행 배열 전체를 순차 지오코딩.
 * @param {Array<object>} rows       원본 행 배열
 * @param {string} nameCol           기관명 컬럼 키('' 가능)
 * @param {string} addrCol           주소 컬럼 키
 * @param {{method:'rest'|'sdk', key:string, delayMs?:number}} opts
 * @param {(done:number, total:number)=>void} [onProgress]
 * @param {()=>boolean} [shouldStop] true 반환 시 중단
 * @returns {Promise<{results:Array, stats:object}>}
 */
export async function geocodeAll(rows, nameCol, addrCol, opts, onProgress, shouldStop) {
  if (opts.method === 'sdk') {
    await loadKakaoSDK(opts.key); // 시작 전 SDK 준비(실패 시 throw)
  }
  const delayMs = opts.delayMs ?? 50;
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
    if (!addr) r = { status: 'EMPTY_QUERY' };
    else r = await geocodeOne(addr, opts);

    let status = r.status;
    // 좌표가 한국 범위를 벗어나면 실패 처리(드물지만 방어)
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
      formatted: r.formatted ?? '',
      error: r.error
    });

    if (onProgress) onProgress({ done: i + 1, total: rows.length, okCount, failCount, name, status });
    if (delayMs > 0 && i < rows.length - 1) await sleep(delayMs);
  }

  return {
    results,
    stats: { total: rows.length, okCount, failCount, outOfBounds }
  };
}

/** 상태 코드 → 사용자용 한글 사유 */
export function statusLabel(status) {
  const map = {
    OK: '성공',
    EMPTY_QUERY: '주소 비어 있음',
    ZERO_RESULTS: '검색 결과 없음(주소 정제 필요)',
    NO_KEY: 'API 키 미입력',
    COORD_PARSE_ERROR: '좌표 변환 오류',
    OUT_OF_BOUNDS: '좌표가 한국 범위 밖',
    TIMEOUT: '응답 지연(타임아웃)',
    SDK_NOT_READY: 'SDK 미준비',
    FETCH_FAILED: '네트워크/CORS 차단',
    ERROR: '검색 오류',
    HTTP_401: '키 오류(401) — REST 키 확인',
    HTTP_403: '도메인 미등록/권한(403)',
    HTTP_429: '호출 한도 초과(429)'
  };
  return map[status] || status;
}
