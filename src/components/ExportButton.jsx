import { useState } from 'react';
import L from 'leaflet';
import { useStore } from '../store.js';
import { useColorScale } from '../hooks/useColorScale.js';
import { loadDataVersion, loadCodeTable } from '../hooks/useGeoData.js';
import { extractCode, extractName } from '../utils/mapStyles.js';
import { filterInstitutions } from '../utils/geoUtils.js';
import { _bm } from '../utils/_meta.js';

const MISSING_FILL = '#e2e8f0'; // 미입력 회색
const INST_COLOR = '#374151';   // 기관 ✕ 색

export default function ExportButton() {
  const {
    viewMode, selectedSido, selectedSgg, values,
    paletteName, classification, classCount,
    institutions, showInstLabels
  } = useStore();
  const { getColor, breaks, colors } = useColorScale(values, paletteName, classification, classCount);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(2);

  const fmt = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return '-';
    if (Math.abs(v) >= 1000) return v.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
    if (Math.abs(v) >= 10) return v.toFixed(1);
    return v.toFixed(2);
  };

  function roundRect(ctx, x, y, w, h, r) {
    if (typeof ctx.roundRect === 'function') { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function paintRings(ctx, rings, map, s, fillColor) {
    ctx.beginPath();
    for (const ring of rings) {
      for (let i = 0; i < ring.length; i++) {
        const [lng, lat] = ring[i];
        const p = map.latLngToContainerPoint(L.latLng(lat, lng));
        const x = p.x * s, y = p.y * s;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }
    ctx.fillStyle = fillColor;
    ctx.fill('evenodd');
    ctx.lineWidth = Math.max(0.5, 0.7 * s);
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }

  function drawFeature(ctx, feat, map, s) {
    const code = extractCode(feat.properties);
    const fill = getColor(values[code]) || MISSING_FILL;
    const geom = feat.geometry;
    if (!geom) return;
    if (geom.type === 'Polygon') {
      paintRings(ctx, geom.coordinates, map, s, fill);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) paintRings(ctx, poly, map, s, fill);
    }
  }

  function drawLabels(ctx, data, map, s) {
    ctx.font = `${Math.round(10 * s)}px "Noto Sans KR", "Malgun Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const feat of data.features) {
      try {
        const name = extractName(feat.properties);
        if (!name) continue;
        const c = L.geoJSON(feat).getBounds().getCenter();
        const p = map.latLngToContainerPoint(c);
        const x = p.x * s, y = p.y * s;
        ctx.lineWidth = Math.max(2, Math.round(3 * s));
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.strokeText(name, x, y);
        ctx.fillStyle = '#6b7280';
        ctx.fillText(name, x, y);
      } catch (e) { /* skip */ }
    }
  }

  // 기관 ✕ (+ 선택적 기관명) — 폴리곤과 동일 투영
  function drawInstitutions(ctx, valid, map, s, showLabels) {
    const xFont = `bold ${Math.round(13 * s)}px sans-serif`;
    const nFont = `${Math.round(10 * s)}px "Noto Sans KR", sans-serif`;
    for (const it of valid) {
      const p = map.latLngToContainerPoint(L.latLng(it.lat, it.lng));
      const x = p.x * s, y = p.y * s;
      ctx.font = xFont; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(2, Math.round(3 * s)); ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.strokeText('✕', x, y);
      ctx.fillStyle = INST_COLOR;
      ctx.fillText('✕', x, y);
      if (showLabels && it.name) {
        ctx.font = nFont; ctx.textBaseline = 'top';
        const ny = y + 8 * s;
        ctx.lineWidth = Math.max(2, Math.round(3 * s));
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.strokeText(it.name, x, ny);
        ctx.fillStyle = INST_COLOR;
        ctx.fillText(it.name, x, ny);
      }
    }
  }

  function drawTitleBox(ctx, s, regionLabel, modeLabel, todayStr) {
    const padX = 16 * s, padTop = 12 * s, padBot = 13 * s;
    const titleTxt = '지역사회보장계획 수립을 위한 GIS분석';
    const subTxt = `${regionLabel} · ${modeLabel} · ${todayStr}`;
    const fTitle = `bold ${Math.round(15 * s)}px "Noto Sans KR", sans-serif`;
    const fSub = `${Math.round(11 * s)}px "Noto Sans KR", sans-serif`;
    const fEgg = `300 ${Math.round(7 * s)}px "Noto Sans KR", sans-serif`;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = fTitle; const wTitle = ctx.measureText(titleTxt).width;
    ctx.font = fSub;   const wSub = ctx.measureText(subTxt).width;
    const boxW = Math.max(wTitle, wSub) + padX * 2;

    const eggH = 7 * s, gap1 = 3 * s, titleH = 15 * s * 1.35, gap2 = 4 * s, subH = 11 * s * 1.2;
    const boxH = padTop + eggH + gap1 + titleH + gap2 + subH + padBot;
    const bx = 12 * s, by = 12 * s;

    roundRect(ctx, bx, by, boxW, boxH, 6 * s);
    ctx.fillStyle = 'rgba(255,255,255,0.97)';
    ctx.fill();
    ctx.lineWidth = Math.max(1, s);
    ctx.strokeStyle = '#cbd5e1';
    ctx.stroke();

    let cy = by + padTop;
    ctx.font = fEgg; ctx.fillStyle = '#f9f9f9';
    ctx.fillText(_bm, bx + padX, cy); cy += eggH + gap1;
    ctx.font = fTitle; ctx.fillStyle = '#1e293b';
    ctx.fillText(titleTxt, bx + padX, cy); cy += titleH + gap2;
    ctx.font = fSub; ctx.fillStyle = '#475569';
    ctx.fillText(subTxt, bx + padX, cy);
  }

  function drawWatermark(ctx, s, W, H, ver) {
    const txt = ver
      ? `한국보건사회연구원 제공 · 데이터: vuski/admdongkor (${ver.source_version}) · 기준일 ${ver.admin_boundary_base}`
      : '한국보건사회연구원 제공 · 데이터: vuski/admdongkor';
    ctx.font = `${Math.round(10 * s)}px "Noto Sans KR", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const padX = 8 * s, padY = 3 * s;
    const w = ctx.measureText(txt).width + padX * 2;
    const h = 10 * s + padY * 2;
    const bx = 8 * s, by = H - 6 * s;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(bx, by - h, w, h);
    ctx.fillStyle = '#475569';
    ctx.fillText(txt, bx + padX, by - padY);
  }

  function drawLegend(ctx, s, W, H, hasInst) {
    const rows = [];
    if (breaks.length && colors.length) {
      colors.forEach((c, i) => rows.push({ kind: 'swatch', c, t: `${fmt(breaks[i])} ~ ${fmt(breaks[i + 1])}` }));
      rows.push({ kind: 'swatch', c: MISSING_FILL, t: '미입력', sep: true });
    }
    if (hasInst) rows.push({ kind: 'mark', t: '기관위치', sep: rows.length > 0 });
    if (!rows.length) return;

    const pad = 10 * s, sw = 20 * s, sh = 14 * s, rowGap = 3 * s, lineH = 16 * s;
    const fTitle = `bold ${Math.round(12 * s)}px "Noto Sans KR", sans-serif`;
    const fRow = `${Math.round(11 * s)}px "Noto Sans KR", sans-serif`;

    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = fRow;
    let maxTextW = 0;
    for (const r of rows) maxTextW = Math.max(maxTextW, ctx.measureText(r.t).width);
    const boxW = pad * 2 + sw + 8 * s + maxTextW;
    const headH = 14 * s + 6 * s;
    const boxH = pad * 2 + headH + rows.length * lineH;
    const bx = W - boxW - 12 * s, by = H - boxH - 12 * s;

    roundRect(ctx, bx, by, boxW, boxH, 6 * s);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.lineWidth = Math.max(1, s); ctx.strokeStyle = '#94a3b8'; ctx.stroke();

    ctx.font = fTitle; ctx.fillStyle = '#334155'; ctx.textBaseline = 'top';
    ctx.fillText('범례', bx + pad, by + pad);

    let ry = by + pad + headH;
    for (const r of rows) {
      const cy = ry + sh / 2;
      if (r.sep) {
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = Math.max(1, s);
        ctx.beginPath(); ctx.moveTo(bx + pad, ry - rowGap); ctx.lineTo(bx + boxW - pad, ry - rowGap); ctx.stroke();
      }
      if (r.kind === 'swatch') {
        ctx.fillStyle = r.c;
        ctx.fillRect(bx + pad, ry, sw, sh);
        ctx.lineWidth = Math.max(1, s); ctx.strokeStyle = '#94a3b8';
        ctx.strokeRect(bx + pad, ry, sw, sh);
      } else {
        ctx.fillStyle = INST_COLOR;
        ctx.font = `bold ${Math.round(13 * s)}px sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✕', bx + pad + sw / 2, cy);
        ctx.textAlign = 'left';
      }
      ctx.fillStyle = '#475569'; ctx.font = fRow; ctx.textBaseline = 'middle';
      ctx.fillText(r.t, bx + pad + sw + 8 * s, cy);
      ry += lineH;
    }
  }

  const onExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const map = window.__leafletMap;
      const data = window.__leafletData;
      if (!map || !data || !data.features?.length) {
        throw new Error('지도 데이터가 없음 (지역을 먼저 선택하시오)');
      }

      const filledCount = Object.values(values || {})
        .filter((v) => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v))).length;
      const instValid = filterInstitutions(institutions, data.features);
      if (filledCount === 0 && instValid.length === 0) {
        if (!confirm('입력된 값·표시할 기관이 없습니다. 빈 지도를 그대로 다운로드하시겠습니까?')) {
          setBusy(false);
          return;
        }
      }

      try {
        const b = L.geoJSON(data).getBounds();
        if (b.isValid()) {
          map.fitBounds(b, { padding: [50, 50], animate: false });
          map.invalidateSize();
          await new Promise((r) => setTimeout(r, 350));
        }
      } catch (e) { console.warn('[Export] fitBounds 실패:', e); }

      if (document.fonts && document.fonts.ready) {
        try { await document.fonts.ready; } catch (e) {}
      }

      const mapEl = map.getContainer();
      const cssW = mapEl.clientWidth, cssH = mapEl.clientHeight;
      const s = scale;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(cssW * s);
      canvas.height = Math.round(cssH * s);
      const ctx = canvas.getContext('2d');

      // 1) 흰 배경
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2) 폴리곤 (동일 투영)
      for (const feat of data.features) drawFeature(ctx, feat, map, s);

      // 3) 지역명 라벨 (동일 투영)
      drawLabels(ctx, data, map, s);

      // 4) 기관 ✕ (+ 선택 시 기관명) — 선택 지역 내부만, 동일 투영
      drawInstitutions(ctx, instValid, map, s, showInstLabels);

      // 5) 제목/범례/워터마크
      const ver = await loadDataVersion().catch(() => null);
      const ct = await loadCodeTable().catch(() => null);
      let regionLabel = '전국';
      if (selectedSgg && ct) {
        const sd = ct.sido.find((x) => x.code === selectedSido);
        if (selectedSgg.startsWith('CITY_')) {
          const city = (ct.merged_cities?.[selectedSido] || []).find((c) => c.virtual_code === selectedSgg);
          regionLabel = `${sd?.name || ''} ${city?.name || ''} (전체)`.trim();
        } else {
          const sg = (ct.sgg[selectedSido] || []).find((x) => x.code === selectedSgg);
          regionLabel = `${sd?.name || ''} ${sg?.name || ''}`.trim();
        }
      } else if (selectedSido && ct) {
        regionLabel = ct.sido.find((x) => x.code === selectedSido)?.name || '';
      }
      const modeLabel = { sgg: '시군구 비교', sido_emd: '읍면동 비교', sgg_emd: '읍면동 비교' }[viewMode];
      const todayStr = new Date().toISOString().slice(0, 10);

      drawTitleBox(ctx, s, regionLabel, modeLabel, todayStr);
      drawWatermark(ctx, s, canvas.width, canvas.height, ver);
      drawLegend(ctx, s, canvas.width, canvas.height, instValid.length > 0);

      const region = selectedSgg || selectedSido || 'all';
      const filename = `choropleth_${viewMode}_${region}_${todayStr}.png`;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      console.error('[ExportButton] PNG 생성 실패:', err);
      alert('PNG 생성 실패: ' + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
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
