import { useState } from 'react';
import html2canvas from 'html2canvas';
import { useStore } from '../store.js';
import { loadDataVersion, loadCodeTable } from '../hooks/useGeoData.js';

/**
 * PNG 내보내기 버튼
 * - 클린 모드: OSM 타일 제거 + 폴리곤+범례+제목+워터마크만 출력
 * - leaflet pane transform → top/left 변환 (html2canvas 좌표 어긋남 회피)
 */
export default function ExportButton() {
  const { viewMode, selectedSido, selectedSgg, values } = useStore();
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(2);
  const [cleanMode, setCleanMode] = useState(true);

  /**
   * leaflet의 모든 pane은 transform: translate3d(...)로 위치 결정.
   * html2canvas가 이를 누적 처리할 때 좌표 어긋남 → 라벨이 화면 밖으로 분리.
   * 해결: 캡처 직전 transform → left/top CSS로 변환, 캡처 후 원상복구.
   */
  function unfreezeLeafletTransforms(rootEl) {
    const restored = [];
    const panes = rootEl.querySelectorAll('.leaflet-pane, .leaflet-marker-icon, .leaflet-tooltip, .leaflet-popup');
    panes.forEach((el) => {
      const cs = window.getComputedStyle(el);
      const transform = cs.transform;
      if (!transform || transform === 'none') return;
      const m = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
      if (!m) return;
      const v = m[1].split(',').map((x) => parseFloat(x));
      let tx = 0, ty = 0;
      if (v.length === 6) {
        tx = v[4]; ty = v[5];
      } else if (v.length === 16) {
        tx = v[12]; ty = v[13];
      } else return;
      restored.push({
        el,
        oldTransform: el.style.transform,
        oldLeft: el.style.left,
        oldTop: el.style.top
      });
      el.style.transform = 'none';
      el.style.left = (parseFloat(el.style.left) || 0) + tx + 'px';
      el.style.top = (parseFloat(el.style.top) || 0) + ty + 'px';
    });
    return restored;
  }

  function restoreLeafletTransforms(restored) {
    restored.forEach(({ el, oldTransform, oldLeft, oldTop }) => {
      el.style.transform = oldTransform;
      el.style.left = oldLeft;
      el.style.top = oldTop;
    });
  }

  const onExport = async () => {
    if (busy) return;
    setBusy(true);

    let watermark = null;
    let titleBar = null;
    let hiddenTiles = [];
    let restoredTransforms = [];

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

      // 클린 모드: OSM 타일 일시 숨김
      if (cleanMode) {
        const tilePane = target.querySelector('.leaflet-tile-pane');
        if (tilePane) {
          hiddenTiles.push({ el: tilePane, prev: tilePane.style.display });
          tilePane.style.display = 'none';
        }
      }

      // 메타 정보 + 제목 박스
      const ver = await loadDataVersion().catch(() => null);
      const ct = await loadCodeTable().catch(() => null);
      let regionLabel = '전국';
      if (selectedSgg && ct) {
        const sd = ct.sido.find((s) => s.code === selectedSido);
        const sg = (ct.sgg[selectedSido] || []).find((s) => s.code === selectedSgg);
        regionLabel = `${sd?.name || ''} ${sg?.name || ''}`.trim();
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
          background: rgba(255,255,255,0.95); padding: 8px 12px;
          border: 1px solid #cbd5e1; border-radius: 4px;
          font-family: 'Noto Sans KR', sans-serif; pointer-events: none;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        `;
        titleBar.innerHTML = `
          <div style="font-size:13px;font-weight:bold;color:#1e293b;margin-bottom:2px">
            지역사회보장계획 수립을 위한 GIS분석
          </div>
          <div style="font-size:11px;color:#475569">
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

      // 핵심 수정: leaflet transform 변환
      restoredTransforms = unfreezeLeafletTransforms(target);

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
      // transform 원상복구 (가장 먼저)
      if (restoredTransforms.length > 0) restoreLeafletTransforms(restoredTransforms);
      // 임시 DOM 제거
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
