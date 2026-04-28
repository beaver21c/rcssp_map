import { useState } from 'react';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { useStore } from '../store.js';
import { loadDataVersion, loadCodeTable } from '../hooks/useGeoData.js';
import { _bm } from '../utils/_meta.js';

export default function ExportButton() {
  const { viewMode, selectedSido, selectedSgg, values } = useStore();
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(2);
  const [cleanMode, setCleanMode] = useState(true);

  const onExport = async () => {
    if (busy) return;
    setBusy(true);

    let watermark = null;
    let titleBar = null;
    let hiddenTiles = [];

    try {
      const target = document.getElementById('map-export-area');
      if (!target) throw new Error('지도 영역을 찾지 못함');

      const filledCount = Object.values(values || {})
        .filter((v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)))
        .length;
      if (filledCount === 0) {
        if (!confirm('입력된 값이 없습니다. 빈 지도를 그대로 다운로드하시겠습니까?')) {
          setBusy(false);
          return;
        }
      }

      // 캡처 직전: 폴리곤 영역에 fitBounds → 화면 가득 채워 빈 공간 최소화
      const map = window.__leafletMap;
      const data = window.__leafletData;
      if (map && data && data.features?.length) {
        try {
          const layer = L.geoJSON(data);
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, {
              padding: [60, 60],
              animate: false
            });
            // 렌더링 안정화 대기
            await new Promise((r) => setTimeout(r, 350));
          }
        } catch (e) {
          console.warn('[Export] fitBounds 실패:', e);
        }
      }

      if (cleanMode) {
        const tilePane = target.querySelector('.leaflet-tile-pane');
        if (tilePane) {
          hiddenTiles.push({ el: tilePane, prev: tilePane.style.display });
          tilePane.style.display = 'none';
        }
      }

      const ver = await loadDataVersion().catch(() => null);
      const ct = await loadCodeTable().catch(() => null);
      let regionLabel = '전국';
      if (selectedSgg && ct) {
        const sd = ct.sido.find((s) => s.code === selectedSido);
        if (selectedSgg.startsWith('CITY_')) {
          const city = (ct.merged_cities?.[selectedSido] || []).find((c) => c.virtual_code === selectedSgg);
          regionLabel = `${sd?.name || ''} ${city?.name || ''} (전체)`.trim();
        } else {
          const sg = (ct.sgg[selectedSido] || []).find((s) => s.code === selectedSgg);
          regionLabel = `${sd?.name || ''} ${sg?.name || ''}`.trim();
        }
      } else if (selectedSido && ct) {
        const sd = ct.sido.find((s) => s.code === selectedSido);
        regionLabel = sd?.name || '';
      }
      const modeLabel = { sgg: '시군구 비교', sido_emd: '읍면동 비교', sgg_emd: '읍면동 비교' }[viewMode];
      const todayStr = new Date().toISOString().slice(0, 10);

      if (cleanMode) {
        titleBar = document.createElement('div');
        titleBar.id = '__export_title__';
        titleBar.style.cssText = `
          position: absolute; top: 8px; left: 8px; z-index: 1000;
          background: rgba(255,255,255,0.95); padding: 2px 10px 5px 10px;
          border: 1px solid #cbd5e1; border-radius: 4px;
          font-family: 'Noto Sans KR', sans-serif; pointer-events: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          line-height: 1.2;
        `;
        titleBar.innerHTML = `
          <div style="font-size:7px;color:#f9f9f9;margin:0;padding:0;line-height:0.9;letter-spacing:0.02em;font-weight:300">${_bm}</div>
          <div style="font-size:13px;font-weight:bold;color:#1e293b;margin:0;padding:0;line-height:1.25">
            지역사회보장계획 수립을 위한 GIS분석
          </div>
          <div style="font-size:11px;color:#475569;margin:0;padding:0;line-height:1.2">
            ${regionLabel} · ${modeLabel} · ${todayStr}
          </div>
        `;
        target.appendChild(titleBar);
      }

      const wmText = ver
        ? `한국보건사회연구원 제공 · 데이터: vuski/admdongkor (${ver.source_version}) · 기준일 ${ver.admin_boundary_base}`
        : '한국보건사회연구원 제공 · 데이터: vuski/admdongkor';
      watermark = document.createElement('div');
      watermark.id = '__export_watermark__';
      watermark.style.cssText = `
        position: absolute; bottom: 6px; left: 8px; z-index: 1000;
        background: rgba(255,255,255,0.85); padding: 3px 8px;
        font-size: 10px; color: #475569; border-radius: 3px;
        font-family: 'Noto Sans KR', sans-serif; pointer-events: none;
      `;
      watermark.textContent = wmText;
      target.appendChild(watermark);

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      // 캡처: transform 변환·영역 자르기 모두 제거 → 화면 그대로 캡처
      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        backgroundColor: cleanMode ? '#ffffff' : null,
        logging: false
      });

      const region = selectedSgg || selectedSido || 'all';
      const filename = `choropleth_${viewMode}_${region}_${todayStr}.png`;

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('[ExportButton] PNG 생성 실패:', err);
      alert('PNG 생성 실패: ' + err.message);
    } finally {
      if (titleBar?.parentNode) titleBar.parentNode.removeChild(titleBar);
      if (watermark?.parentNode) watermark.parentNode.removeChild(watermark);
      hiddenTiles.forEach(({ el, prev }) => { el.style.display = prev || ''; });
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <label className="hidden sm:flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer" title="OSM 타일 배경 제거">
        <input
          type="checkbox"
          checked={cleanMode}
          onChange={(e) => setCleanMode(e.target.checked)}
          className="accent-emerald-600"
        />
        클린
      </label>
      <select
        value={scale}
        onChange={(e) => setScale(Number(e.target.value))}
        className="text-xs px-1.5 py-1 border border-slate-300 rounded bg-white"
        disabled={busy}
        title="해상도 배율"
      >
        <option value={1}>1x</option>
        <option value={2}>2x</option>
        <option value={3}>3x</option>
      </select>
      <button
        onClick={onExport}
        disabled={busy}
        className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? '생성 중...' : '⬇ PNG'}
      </button>
    </div>
  );
}
