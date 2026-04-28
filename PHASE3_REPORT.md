# Phase 3 산출물 보고서 (M3 마일스톤)

## 1. 작업 개요
- 작업일: 2026-04-28
- 단계: 코로플레스 핵심 기능 구현
- 결과: 빌드 211 modules / JS 787KB(gzip 258KB) / HTTP 서빙 검증 통과

## 2. 신규 산출물

### □ 컴포넌트 (`web/src/components/`)
| 파일 | 역할 |
|------|------|
| DirectInput.jsx | 직접 입력 UI · 검색·필터·실시간 색상 반영·전체지우기 |
| ExcelUpload.jsx | 엑셀 업로드 + 양식 다운로드 · 매칭 결과 미리보기·실패상세 |
| ColorSettings.jsx | 팔레트 6종 · 분류 3종 · 단계 3~7 선택 UI |
| Legend.jsx | 우측 하단 범례 (색상 블록 + 값 범위 + 미입력 표시) |

### □ 훅·유틸 (`web/src/hooks/`, `web/src/utils/`)
| 파일 | 역할 |
|------|------|
| hooks/useColorScale.js | chroma.js 색상 스케일 + 분류 알고리즘(equal·quantile·jenks) + getColor 함수 |
| utils/excelTemplate.js | downloadTemplate(보기모드별 xlsx 생성) + parseExcel(SheetJS 파싱·매칭) |

### □ 갱신
| 파일 | 변경 내용 |
|------|---------|
| MapView.jsx | 색상 매핑 적용 / RegionLabels 라벨 오버레이 / 클릭 팝업 / Legend 통합 |
| ControlPanel.jsx | 탭 전환(엑셀↔직접) + ColorSettings 통합 |

## 3. 핵심 기능 명세

### □ 색상 매핑 알고리즘
- **팔레트 6종**: YlOrRd / Blues / Greens / RdYlGn / Spectral / Viridis(색각이상 친화)
- **분류 3종**
  - 등간격(equal): (max-min)/n 균등 분할
  - 분위수(quantile): simple-statistics quantileSorted 사용
  - 자연단절(jenks): simple-statistics ckmeans 1차원 K-means 활용
- **단계 3~7**: 라디오 버튼 선택. 디폴트 5단계 분위수
- **chroma.js scale**: 팔레트 색상 배열 → n단계 보간

### □ 엑셀 매칭 알고리즘 (3단계 fallback)
- 1차: 통계청 8자리(adm_cd) 직접 매칭
- 2차: 행안부 10자리(adm_cd2) → adm_cd 역인덱스 변환
- 3차: 매칭 실패 → failed 배열에 사유 누적
- 컬럼 자동 탐지: "지역코드/코드/adm_cd" + "값/value/수치" 정규식

### □ 지역명 라벨 (소형 회색 텍스트)
- Leaflet `L.divIcon` + `region-label` CSS 클래스
- 폰트: 10px / 색상 #6b7280 / 흰색 text-shadow 4방향
- 줌 레벨 임계값: sgg 모드 7 / emd 모드 10
- viewport 기반 동적 추가/제거 (성능 최적화)

### □ 클릭 팝업
- 지역명(굵게) + 지역코드 + 값
- 마우스 호버 → 폴리곤 강조 + 툴팁
- 클릭 → 영구 팝업

### □ 직접 입력 UI
- 보기 모드별 대상 지역 자동 추출 (getTargetCodes)
- 지역명 검색 필터
- 입력 진행 카운터 (입력N / 전체M)
- 상위 500개 표시 제한 (성능)
- 값 변경 시 실시간 색상 갱신

## 4. M3 마일스톤 검수 결과

### □ 빌드 검증
- vite build 성공 (3.27초)
- **211 modules transformed** (Phase 2의 106 → 약 2배 증가)
- 번들 크기 변화
  - JS 310KB → **787KB** (chroma·xlsx·simple-statistics·turf 추가분)
  - gzip JS 96KB → **258KB**
  - 초기 로딩 3초 이내 충족 가능

### □ HTTP 서빙 검증
| 자원 | HTTP | 크기 |
|------|------|------|
| / | 200 | 934 B |
| /assets/index-*.js | 200 | 788 KB |
| /data/sido.topojson | 200 | 153 KB |
| /data/sgg.topojson | 200 | 303 KB |
| /data/emd/11.topojson | 200 | 115 KB |
| /data/code_table.json | 200 | 396 KB |
| /data/data_version.json | 200 | 675 B |

### □ 번들 키워드 sanity check (PASS)
- ✓ 코로플레스 / 엑셀 업로드 / 직접 입력 / 범례 / 팔레트
- ✓ 분위수 / 자연단절(Jenks)
- ✓ vuski (출처 표기 정상 임베딩)
- ✓ xlsx / topojson (라이브러리 정상 번들)

### □ 알려진 비핵심 이슈
- `templates/*.xlsx` 정적 파일 직접 GET 시 400 → 한글 파일명 URL 인코딩 이슈
- 실제 양식 다운로드는 SheetJS가 클라이언트에서 동적 생성 → **본 이슈 사용에 영향 없음**

## 5. 사용자 검증 시나리오 (E2E)

### □ 기본 플로우
1. 시도 모드 선택 → 서울특별시 선택 → 서울 427개 읍면동 표시
2. 좌측 "엑셀 양식 다운로드" 클릭 → template_sido_emd_2026-04-28.xlsx 생성
3. 엑셀 파일에 임의 값 입력 → 업로드
4. 매칭 결과 "성공 425 / 실패 2" 등 표시
5. 지도 폴리곤에 색상 자동 매핑
6. 팔레트 변경 → 즉시 색상 변동
7. 분류 등간격 → 분위수 → 자연단절 변경 → 범례 재계산
8. 단계 5 → 7 변경 → 색상 단계 세분화

### □ 대안 플로우 (직접 입력)
1. 시군구 모드 선택
2. "직접 입력" 탭 클릭
3. 검색창에 "서울" 입력 → 서울 25개 구 필터링
4. 종로구·중구 등 임의 값 입력
5. 입력 즉시 지도 색상 반영

## 6. 다음 단계 (Phase 4 진입 조건)
- M3 검수 PASS 확인 ✅
- 사용자 로컬 시각 검증 권장
- Phase 4 착수 가능
- 잔여 항목
  - PNG 내보내기 (html2canvas)
  - 반응형 (모바일 패널 토글)
  - 에러 처리 강화
  - vite-plugin-singlefile 적용 검토 (단일 HTML 옵션)

## 7. 사용자 로컬 적용
```bash
cd D:\drive\agent\지역사회보장계획_데이터\web
npm run build      # dist/ 갱신
npm run preview    # 미리보기 (http://localhost:4173)
```
