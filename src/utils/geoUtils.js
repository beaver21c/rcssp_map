/**
 * 점-다각형 포함 판정 유틸 (WGS84, 좌표는 [lng, lat])
 * 선택 지역(표시 폴리곤) 내부의 기관만 추리는 데 사용
 */

// 단일 고리(ring)에 대한 ray casting
function pointInRing(pt, ring) {
  let inside = false;
  const x = pt[0], y = pt[1];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// polygon = [outerRing, hole1, hole2, ...]
function pointInPolygon(pt, polygon) {
  if (!polygon || !polygon.length) return false;
  if (!pointInRing(pt, polygon[0])) return false;
  for (let k = 1; k < polygon.length; k++) {
    if (pointInRing(pt, polygon[k])) return false; // 구멍(hole) 내부면 제외
  }
  return true;
}

export function pointInFeature(pt, feature) {
  const g = feature?.geometry;
  if (!g) return false;
  if (g.type === 'Polygon') return pointInPolygon(pt, g.coordinates);
  if (g.type === 'MultiPolygon') return g.coordinates.some((poly) => pointInPolygon(pt, poly));
  return false;
}

export function pointInAnyFeature(pt, features) {
  for (const f of features) if (pointInFeature(pt, f)) return true;
  return false;
}

/**
 * 표시 중 폴리곤 내부에 있는 기관만 반환
 * @param {{name,lng,lat}[]} institutions
 * @param {object[]} features - 현재 화면 GeoJSON features
 */
export function filterInstitutions(institutions, features) {
  if (!institutions?.length || !features?.length) return [];
  return institutions.filter((it) =>
    Number.isFinite(it.lng) && Number.isFinite(it.lat) &&
    pointInAnyFeature([it.lng, it.lat], features)
  );
}
