# Phase 2 산출물 보고서 (M2 마일스톤)

## 1. 작업 개요
- 작업일: 2026-04-28
- 단계: 기본 지도 구축 (보기 모드 3종 + Leaflet 렌더링)
- 결과: Vite 빌드 성공 / HTTP 서빙 검증 통과

## 2. 산출물

### □ 프로젝트 루트 (`web/`)
| 파일 | 용도 |
|------|------|
| package.json | 의존성·스크립트 정의 (React 18, Vite 5, Leaflet 1.9, zustand 4) |
| vite.config.js | Vite 설정 (base='./' 정적 호스팅 호환) |
| tailwind.config.js | Tailwind + Noto Sans KR 폰트 |
| postcss.config.js | PostCSS pipeline |
| index.html | HTML 진입점 (Leaflet CSS CDN 로드) |
| README.md | 프로젝트 설명 + 출처 표기 + 실행 방법 |
| .gitignore | node_modules, dist 등 제외 |

### □ 소스 (`web/src/`)
| 파일 | 역할 |
|------|------|
| main.jsx | React 진입점 |
| App.jsx | 레이아웃 (헤더 / 좌측 패널 / 지도 / 사용 안내 / 푸터) |
| index.css | Tailwind + 라벨·스크롤바 커스텀 |
| store.js | zustand 전역 상태 (viewMode, selectedSido, values, palette 등) |
| hooks/useGeoData.js | TopoJSON 동적 로딩 + 캐싱 / code_table·data_version 로더 |
| utils/codeTable.js | 코드 정규화 + 지역명 매칭 + 보기모드별 대상 추출 |
| utils/mapStyles.js | Leaflet 폴리곤 스타일 함수 |
| components/MapView.jsx | Leaflet 지도 + GeoJSON 폴리곤 + fitBounds + 호버 툴팁 |
| components/ControlPanel.jsx | 보기 모드 라디오 + 시도/시군구 드롭다운 |
| components/UsageGuide.jsx | 하단 5단계 진행 인디케이터 |
| components/Footer.jsx | 데이터 출처 + 기준일 노출 |

### □ 정적 자원 (`web/public/`)
- `data/` — Phase 1 산출물 일체 (sido·sgg·emd 17개·code_table·data_version)
- `templates/` — 엑셀 양식 3종

### □ 빌드 산출물 (`web/dist/`)
- index.html (934 B)
- assets/index-*.js (310 KB)
- assets/index-*.css (10 KB)
- data/, templates/ 일체 복사
- 총합 약 2.8 MB

## 3. 핵심 동작 방식

### □ 보기 모드별 데이터 로딩
| 모드 | 로드 파일 | 필터링 |
|------|----------|--------|
| sgg (전국시군구) | data/sgg.topojson | 없음 (255개 표시) |
| sido_emd (시도→읍면동) | data/emd/{시도코드}.topojson | 없음 (시도 전체 emd) |
| sgg_emd (시군구→읍면동) | data/emd/{시도코드}.topojson | sgg_cd 일치 emd만 |

### □ 캐싱
- useGeoData hook 내부 `Map` 캐시 → 동일 URL 재요청 시 즉시 반환
- 시도 전환 후 복귀 시 재다운로드 없음

### □ fitBounds 자동 줌
- 데이터 로드 시 GeoJSON layer.getBounds() 계산 → map.fitBounds()
- 모드/시도/시군구 변경 시마다 자동 줌

### □ 호버 인터랙션
- 마우스 오버 → 폴리곤 강조 (border 2.5px, fillOpacity 0.92)
- 툴팁 표시: 지역명 + 코드

## 4. M2 마일스톤 검수 결과

### □ 빌드 검증
- vite build 성공 (2.49초)
- 106 modules transformed
- gzip JS 96 KB / CSS 2.77 KB → 초기 로딩 3초 이내 충족 가능

### □ HTTP 서빙 검증 (Python http.server)
| 자원 | HTTP | 크기 |
|------|------|------|
| / (index.html) | 200 | 934 B |
| /assets/index-*.js | 200 | 310 KB |
| /data/sido.topojson | 200 | 153 KB |
| /data/sgg.topojson | 200 | 303 KB |
| /data/emd/11.topojson | 200 | 115 KB |
| /data/code_table.json | 200 | 396 KB |
| /data/data_version.json | 200 | 675 B |

### □ 데이터 무결성
- TopoJSON 파싱 정상: type=Topology, objects=['emd_base'], features=17
- JS 번들 첫 바이트 정상 IIFE 패턴

### □ 미충족 항목 (Phase 3 이관)
- 직접 입력 / 엑셀 업로드 UI (placeholder만 배치)
- 색상 매핑 / 분류 / 단계 선택 (placeholder만 배치)
- 지역명 라벨 오버레이 (스타일은 정의됨, 적용 미구현)
- 범례 컴포넌트
- 클릭 팝업

## 5. 실행 방법 (사용자 환경)

### □ 개발 서버
```bash
cd D:\drive\agent\지역사회보장계획_데이터\web
npm install
npm run dev
# → http://localhost:5173 자동 오픈
```

### □ 빌드 결과 미리보기
```bash
cd web
npm run preview
# → http://localhost:4173
```

### □ 빌드 결과 직접 서빙 (Python)
```bash
cd web/dist
python -m http.server 8000
# → http://localhost:8000
```

## 6. 다음 단계 (Phase 3 진입)
- 직접 입력 패널 (`DirectInput.jsx`)
- 엑셀 업로드 + SheetJS 파싱 (`ExcelUpload.jsx`)
- chroma.js 색상 스케일 + 분류 알고리즘 3종 (`useColorScale.js`)
- 지역명 라벨 오버레이 (`RegionLabels.jsx`)
- 범례 (`Legend.jsx`)
- 클릭 팝업

## 7. 알려진 제약
- 사용자 마운트 디렉토리에서 Node 바이너리 직접 실행 불가 (Bus error)
- 본 빌드는 /tmp 환경에서 수행 → dist/ 만 사용자 폴더 복사
- 사용자 로컬 Windows 환경에서는 정상 실행 가능 (Node.js 설치 시)
