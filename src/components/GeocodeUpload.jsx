import { useRef, useState } from 'react';
import { useStore } from '../store.js';
import { downloadAddressTemplate, parseAddressExcel } from '../utils/excelTemplate.js';
import { geocodeAll, statusLabel } from '../utils/geocoder.js';
import * as XLSX from 'xlsx';

const METHODS = [
  { id: 'rest', label: 'REST API 키', hint: 'dapi.kakao.com 직접 호출' },
  { id: 'sdk', label: 'JavaScript 키 (SDK)', hint: '도메인 등록 필요·CORS 안전' }
];

export default function GeocodeUpload() {
  const { setInstitutions } = useStore();

  const [method, setMethod] = useState('rest');
  const [apiKey, setApiKey] = useState('');
  const [parsed, setParsed] = useState(null);    // { rows, columns, detected, ... }
  const [nameCol, setNameCol] = useState('');
  const [addrCol, setAddrCol] = useState('');
  const [error, setError] = useState(null);

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [outcome, setOutcome] = useState(null);  // { results, stats }
  const stopRef = useRef(false);

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
    if (!apiKey.trim()) { setError('카카오 API 키를 입력하세요.'); return; }
    if (!parsed || !parsed.rows?.length) { setError('주소 엑셀을 먼저 업로드하세요.'); return; }
    if (!addrCol) { setError('주소 컬럼을 지정하세요.'); return; }

    setRunning(true);
    stopRef.current = false;
    setProgress({ done: 0, total: parsed.rows.length });
    try {
      const { results, stats } = await geocodeAll(
        parsed.rows,
        nameCol,
        addrCol,
        { method, key: apiKey.trim() },
        (done, total) => setProgress({ done, total }),
        () => stopRef.current
      );
      setOutcome({ results, stats });

      const points = results
        .filter((r) => r.status === 'OK')
        .map((r) => ({ name: r.name, lng: r.lng, lat: r.lat, addr: r.addr, source: 'kakao' }));
      setInstitutions(points);

      if (points.length === 0) {
        setError('지오코딩 성공 0건. 키/방식 또는 주소를 확인하세요. (아래 실패 목록 참고)');
      }
    } catch (err) {
      console.error('[지오코딩] 실행 실패:', err);
      // SDK 로드 실패(도메인 미등록 등)
      const msg = String(err?.message || err);
      if (method === 'sdk') {
        setError(
          'SDK 로드 실패: ' + msg + '\n→ JavaScript 키가 맞는지, 카카오 콘솔에 현재 도메인이 등록됐는지 확인하세요.'
        );
      } else {
        setError('실행 실패: ' + msg);
      }
    } finally {
      setRunning(false);
    }
  };

  const onStop = () => { stopRef.current = true; };

  const onExport = () => {
    if (!outcome?.results?.length) return;
    const data = outcome.results.map((r) => ({
      기관명: r.name,
      주소: r.addr,
      경도: r.lng ?? '',
      위도: r.lat ?? '',
      상태: statusLabel(r.status),
      정제주소: r.formatted || ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 24 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '지오코딩결과');
    XLSX.writeFile(wb, `geocoding_result_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const failed = outcome?.results?.filter((r) => r.status !== 'OK') || [];
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* 카카오 API 안내 */}
      <div className="p-2 text-[11px] bg-amber-50 text-amber-900 border border-amber-200 rounded leading-relaxed">
        <b>카카오 API 키란?</b> 주소를 지도 좌표로 바꿔주는 무료 서비스입니다.
        사용하려면 카카오 개발자 키가 필요합니다.
        <details className="mt-1.5">
          <summary className="cursor-pointer text-amber-800 font-medium">⠿ 키 발급 방법 (처음이세요?)</summary>
          <ol className="mt-1 ml-3 list-decimal space-y-0.5 text-amber-900">
            <li>
              <a href="https://developers.kakao.com" target="_blank" rel="noreferrer"
                 className="underline text-amber-800">developers.kakao.com</a> 접속 → 카카오 계정 로그인
            </li>
            <li>상단 <b>내 애플리케이션</b> → <b>애플리케이션 추가하기</b> (이름·회사 입력)</li>
            <li>생성된 앱 → <b>앱 키</b> 메뉴에서 키 복사
              <ul className="ml-3 list-disc">
                <li><b>REST API 키</b> → 아래 “REST API 키” 방식에 입력</li>
                <li><b>JavaScript 키</b> → 아래 “JavaScript 키(SDK)” 방식에 입력</li>
              </ul>
            </li>
            <li><b>JavaScript 키 사용 시에만</b>: 앱 → <b>플랫폼 → Web</b> 에
              현재 사이트 주소(도메인) 등록 필요</li>
            <li>카카오 콘솔 → <b>카카오맵</b> 또는 <b>로컬</b> 사용 설정(ON) 확인</li>
          </ol>
          <div className="mt-1 text-amber-800">
            ※ 입력한 키는 저장하지 않고 브라우저 메모리에만 둡니다(새로고침 시 사라짐).
          </div>
        </details>
      </div>

      {/* 방식 토글 */}
      <div>
        <div className="text-[11px] font-medium text-slate-600 mb-1">지오코딩 방식</div>
        <div className="flex gap-1">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`flex-1 px-2 py-1.5 text-[11px] rounded border transition ${
                method === m.id
                  ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-1">
          {method === 'rest'
            ? 'REST API 키를 입력하세요. (일부 환경에서 브라우저 직접호출이 차단되면 SDK 방식으로 전환)'
            : 'JavaScript 키를 입력하고, 카카오 콘솔에 현재 도메인을 등록해야 동작합니다.'}
        </p>
      </div>

      {/* 키 입력 */}
      <input
        type="password"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder={method === 'rest' ? '카카오 REST API 키 붙여넣기' : '카카오 JavaScript 키 붙여넣기'}
        autoComplete="off"
        className="w-full px-3 py-2 text-xs border border-slate-300 rounded font-mono"
      />

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
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full bg-slate-200 rounded overflow-hidden">
            <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>지오코딩 중… {progress.done} / {progress.total} ({pct}%)</span>
            <button onClick={onStop} className="px-2 py-0.5 border border-slate-300 rounded hover:bg-slate-50">중지</button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-2 text-xs bg-red-50 text-red-700 border border-red-200 rounded">
          <div className="font-medium mb-1">⚠ 오류</div>
          <div className="whitespace-pre-wrap break-words">{error}</div>
        </div>
      )}

      {/* 결과 요약 */}
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
            className="mt-2 w-full px-2 py-1.5 text-[11px] bg-white border border-slate-300 rounded hover:bg-slate-50"
          >
            ⬇ 결과 엑셀 내보내기 (좌표·상태 포함)
          </button>
        </div>
      )}
    </div>
  );
}
