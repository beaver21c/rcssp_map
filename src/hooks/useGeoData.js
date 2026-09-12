import { useEffect, useState } from 'react';
import * as topojson from 'topojson-client';

/**
 * 데이터 fetch 추상화 - 임베디드 모드(__EMBEDDED_DATA__) 우선
 */
function fetchData(url) {
  const embedded = typeof window !== 'undefined' && window.__EMBEDDED_DATA__;
  if (embedded && embedded[url]) {
    return Promise.resolve(embedded[url]);
  }
  return fetch(url).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
}

/**
 * TopoJSON 동적 로딩 + 캐싱 hook
 */
// url → { geo, topo, key }
// 원본 TopoJSON(topo)도 함께 들고 있는다. 일반구를 시 단위로 녹이려면(topojson.merge)
// 피처가 아니라 호(arc) 정보를 가진 원본이 필요하다.
const cache = new Map();

export function useGeoData(url, objectKey = null) {
  const [entry, setEntry] = useState(() => cache.get(url) || null);
  const [loading, setLoading] = useState(!cache.has(url));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;

    if (cache.has(url)) {
      setEntry(cache.get(url));
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchData(url)
      .then((topo) => {
        if (cancelled) return;
        const key = objectKey || Object.keys(topo.objects)[0];
        const geo = topojson.feature(topo, topo.objects[key]);
        const e = { geo, topo, key };
        cache.set(url, e);
        setEntry(e);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('[useGeoData] 로딩 실패:', url, e);
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url, objectKey]);

  return { data: entry?.geo || null, topo: entry?.topo || null, objectKey: entry?.key || null, loading, error };
}

let codeTablePromise = null;
export function loadCodeTable() {
  if (!codeTablePromise) {
    codeTablePromise = fetchData('./data/code_table.json');
  }
  return codeTablePromise;
}

let versionPromise = null;
export function loadDataVersion() {
  if (!versionPromise) {
    versionPromise = fetchData('./data/data_version.json');
  }
  return versionPromise;
}
