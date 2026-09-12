/**
 * 일반구 → 시(기초자치단체) 경계 병합
 *
 * 전국 → 시군구 비교 모드는 통계청 코드 체계상 일반구를 따로 가진 255개 경계를 쓴다.
 * 그런데 지역사회보장계획은 기초자치단체(시·군·자치구)가 세우므로, 용인시처럼 일반구를
 * 둔 시는 시 하나로 보여야 담당자가 가진 자료(시 단위)와 눈금이 맞는다.
 *
 * topojson.merge는 같은 호(arc)를 공유하는 폴리곤을 하나로 녹여 주므로,
 * 구 사이의 경계선이 남지 않는 시 경계가 만들어진다.
 */
import * as topojson from 'topojson-client';

/**
 * 병합 결과 피처의 코드는 code_table.merged_cities의 가상 코드(CITY_31_용인시)를 쓴다.
 * 엑셀 양식·직접 입력·업로드 매칭이 모두 같은 코드를 쓰므로 값이 그대로 이어진다.
 *
 * @param {object} topo - TopoJSON 원본(호 정보가 있어야 병합 가능)
 * @param {string|null} objectKey - 사용할 objects 키(없으면 첫 번째)
 * @param {{byGu: Map<string, object>}} cityIndex - buildCityIndex(codeTable) 결과
 * @returns {{type:'FeatureCollection', features: object[]}}
 */
export function mergeGuGeometries(topo, objectKey, cityIndex) {
  const key = objectKey || Object.keys(topo.objects)[0];
  const geometries = topo.objects[key]?.geometries || [];
  const features = [];
  const groups = new Map(); // virtual_code → { city, list, at }

  for (const g of geometries) {
    const guCode = g.properties?.sgg_cd;
    const city = guCode ? cityIndex.byGu.get(guCode) : null;
    if (!city) {
      features.push(topojson.feature(topo, g));
      continue;
    }
    let grp = groups.get(city.virtual_code);
    if (!grp) {
      grp = { city, list: [], at: features.length };
      groups.set(city.virtual_code, grp);
      features.push(null); // 자리를 잡아 원래 순서를 지킨다
    }
    grp.list.push(g);
  }

  for (const { city, list, at } of groups.values()) {
    const geometry = topojson.merge(topo, list);
    features[at] = {
      type: 'Feature',
      geometry,
      properties: {
        sido_cd: city.sido_cd || list[0].properties?.sido_cd || '',
        sgg_cd: city.virtual_code,
        sidonm: list[0].properties?.sidonm || '',
        sggnm: city.name,
        merged_gu: list.map((g) => g.properties?.sgg_cd).filter(Boolean)
      }
    };
  }

  return { type: 'FeatureCollection', features: features.filter(Boolean) };
}
