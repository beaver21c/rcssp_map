import { useEffect, useState } from 'react';
import { loadDataVersion } from '../hooks/useGeoData.js';

/**
 * 푸터 - 제공기관·출처·기준일 표기
 */
export default function Footer() {
  const [ver, setVer] = useState(null);

  useEffect(() => {
    loadDataVersion().then(setVer).catch((e) => console.error(e));
  }, []);

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-1.5 text-[11px] text-slate-500 flex justify-between items-center flex-wrap gap-2">
      {/* 1024px 미만에서는 뒷문장을 짧은 문장으로 바꿈 — 각주가 여러 줄로 늘어나면 그만큼
          지도 높이를 잠식함(640px 기준으로 두면 768px에서 3줄 71px이 되어 효과가 없었음).
          접더라도 문장은 끝맺어야 하므로 짧은 쪽에도 서술어를 둠 */}
      <div className="min-w-0">
        <span className="text-slate-700 font-medium">본 서비스는 한국보건사회연구원에서 제공.</span>
        {' '}경계 데이터:{' '}
        <a
          href="https://github.com/vuski/admdongkor"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-700 hover:underline"
        >
          vuski/admdongkor
        </a>
        <span className="lg:hidden"> 활용.</span>
        <span className="hidden lg:inline">
          {' '}저장소가 공개·관리하는 행정동 경계 데이터를 활용함. 데이터 제공자께 감사를 표함.
        </span>
      </div>
      {ver && (
        <div className="text-slate-400">
          기준일 {ver.admin_boundary_base} · 변환 {ver.extracted_date}
        </div>
      )}
    </div>
  );
}
