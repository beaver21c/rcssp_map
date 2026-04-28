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
      <div>
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
        {' '}저장소가 공개·관리하는 행정동 경계 데이터를 활용함. 데이터 제공자께 감사를 표함.
      </div>
      {ver && (
        <div className="text-slate-400">
          기준일 {ver.admin_boundary_base} · 변환 {ver.extracted_date}
        </div>
      )}
    </div>
  );
}
