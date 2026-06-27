import { useRef, useState } from 'react';
import { useStore } from '../store.js';
import { downloadAddressTemplate, parseAddressExcel } from '../utils/excelTemplate.js';
import { geocodeAll, statusLabel, engineLabel } from '../utils/geocoder.js';
import * as XLSX from 'xlsx';

function formatDuration(ms) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '계산 중…';
  const s = Math.round(ms / 1000);
  if (s < 60) return `약 ${s}초`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs ? `약 ${m}분 ${rs}초` : `약 ${m}분`;
}

export default function GeocodeUpload() {
  const { setInstitutions } = useStore();

  const [vworldKey, setVworldKey] = useState('');
  const [kakaoKey, setKakaoKey] = useState('');
  const [parsed, setParsed] = useState(null);    // { rows, columns, detected, ... }
  const [nameCol, setNameCol] = useState('');
  const [addrCol, setAddrCol] = useState('');
  const [error, setError] = useState(null);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, okCount: 0, failCount: 0, name: '', etaMs: null });
  const [outcome, setOutcome] = useState(null);  // { results, stats }
  const stopRef = useRef(false);
  const startRef = useRef(0);

  // 입력된 키 조합에 따른 동작 안내
  const hasV = !!vworldKey.trim();
  const hasK = !!kakaoKey.trim();
  let routeMsg = '키를 1개 이상 입력하세요. (둘 중 하나만 입력해도 동작)';
  if (hasV && hasK) routeMsg = '두 키 모두 입력됨 → V-World로 먼저 시도하고, 실패한 행만 카카오로 재시도(폴백)합니다.';
  else if (hasV) routeMsg = 'V-World 단독으로 지오코딩합니다.';
  else if (hasK) routeMsg = '카카오 단독으로 지오코딩합니다.';

  const onFile = async (e) => {
    setError(null); setOutcome(null); setParsed(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const r = await parseAddressExcel(file);
      setParsed(r);
      setAddrCol(r.detected.addrCol || '');
      setNameCol(r.detected.nameCol || '');
      if (!r.detected.addrCol) {
        setError('주소 컬럼을 자동으로 찾지 못했습니다. 아래에서 직접 지정하세요.');
      }
    } catch (err) {
      console.error('[주소 엑셀] 파싱 실패:', err);
      setError(err.message || '파일 파싱 실패');
    } finally {
      e.target.value = '';
    }
  };

  const onRun = async () => {
    setError(null); setOutcome(null);
    if (!hasV && !hasK) { setError('V-World 또는 카카오 API 키를 하나 이상 입력하세요.'); return; }
    if (!parsed || !parsed.rows?.length) { setError('주소 엑셀을 먼저 업로드하세요.'); return; }
    if (!addrCol) { setError('주소 컬럼을 지정하세요.'); return; }

    setRunning(true);
    stopRef.current = false;
    startRef.current = Date.now();
    setProgress({ done: 0, total: parsed.rows.length, okCount: 0, failCount: 0, name: '', etaMs: null });
    try {
      const { results, stats } = await geocodeAll(
        parsed.rows,
        nameCol,
        addrCol,
        { vworldKey: vworldKey.trim(), kakaoKey: kakaoKey.trim() },
        (p) => {
          const elapsed = Date.now() - startRef.current;
          const etaMs = p.done > 0 ? Math.round((elapsed / p.done) * (p.total - p.done)) : null;
          setProgress({ ...p, etaMs });
        },
        () => stopRef.current
      );
      setOutcome({ results, stats });

      const points = results
        .filter((r) => r.status === 'OK')
        .map((r) => ({ name: r.name, lng: r.lng, lat: r.lat, addr: r.addr, source: r.engine }));
      setInstitutions(points);

      if (points.length === 0) {
        setError('지오코딩 성공 0건. 키/주소를 확인하세요. (아래 실패 목록·결과 다운로드 참고)');
      }
    } catch (err) {
      console.error('[지오코딩] 실행 실패:', err);
      setError('실행 실패: ' + String(err?.message || err));
    } finally {
      setRunning(false);
    }
  };

  const onStop = () => { stopRef.current = true; };

  // 결과를 "좌표 직접(WGS84)" 양식과 호환되는 형태로 다운로드.
  // → 오류 행을 수기로 고친 뒤 "좌표 직접" 탭에 그대로 업로드 가능.
  const onExport = () => {
    if (!outcome?.results?.length) return;
    const data = outcome.results.map((r) => ({
      '기관명': r.name,
      '경도(X, 동경)': r.lng ?? '',
      '위도(Y, 북위)': r.lat ?? '',
      '주소': r.addr,
      '상태': statusLabel(r.status),
      '출처': engineLabel(r.engine),
      '정제주소': r.formatted || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data, {
      header: ['기관명', '경도(X, 동경)', '위도(Y, 북위)', '주소', '상태', '출처', '정제주소']
    });
    ws['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 18 }, { wch: 10 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '입력양식'); // 좌표 직접 파서가 '입력양식' 시트 우선 인식
    XLSX.writeFile(wb, `geocoding_result_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const failed = outcome?.results?.filter((r) => r.status !== 'OK') || [];
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 지오코딩 API 안내 */}
      <div className="p-2 text-[11px] bg-amber-50 text-amber-900 border border-amber-200 rounded leading-relaxed">
        <b>지오코딩 API란?</b> 주소를 지도 좌표로 바꿔주는 서비스입니다.
        <b> V-World</b>(국토교통부)와 <b>카카오</b> 두 가지를 지원하며, <u>둘 중 하나만 입력해도 동작</u>합니다.
        둘 다 입력하면 <b>V-World로 먼저 찾고 실패한 주소만 카카오로 재시도</b>합니다.
        <details className="mt-1.5">
          <summary className="cursor-pointer text-amber-800 font-medium">⠿ API 키 발급 방법 (처음이세요?)</summary>
          <div className="mt-1 space-y-1.5 text-amber-900">
            <div>
              <b>① V-World 키</b>
              <ol className="ml-3 list-decimal">
                <li>
                  <a href="https://www.vworld.kr" target="_blank" rel="noreferrer" className="underline text-amber-800">vworld.kr</a> 로그인 → <b>오픈API → 인증키 발급</b>
                </li>
                <li>서비스 “좌표→주소(Geocoder)” 선택, <b>활용 도메인</b>에 현재 사이트 주소 등록</li>
                <li>발급된 인증키를 아래 “V-World 키”에 입력</li>
              </ol>
            </div>
            <div>
              <b>② 카카오 키</b>
              <ol className="ml-3 list-decimal">
                <li>
                  <a href="https://developers.kakao.com" target="_blank" rel="noreferrer" className="underline text-amber-800">developers.kakao.com</a> 로그인 → <b>내 애플리케이션 → 애플리케이션 추가</b>
                </li>
                <li>앱의 <b>앱 키 → REST API 키</b> 복사</li>
                <li>아래 “카카오 키”에 입력 (카카오맵/로컬 사용 설정 ON 확인)</li>
              </ol>
            </div>
            <div className="text-amber-800">
              ※ 입력한 키는 저장하지 않고 브라우저 메모리에만 둡니다(새로고침 시 사라짐).
            </div>
          </div>
        </details>
      </div>

      {/* 키 입력 2칸 */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium text-slate-600">V-World 인증키 <span className="font-normal text-slate-400">(선택)</span></label>
        <input
          type="password"
          value={vworldKey}
          onChange={(e) => setVworldKey(e.target.value)}
          placeholder="V-World 인증키 붙여넣기"
          autoComplete="off"
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded font-mono"
        />
        <label className="text-[11px] font-medium text-slate-600">카카오 REST API 키 <span className="font-normal text-slate-400">(선택)</span></label>
        <input
          type="password"
          value={kakaoKey}
          onChange={(e) => setKakaoKey(e.target.value)}
          placeholder="카카오 REST API 키 붙여넣기"
          autoComplete="off"
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded font-mono"
        />
        <p className={`text-[10px] ${(hasV || hasK) ? 'text-brand-600' : 'text-slate-500'}`}>
          {routeMsg}
        </p>
      </div>

      {/* 양식 + 업로드 */}
      <button
        onClick={downloadAddressTemplate}
        className="w-full px-3 py-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded hover:bg-emerald-100"
      >
        ⬇ 주소 입력 양식 다운로드 (기관명·주소)
      </button>

      <label className="block w-full px-3 py-2 text-xs text-center border-2 border-dashed border-brand-500 bg-brand-50 text-brand-700 rounded cursor-pointer hover:bg-brand-100">
        ⬆ 주소 엑셀 업로드 (.xlsx)
        <input type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
      </label>

      {/* 컬럼 매핑 */}
      {parsed && (
        <div className="p-2 text-[11px] bg-slate-50 border border-slate-200 rounded flex flex-col gap-1.5">
          <div className="text-slate-600">업로드: {parsed.totalRows}행 · 컬럼 {parsed.columns.length}개</div>
          <label className="flex items-center justify-between gap-2">
            <span className="text-slate-600">주소 컬럼</span>
            <select
              value={addrCol}
              onChange={(e) => setAddrCol(e.target.value)}
              className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white"
            >
              <option value="">— 선택 —</option>
              {parsed.columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between gap-2">
            <span className="text-slate-600">기관명 컬럼</span>
            <select
              value={nameCol}
              onChange={(e) => setNameCol(e.target.value)}
              className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white"
            >
              <option value="">(없음 — 점만 표시)</option>
              {parsed.columns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>
      )}

      {/* 실행 */}
      {!running ? (
        <button
          onClick={onRun}
          disabled={!parsed || !addrCol}
          className="w-full px-3 py-2 text-xs font-medium bg-brand-500 text-white rounded hover:bg-brand-600 disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          ▶ 지오코딩 실행 → 지도에 표시
        </button>
      ) : (
        <div className="flex flex-col gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded">
          <div className="h-2 w-full bg-slate-200 rounded overflow-hidden">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-700">
            <span className="font-medium">지오코딩 중… {progress.done} / {progress.total} ({pct}%)</span>
            <button onClick={onStop} className="px-2 py-0.5 border border-slate-300 rounded bg-white hover:bg-slate-100">중지</button>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-600">성공 {progress.okCount ?? 0}</span>
            <span className={progress.failCount > 0 ? 'text-red-600' : 'text-slate-400'}>실패 {progress.failCount ?? 0}</span>
            <span className="text-slate-500 ml-auto">남은 예상 {formatDuration(progress.etaMs)}</span>
          </div>
          {progress.name && (
            <div className="text-[10px] text-slate-400 truncate" title={progress.name}>
              처리 중: {progress.name}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded">
          <div className="font-medium mb-1">⚠ 오류</div>
          <div className="whitespace-pre-wrap break-words">{error}</div>
        </div>
      )}

      {/* 결과 요약 + 다운로드 */}
      {outcome && (
        <div className="p-2 text-xs bg-slate-50 border border-slate-200 rounded">
          <div className="font-medium text-slate-700 mb-1">지오코딩 결과</div>
          <div className="text-slate-600 leading-relaxed">
            전체: {outcome.stats.total}행<br />
            성공: <span className="text-emerald-600 font-medium">{outcome.stats.okCount}</span>
            {' · '}실패: <span className={outcome.stats.failCount > 0 ? 'text-red-600 font-medium' : 'text-slate-500'}>{outcome.stats.failCount}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">※ 선택 지역 밖 기관은 지도에 표시되지 않음.</div>

          {failed.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-red-600">
                실패 상세 ({Math.min(failed.length, 15)}건 / 총 {failed.length}건)
              </summary>
              <ul className="mt-1 text-[11px] text-slate-600 list-disc list-inside max-h-32 overflow-y-auto">
                {failed.slice(0, 15).map((f, i) => (
                  <li key={i}>행 {f.row}: {f.name || '(무명)'} — {statusLabel(f.status)}</li>
                ))}
              </ul>
            </details>
          )}

          <button
            onClick={onExport}
            className="mt-2 w-full px-2 py-1.5 text-[11px] bg-white border border-brand-300 text-brand-700 rounded hover:bg-brand-50 font-medium"
          >
            ⬇ 지오코딩 결과 파일 다운로드 (.xlsx)
          </button>
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            성공·실패 모두 포함. 실패 행의 좌표를 수기로 채운 뒤 <b>“좌표 직접(WGS84)” 탭에 그대로 업로드</b>하면 됩니다.
            (컬럼: 기관명 · 경도(X) · 위도(Y))
          </p>
        </div>
      )}
    </div>
  );
}
