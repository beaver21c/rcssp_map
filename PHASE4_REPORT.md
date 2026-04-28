# Phase 4 산출물 보고서 (M4 마일스톤)

## 1. 작업 개요
- 작업일: 2026-04-28
- 단계: 마감 기능 (PNG export · 반응형 · 단일 HTML · 에러처리)
- 결과: 일반 빌드 + 단일 HTML 빌드 + 임베디드 HTML 빌드 3종 동시 지원

## 2. 신규/갱신 산출물

### □ 신규 컴포넌트
| 파일 | 역할 |
|------|------|
| `components/ExportButton.jsx` | html2canvas 기반 PNG 다운로드 + 워터마크 자동 삽입 + 1x/2x/3x 해상도 선택 |
| `components/ErrorBoundary.jsx` | React 컴포넌트 트리 예외 포착 + 새로고침 안내 UI |
| `scripts/embed-data.mjs` | dist-single에 모든 데이터 인라인 → CORS-safe 단일 HTML 생성 |

### □ 갱신
| 파일 | 변경 |
|------|------|
| `App.jsx` | 모바일 패널 토글 / 헤더에 ExportButton 배치 / ErrorBoundary 2곳 적용 / `id="map-export-area"` 캡처 영역 지정 |
| `src/index.css` | 모바일·태블릿 미디어쿼리 (라벨 폰트 9px, 줌 컨트롤 위치) |
| `src/hooks/useGeoData.js` | `window.__EMBEDDED_DATA__` 우선 탐지 → 임베디드 모드 자동 전환 |
| `vite.config.js` | `SINGLE=1` 환경변수 분기 / vite-plugin-singlefile 통합 |
| `package.json` | scripts 추가 (`build:single`, `build:embedded`, `build:all`) + 의존성 (vite-plugin-singlefile, cross-env) |

## 3. 핵심 기능 명세

### □ PNG 내보내기 (ExportButton)
- 캡처 대상: `id="map-export-area"` (지도 + 범례 영역)
- 워터마크 자동 삽입: 데이터 출처·버전·기준일·변환일
- 해상도 선택: 1x / 2x(기본) / 3x
- 파일명 자동: `choropleth_{viewMode}_{region}_{YYYY-MM-DD}.png`
- 폰트 로딩 대기: `document.fonts.ready` Promise
- CORS 정책: `useCORS: true` 설정. OSM 타일 차단 시 흰배경 fallback

### □ 반응형 레이아웃
- 모바일(<768px): 패널 슬라이드 토글 (햄버거 버튼 + 오버레이)
- 데스크톱(≥768px): 320px 고정 패널
- 라벨 폰트 자동 축소 (모바일 9px / 데스크톱 10px)
- 헤더 가변 padding + 제목 자동 truncate

### □ 단일 HTML 빌드 (3종)
| 빌드 명령 | 출력 | 용도 | 크기 |
|---------|------|------|------|
| `npm run build` | `dist/` (HTML+JS+CSS+data 폴더) | GitHub Pages·정적 호스팅 | 약 2.9 MB |
| `npm run build:single` | `dist-single/index.html` (JS+CSS만 인라인) | 정적서버 + dist-single/data/ 동시 배치 | 1.01 MB |
| `npm run build:embedded` | `dist-single/index_embedded.html` (JS+CSS+data 모두 인라인) | **더블클릭 가능 단일 HTML** | 2.97 MB |
| `npm run build:all` | dist + dist-single 동시 빌드 | 모든 배포 시나리오 대응 | 합계 9.9 MB |

### □ 임베디드 HTML 동작 원리
- 빌드 시 `scripts/embed-data.mjs`가 dist-single/data/ 모든 JSON·TopoJSON 파일을 읽음
- HTML `<head>` 내부에 `window.__EMBEDDED_DATA__ = { "./data/sido.topojson": {...}, ... }` 주입
- `useGeoData.js`의 `fetchData()` 함수가 `window.__EMBEDDED_DATA__` 우선 탐지 → 매칭 시 fetch 우회
- 결과: `file://` 프로토콜에서도 CORS 차단 없이 정상 동작

### □ 에러 처리 강화
- ErrorBoundary 2곳 적용: ControlPanel · MapView 각각 격리
- 한 컴포넌트 예외가 전체 화면 다운 방지
- `cancelled` 플래그로 unmount 후 setState 방지 (race condition 회피)

## 4. M4 마일스톤 검수 결과

### □ 빌드 검증
- 일반 빌드: 4.46초 / 214 modules / JS 992KB(gzip 308KB)
- 단일 빌드: 4.54초 / index.html 1009KB
- 임베디드: 추가 + 1초 / index_embedded.html 2.97MB

### □ HTTP 서빙 검증
- `dist/` 정적 서빙 → 200 OK 모든 자원
- `dist-single/index.html` 200 OK (1011711 B)
- `dist-single/index_embedded.html` 200 OK (3112683 B)

### □ 임베디드 HTML 내부 데이터 검증
- `__EMBEDDED_DATA__` 키 정상 주입 (sido / sgg / emd / code_table / data_version 모두 포함)
- 21개 데이터 파일 인라인 (sido + sgg + emd 17개 + code_table + data_version)

### □ 키워드 sanity check (PASS 7/7)
- ✓ 'PNG 다운로드' / '패널 토글' / 'html2canvas' / 'ErrorBoundary'
- ✓ 'EMBEDDED_DATA' / 'scale' / 'vuski'

## 5. 배포 시나리오 매트릭스

| 시나리오 | 사용자 동작 | 환경 제약 | 사용 파일 |
|---------|----------|----------|----------|
| GitHub Pages | URL 클릭 | 인터넷 | dist/ → gh-pages |
| 사내 정적 서버 | URL 접속 | 사내망 | dist/ → IIS·nginx |
| ZIP 폴더 + 로컬 서버 | python -m http.server | Python 1회 | dist-single/ |
| **단일 HTML 더블클릭** | **파일 더블클릭** | **없음** | **index_embedded.html** |
| 메일 첨부 | 첨부파일 더블클릭 | 메일 용량 3MB | index_embedded.html |
| USB 휴대 | USB 더블클릭 | 없음 | index_embedded.html |

→ "**누구나 모든 환경**" 충족 시 → `index_embedded.html` 단일 파일 배포

## 6. 사용자 로컬 적용

### □ 모든 빌드 동시 실행
```bash
cd D:\drive\agent\지역사회보장계획_데이터\web
npm install        # 신규 의존성 (vite-plugin-singlefile, cross-env) 설치
npm run build:all  # dist/ + dist-single/ 동시 생성
```

### □ 더블클릭 테스트
- 파일 탐색기에서 `web\dist-single\index_embedded.html` 더블클릭
- 또는 브라우저 창에 드래그앤드롭

### □ 미리보기 (개발 서버)
```bash
npm run dev
# http://localhost:5173 자동 오픈
```

## 7. 알려진 제약 + 향후 개선

### □ 임베디드 HTML 제약
- 갱신 시 파일 재배포 필요 (URL 방식 대비 단점)
- 첫 로딩 약 0.5~1초 더 소요 (3MB 파일 파싱)
- 모바일에서 일부 구형 브라우저는 3MB+ 단일 HTML 파싱 시 느려짐

### □ PNG export 한계
- OSM 타일이 CORS 헤더 미설정 시 캡처 누락 가능 → 흰배경 출력
- 향후 개선: 타일 미사용 모드 토글 옵션

### □ 미구현 (v2 백로그)
- SVG export
- 다국어 (현재 한국어 단일)
- 다크 모드
- 데이터 갱신 자동 알림

## 8. 최종 산출물 위치
| 산출물 | 경로 |
|--------|------|
| 일반 빌드 | `web/dist/` |
| 단일 HTML | `web/dist-single/index.html` (+data 폴더) |
| **임베디드 HTML** | **`web/dist-single/index_embedded.html`** |
| Phase 1~4 보고서 | `web/PHASE{1,2,3,4}_REPORT.md` |
| 검증 체크리스트 | `web/PHASE2_VERIFY_CHECKLIST.md` |
