import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useGeoData, loadCodeTable } from '../hooks/useGeoData.js';
import { useColorScale } from '../hooks/useColorScale.js';
import { baseStyle, hoverStyle, extractCode, extractName } from '../utils/mapStyles.js';
import { useStore } from '../store.js';
import Legend from './Legend.jsx';

function resolveDataUrl(viewMode, selectedSido) {
  if (viewMode === 'sgg') return './data/sgg.topojson';
  if (viewMode === 'sido_emd' && selectedSido) return `./data/emd/${selectedSido}.topojson`;
  if (viewMode === 'sgg_emd' && selectedSido) return `./data/emd/${selectedSido}.topojson`;
  return null;
}

function filterFeatures(features, viewMode, selectedSgg, mergedCity) {
  if (viewMode !== 'sgg_emd' || !selectedSgg) return features;
  // 일반구 통합 모드: CITY_xx_yyy 가상코드
  if (selectedSgg.startsWith('CITY_')) {
    if (!mergedCity) return features;
    const allowedSet = new Set(mergedCity.sgg_codes);
    return features.filter((f) => allowedSet.has(f.properties?.sgg_cd));
  }
  return features.filter((f) => f.properties?.sgg_cd === selectedSgg);
}

function FitBoundsOnData({ data, fitKey }) {
  const map = useMap();
  useEffect(() => {
    if (!data || !data.features?.length) return;
    try {
      const layer = L.geoJSON(data);
      const b = layer.getBounds();
      if (b.isValid()) map.fitBounds(b, { padding: [20, 20] });
    } catch (e) {
      console.error('[FitBounds] 실패:', e);
    }
  }, [data, fitKey, map]);
  return null;
}

function RegionLabels({ data, viewMode, fitKey }) {
  const map = useMap();
  useEffect(() => {
    if (!data) return;
    const labels = [];
    const minZoomForLabel = viewMode === 'sgg' ? 7 : 10;

    const checkAndAdd = () => {
      labels.forEach((l) => map.removeLayer(l));
      labels.length = 0;
      if (map.getZoom() < minZoomForLabel) return;

      const bounds = map.getBounds();
      for (const feat of data.features) {
        try {
          const layer = L.geoJSON(feat);
          const center = layer.getBounds().getCenter();
          if (!bounds.contains(center)) continue;
          const name = extractName(feat.properties);
          if (!name) continue;
          const lbl = L.marker(center, {
            icon: L.divIcon({
              className: 'region-label',
              html: name,
              iconSize: null
            }),
            interactive: false,
            keyboard: false
          });
          lbl.addTo(map);
          labels.push(lbl);
        } catch (e) {}
      }
    };

    checkAndAdd();
    map.on('zoomend moveend', checkAndAdd);
    return () => {
      map.off('zoomend moveend', checkAndAdd);
      labels.forEach((l) => map.removeLayer(l));
    };
  }, [data, viewMode, fitKey, map]);
  return null;
}

export default function MapView() {
  const {
    viewMode,
    selectedSido,
    selectedSgg,
    values,
    paletteName,
    classification,
    classCount
  } = useStore();
  const [codeTable, setCodeTable] = useState(null);

  useEffect(() => {
    loadCodeTable().then(setCodeTable).catch((e) => console.error(e));
  }, []);

  const url = useMemo(
    () => resolveDataUrl(viewMode, selectedSido),
    [viewMode, selectedSido]
  );
  const { data, loading, error } = useGeoData(url);

  // 일반구 통합 시 가상 city 객체
  const mergedCity = useMemo(() => {
    if (!selectedSgg.startsWith('CITY_') || !codeTable) return null;
    const list = codeTable.merged_cities?.[selectedSido] || [];
    return list.find((c) => c.virtual_code === selectedSgg) || null;
  }, [selectedSgg, selectedSido, codeTable]);

  const filtered = useMemo(() => {
    if (!data) return null;
    return {
      ...data,
      features: filterFeatures(data.features, viewMode, selectedSgg, mergedCity)
    };
  }, [data, viewMode, selectedSgg, mergedCity]);

  const { getColor } = useColorScale(values, paletteName, classification, classCount);

  const layerKey = `${viewMode}-${selectedSido}-${selectedSgg}`;
  const colorKey = `${Object.keys(values).length}-${paletteName}-${classification}-${classCount}`;

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[36.5, 127.5]}
        zoom={7}
        minZoom={6}
        maxZoom={14}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          opacity={0.35}
        />

        {filtered && filtered.features?.length > 0 && (
          <GeoJSON
            key={`${layerKey}-${colorKey}`}
            data={filtered}
            style={(f) => {
              const code = extractCode(f.properties);
              const fillColor = getColor(values[code]) || '#e2e8f0';
              return baseStyle(fillColor);
            }}
            onEachFeature={(feature, layer) => {
              const name = extractName(feature.properties);
              const code = extractCode(feature.properties);
              const v = values[code];
              const valStr = v !== undefined && v !== '' ? v : '미입력';

              layer.bindTooltip(
                `<div style="font-size:12px"><b>${name}</b><br/>코드: ${code}<br/>값: ${valStr}</div>`,
                { sticky: true, direction: 'top' }
              );

              layer.bindPopup(
                `<div style="font-size:13px;line-height:1.5">
                  <div style="font-weight:bold;font-size:14px;margin-bottom:4px">${name}</div>
                  <div style="color:#64748b">지역코드: ${code}</div>
                  <div style="color:#1e293b;margin-top:4px">값: <b>${valStr}</b></div>
                </div>`
              );

              const baseFill = getColor(v) || '#e2e8f0';
              layer.on({
                mouseover: (e) => e.target.setStyle(hoverStyle(baseFill)),
                mouseout: (e) => e.target.setStyle(baseStyle(baseFill))
              });
            }}
          />
        )}

        {filtered && <FitBoundsOnData data={filtered} fitKey={layerKey} />}
        {filtered && <RegionLabels data={filtered} viewMode={viewMode} fitKey={layerKey} />}
      </MapContainer>

      <Legend />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-[500] pointer-events-none">
          <div className="text-slate-700 text-sm">경계 데이터 로딩 중...</div>
        </div>
      )}
      {error && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded shadow z-[500]">
          데이터 로딩 실패: {error.message}
        </div>
      )}
      {!loading && !data && viewMode !== 'sgg' && !selectedSido && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 z-[500] pointer-events-none">
          <div className="text-slate-600 text-base">좌측에서 시도를 선택하시오</div>
        </div>
      )}
    </div>
  );
}
