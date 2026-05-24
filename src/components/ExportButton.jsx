import { useState } from 'react';
import L from 'leaflet';
import html2canvas from 'html2canvas';
import { useStore } from '../store.js';
import { loadDataVersion, loadCodeTable } from '../hooks/useGeoData.js';
import { extractName } from '../utils/mapStyles.js';
import { _bm } from '../utils/_meta.js';

export default function ExportButton() {
  const { viewMode, selectedSido, selectedSgg, values } = useStore();
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(2);
  const [cleanMode, setCleanMode] = useState(true);

  /**
   * 폴리곤 중심점 라벨을 캡처된 canvas 위에 직접 그린다.
   * - html2canvas는 Leaflet marker-pane의 translate3d transform을 잘못 처리 → 라벨이 어긋남
   * - 따라서 라벨 DOM은 캡처에서 제외하고, Leaflet의 latLngToContainerPoint()로
   *   폴리곤과 동일한 투영을 사용해 캔버스에 직접 텍스트를 렌더 → 항상 정확히 일치
   */
  function drawLabelsOnCanvas(canvas, map, target, data, s) {
    if (!map || !data || !data.features?.length) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // map 컨테이너와 캡처 대상(target) 사이의 오프셋 보정
    const mapEl = map.getContainer();
    const tRect = target.getBoundingClientRect();
    const mRect = mapEl.getBoundingClientRect();
    const offX = mRect.left - tRect.left;
    const offY = mRect.top - tRect.top;
    const cw = mapEl.clientWidth;
    const ch = mapEl.clientHeight;

    const fontPx = Math.round(10 * s);
    ctx.font = `${fontPx}px "Noto Sans KR", "Malgun Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const feat of data.features) {
      try {
        const name = extractName(feat.properties);
        if (!name) continue;
        const center = L.geoJSON(feat).getBounds().getCenter();
        const p = map.latLngToContainerPoint(center);
        if (p.x < 0 || p.y < 0 || p.x > cw || p.y > ch) continue; // 화면 밖 제외
        const x = (p.x + offX) * s;
        const y = (p.y + offY) * s;
        // 흰색 외곽선(가독성) → 회색 본문
        ctx.lineWidth = Math.max(2, Math.round(3 * s));
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.strokeText(name, x, y);
        ctx.fillStyle = '#6b7280';
        ctx.fillText(name, x, y);
      } catch (e) { /* skip */ }
    }
  }

  const onExport = async () => {
    if (busy) return;
    setBusy(true);

    let watermark = null;
    let titleBar = null;
    let hidden = []; // { el, prev } 복원용

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

      const map = window.__leafletMap;
      const data = window.__leafletData;

      // 캡처 직전: fitBounds로 폴리곤 영역을 화면 가득
      if (map && data && data.features?.length) {
        try {
          const layer = L.geoJSON(data);
          const bounds = layer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [60, 60], animate: false });
            await new Promise((r) => setTimeout(r, 400));
          }
        } catch (e) {
          console.warn('[Export] fitBounds 실패:', e);
        }
      }

      // 클린 모드: 타일 배경 + 컨트롤(줌·attribution) 숨김 → 지도 외 영역 흰색
      if (cleanMode) {
        const tilePane = target.querySelector('.leaflet-tile-pane');
        if (tilePane) { hidden.push({ el: tilePane, prev: tilePane.style.display }); tilePane.style.display = 'none'; }
        const ctrl = target.querySelector('.leaflet-control-container');
        if (ctrl) { hidden.push({ el: ctrl, prev: ctrl.style.display }); ctrl.style.display = 'none'; }
      }

      // 라벨 DOM(marker-pane)은 캡처에서 제외 → 캡처 후 캔버스에 직접 렌더
      const markerPane = target.querySelector('.leaflet-marker-pane');
      if (markerPane) { hidden.push({ el: markerPane, prev: markerPane.style.display }); markerPane.style.display = 'none'; }

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
          position: absolute; top: 12px; left: 12px; z-index: 1000;
          background: rgba(255,255,255,0.97); padding: 12px 18px 14px 18px;
          border: 1px solid #cbd5e1; border-radius: 6px;
          font-family: 'Noto Sans KR', sans-serif; pointer-events: none;
          box-shadow: 0 1px 4px rgba(0,0,0,0.12);
        `;
        titleBar.innerHTML = `
          <div style="font-size:7px;color:#f9f9f9;margin:0 0 2px 0;line-height:1;letter-spacing:0.02em;font-weight:300">${_bm}</div>
          <div style="font-size:15px;font-weight:bold;color:#1e293b;margin:0;line-height:1.5">
            지역사회보장계획 수립을 위한 GIS분석
          </div>
          <div style="font-size:11px;color:#475569;margin-top:5px;line-height:1.4">
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

      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        backgroundColor: cleanMode ? '#ffffff' : null,
        logging: false
      });

      // 캡처된 캔버스 위에 라벨을 직접 투영 렌더 (폴리곤과 100% 정렬)
      drawLabelsOnCanvas(canvas, map, target, data, scale);

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
      hidden.forEach(({ el, prev }) => { el.style.display = prev || ''; });
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
