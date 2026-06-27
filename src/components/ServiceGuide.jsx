import { useEffect } from 'react';

/**
 * 전체 이용 가이드 모달.
 * 우측 상단 "이용 가이드" 버튼으로 열림. 처음 사용자를 위한 서비스 소개·기능설명·빠른시작·카카오 API 안내.
 */
export default function ServiceGuide({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/40 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 sticky top-0 bg-white rounded-t-lg">
          <h2 className="text-base font-bold text-slate-800">📖 전체 이용 가이드</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 text-slate-500 text-lg"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4 text-sm text-slate-700 leading-relaxed space-y-5">
          {/* 1. 서비스 소개 */}
          <section>
            <h3 className="font-bold text-slate-800 mb-1">이 서비스는?</h3>
            <p>
              <b>지역사회보장계획 수립을 위한 GIS 분석 도구</b>입니다.
              행정구역(시군구·읍면동)별 통계값을 <b>색 농담(코로플레스)</b>으로 지도에 칠하고,
              복지관·센터 등 <b>기관의 위치를 점으로</b> 함께 표시한 뒤,
              결과를 <b>PNG 이미지로 내보낼</b> 수 있습니다. 별도 설치 없이 브라우저에서 동작합니다.
            </p>
          </section>

          {/* 2. 빠른 시작 */}
          <section>
            <h3 className="font-bold text-slate-800 mb-1">처음이세요? 빠른 시작 3단계</h3>
            <ol className="list-decimal ml-5 space-y-1">
              <li><b>지역 선택</b> — 좌측 ① 보기 모드에서 전국/시도/시군구를 고릅니다.</li>
              <li><b>데이터 입력</b> — ② 에서 양식을 내려받아 값을 채워 업로드하거나 직접 입력합니다.</li>
              <li><b>지도 완성</b> — ③ 색상 설정으로 팔레트·구간을 정하면 지도가 칠해집니다. 우측 상단 <b>PNG 내보내기</b>로 저장.</li>
            </ol>
          </section>

          {/* 3. 버튼별 기능 */}
          <section>
            <h3 className="font-bold text-slate-800 mb-1">무엇을 누르면 무슨 기능?</h3>
            <ul className="space-y-1.5">
              <li><b>① 보기 모드</b> — 전국 시군구 비교 / 시도 선택 후 읍면동 / 시군구 선택 후 읍면동.</li>
              <li><b>② 데이터 입력</b> — <i>엑셀 업로드</i>(양식 다운로드 → 값 입력 → 업로드) 또는 <i>직접 입력</i>.</li>
              <li><b>③ 색상 설정</b> — 색 팔레트와 구간 분류(분위수 등)·단계 수(3~7)를 선택.</li>
              <li><b>④ 기관 위치 표시</b> — 두 가지 방식:
                <ul className="list-disc ml-5 mt-0.5">
                  <li><b>좌표 직접(WGS84)</b>: 경도·위도가 이미 있는 엑셀 업로드.</li>
                  <li><b>주소 지오코딩</b>: 주소만 있는 엑셀을 올리면 V-World·카카오 API로 좌표를 자동 변환해 표시.</li>
                </ul>
              </li>
              <li><b>리셋</b>(우측 상단) — 모든 입력을 초기화.</li>
              <li><b>PNG 내보내기</b>(우측 상단) — 현재 지도를 이미지 파일로 저장.</li>
            </ul>
          </section>

          {/* 4. 지오코딩 API 안내 */}
          <section className="bg-amber-50 border border-amber-200 rounded p-3">
            <h3 className="font-bold text-amber-900 mb-1">지오코딩 API가 뭔가요? (주소 지오코딩용)</h3>
            <p className="text-amber-900">
              “주소 지오코딩” 기능은 주소를 지도 좌표로 바꾸기 위해 <b>V-World</b>(국토교통부) 또는
              <b> 카카오</b> API 키를 사용합니다. <b>둘 중 하나만 입력해도 동작</b>하며, 둘 다 입력하면
              <b> V-World로 먼저 찾고 실패한 주소만 카카오로 재시도</b>합니다.
              좌표를 이미 가지고 있다면 키 없이 “좌표 직접” 방식을 쓰면 됩니다.
            </p>
            <ul className="list-disc ml-5 mt-1.5 space-y-0.5 text-amber-900">
              <li>
                <b>V-World 키</b>:{' '}
                <a href="https://www.vworld.kr" target="_blank" rel="noreferrer" className="underline">vworld.kr</a>{' '}
                로그인 → 오픈API → 인증키 발급(Geocoder 서비스 선택, 활용 도메인 등록)
              </li>
              <li>
                <b>카카오 키</b>:{' '}
                <a href="https://developers.kakao.com" target="_blank" rel="noreferrer" className="underline">developers.kakao.com</a>{' '}
                로그인 → 내 애플리케이션 추가 → 앱 키의 <b>REST API 키</b> 복사
              </li>
            </ul>
            <p className="text-amber-800 mt-1.5 text-[13px]">
              ※ 입력한 키는 저장하지 않고 브라우저 메모리에만 사용합니다(새로고침 시 사라짐).
              자세한 단계는 ④ “주소 지오코딩” 탭의 <b>API 키 발급 방법</b> 안내를 펼쳐 보세요.
            </p>
          </section>

          <p className="text-[12px] text-slate-400 pt-1 border-t border-slate-100">
            한국보건사회연구원 · 읍면동 단위 코로플레스 맵
          </p>
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm bg-brand-500 text-white rounded hover:bg-brand-600"
          >
            시작하기
          </button>
        </div>
      </div>
    </div>
  );
}
