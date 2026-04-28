# 사용자 요청사항 이력 (REQUESTS_HISTORY.md)

이전 세션 "Create GIS choropleth analysis plan"(local_93857ced-...)에서 제기된 사용자 요청 일괄 정리. 시간순·범주별 분류. 본 문서는 추후 유사 작업 추진 시 참조용 + 적용 이력 추적용.

작성일: 2026-04-28
참조 세션 ID: local_93857ced-0de0-47f1-8960-00a58c5c5774

---

## 0. 요청 유형 분포 (요약)

| 분류 | 건수 | 처리 결과 |
|------|------|----------|
| 기능 수정 (R-1~R-4) | 4건 | 전건 적용 완료 (`REVISION_REPORT.md`) |
| 배포 절차 안내 | 2건 | DEPLOY_GUIDE.md 작성 + GitHub Actions 구성 |
| git 트러블슈팅 | 4건 | refspec 누락 / PowerShell 문법 / commit 0건 / Pages 활성화 |
| 추가 기능 (F-1~F-2) | 2건 | PNG 라벨 분리 + 일반구 통합 보기 |
| 이스터에그 | 1건 | charCode 위장 + `_meta.js` 분리 적용 |
| **총계** | **13건** | **모두 처리 완료** |

---

## 1. 기능 수정 요청 (R-1 ~ R-4)

### □ R-1: 헤더/푸터 텍스트 수정
○ 요청 원문 (요약)
- (가장 위) "전국 읍면동 코로플레스 맵" → "지역사회보장계획 수립을 위한 GIS분석 (읍면동 단위 코로플레스 맵)"
- (가장 아래) "본 서비스는 한국보건사회연구원에서 제공." + 데이터 출처 감사 문구 수정

○ 적용 결과
- 데스크톱 헤더: "**지역사회보장계획 수립을 위한 GIS분석** (읍면동 단위 코로플레스 맵)"
- 모바일 단축형: "지보계 GIS분석 (읍면동 단위 코로플레스 맵)"
- 푸터: "**본 서비스는 한국보건사회연구원에서 제공.** 경계 데이터: vuski/admdongkor 저장소가 공개·관리하는 행정동 경계 데이터를 활용함. 데이터 제공자께 감사를 표함."
- 브라우저 탭 title 동시 갱신
- 적용 파일: `App.jsx`, `Footer.jsx`, `index.html`

### □ R-2: PNG 다운로드 분석결과 한정
○ 요청 원문
- 기존: 스크린샷 형태(만들어진 그림 + 지도 화면 동시 출력)
- 요구: 만들어진 분석 결과만 깨끗하게 출력

○ 적용 결과
- 헤더 우측 "**클린**" 체크박스 신규 (디폴트 ON)
- 클린 모드 동작
  - OSM 타일 배경 일시 숨김 → 폴리곤만 출력
  - 흰 배경 적용
  - 좌측 상단 자동 제목 박스 (서비스명 + 지역명 + 모드 + 날짜)
  - 좌측 하단 워터마크 (한국보건사회연구원 + vuski/admdongkor)
- 클린 OFF: OSM 포함 화면 캡처 (이전 동작 유지)
- 입력값 0건 시 confirm 다이얼로그 (빈 지도 다운로드 의도 확인)
- 적용 파일: `ExportButton.jsx`

### □ R-3: 엑셀 양식 사용방법 시트 추가
○ 요청 원문
- 다운로드 양식에 "사용방법" 탭 모두 추가

○ 적용 결과
- 양식 xlsx 시트 2종 구성
  - 1번 시트: **입력양식** (지역코드 + 시도 + 시군구 + (읍면동) + 값)
  - 2번 시트: **사용방법** (신규)
    - 작성 방법 4항
    - 컬럼 구성 설명
    - 파일 저장 시 주의사항 4항 (xlsx 형식, 텍스트 형식 권장 등)
    - 업로드 매칭 로직 3단계
    - 오류 발생 시 대응 3항
    - 총 지역 수 + 출처 표기
- 부가 보강
  - 지역코드 컬럼 셀 형식 자동 텍스트(@) 지정 → 앞자리 0 손실 방지
  - "입력양식" 첫번째 시트 위치 보장 (업로드 자동 매칭 호환성)
- 적용 파일: `excelTemplate.js`

### □ R-4: 리셋 기능 + 오류 진단·보완
○ 요청 원문
- 다른 파일 업로드 / 오류 발생 시 리셋 방법 추가
- 기타 오류 가능성 진단·보완

○ 적용 결과
- **ResetButton.jsx** 신규 (헤더 우측 "↺ 리셋" 회색 버튼)
- 리셋 범위: 입력값 / 보기모드 / 시도 / 시군구 / 색상 설정 모두 초기값 복원
- 변경사항 있을 때만 confirm 다이얼로그 (실수 방지)
- 엑셀 업로드 강건성 9개 검증 추가
  | 검증 항목 | 처리 |
  |----------|------|
  | .xlsx/.xls 외 확장자 | "xlsx 또는 xls 파일만 지원함" |
  | 50MB 초과 | "파일 크기 50MB 초과" |
  | 빈 파일 | "시트가 없는 빈 파일" |
  | 데이터 행 0건 | "데이터 행이 없음" |
  | 지역코드 컬럼 미발견 | "양식 다운로드 후 재시도" |
  | 값 컬럼 미발견 | "양식 다운로드 후 재시도" |
  | 매칭 0건 | "양식이 잘못되었거나 보기 모드 불일치" |
  | 매칭 실패율 50%↑ | 노란색 경고 박스 출현 |
  | 입력양식 외 시트 사용 | 노란색 안내 |
- 코드 매칭 강화
  - 앞자리 0 손실 자동 보정 (4→5자리, 7→8자리, 9→10자리 패딩)
  - 행안부 10자리(adm_cd2) → 통계청 8자리(adm_cd) 자동 변환
- 에러 발생 시 즉시 리셋 버튼: 에러 박스 안에 "입력값 초기화 후 재시도" 동봉
- 적용 파일: `ResetButton.jsx`(신규), `ExcelUpload.jsx`, `excelTemplate.js`, `store.js`(resetAll 액션)

---

## 2. 배포 절차 안내 요청

### □ 배포 시나리오 안내 (1차)
○ 요청 원문: "이제 배포를 위한 작업 절차 안내"

○ 처리 결과
- 시나리오 A: GitHub Pages (URL 공개)
- 시나리오 B: 단일 HTML 발송 (메일/USB)
- 시나리오 C: 사내 정적 서버 (IIS/nginx)
- 각 시나리오별 단계 + 체크리스트 + 트러블슈팅 제시
- 발송 시 수신자 안내문 템플릿 동봉

### □ A-2 단계 상세 설명 요청
○ 요청 원문: "vite.config.js 경로 수정 어떻게 하는 건지?"

○ 처리 결과
- 파일 열기 방법 3종 (VS Code / 메모장 / notepad)
- 수정 라인 위치(`base: './'`) + Before/After 명시
- 시나리오별 base 값 가이드 표
- 환경변수 분기 방식 권장 (단일 base 수정 vs 분기)

### □ 저장소 확정 + 일괄 적용
○ 요청 원문: "rcssp_map 저장소" (https://github.com/beaver21c/rcssp_map)

○ 처리 결과
- `vite.config.js` 환경변수 분기 적용
  - `GH_PAGES=1` → base `/rcssp_map/`
  - `SINGLE=1` → base `./`
  - 기본 → base `./`
- `package.json` 빌드 스크립트 4종 추가 (`build:gh` / `build:single` / `build:embedded` / `build:all`)
- `.github/workflows/deploy.yml` GitHub Actions 자동 배포 워크플로우 작성
- 빌드 검증: index.html 자원 경로 `/rcssp_map/assets/*` prefix 정상 적용
- `DEPLOY_GUIDE.md` 작성 (단계별 가이드 + PAT 발급 + 트러블슈팅)

---

## 3. git 트러블슈팅 (push 단계 4건)

### □ T-1: `src refspec main does not match any`
○ 사용자 출력
```
error: src refspec main does not match any
error: failed to push some refs to 'https://github.com/beaver21c/rcssp_map.git'
```
○ 진단: 로컬에 main 브랜치 또는 commit 미생성
○ 처방: `git add . → commit → branch -M main → push -u origin main` 4줄 안내 + 단계별 에러 4종(LF 경고 / Author 미설정 / PAT / rejected) 대응

### □ T-2: PowerShell `||` 문법 미인식
○ 사용자 출력: `'||' 토큰은 이 버전에서 올바른 문 구분 기호가 아닙니다.`
○ 진단: cmd `||`·`2>nul` 문법 → PowerShell 미지원
○ 처방: 진단 명령 무시 + 해결 명령 4줄만 실행하도록 안내. cmd / PowerShell / Git Bash 모두 동작하는 명령으로 단순화

### □ T-3: `your current branch 'main' does not have any commits yet`
○ 사용자 출력: `git log --oneline` → 위 메시지 출력
○ 진단: 브랜치는 main으로 생성됐으나 commit 0건
○ 처방: `git add . → commit -m "..." → push -u origin main` 3줄 + 정상/에러 출력 예시 + PAT 발급 안내

### □ T-4: GitHub Actions `Get Pages site failed`
○ 사용자 출력: `Error: Get Pages site failed. Please verify that the repository has Pages enabled and configured to build using GitHub Actions...`
○ 진단: GitHub Settings → Pages → Source 미설정
○ 처방: ① Settings 수동 활성화 (1분) OR ② workflow yml `enablement: true` 자동 활성화 옵션 제시

---

## 4. 추가 기능 요청 (F-1 ~ F-2)

### □ F-1: PNG 라벨 분리 버그 수정
○ 요청 원문: "png파일로 다운로드 하면, 오른쪽 그림과 같이 지역명과 지도가 다르게 구분됨"

○ 진단
- leaflet의 `.leaflet-pane` / `.leaflet-marker-icon` 등이 `transform: translate3d(...)`로 위치 결정
- html2canvas가 누적 transform 처리 시 좌표 어긋남 발생

○ 적용
- `unfreezeLeafletTransforms()` 함수 추가
- 캡처 직전 모든 leaflet 요소 transform → top/left CSS로 변환
- matrix · matrix3d 패턴 정규식 파싱 → 좌표 명시 변환
- 캡처 후 원상복구
- 결과: PNG 출력 시 라벨이 폴리곤 위 정확한 위치 배치

### □ F-2: 일반구 통합 보기 추가
○ 요청 원문: "용인시 → 용인시 수지구/기흥구/처인구에서는 용인시로 선택하여 읍면동을 볼 수 있도록 추가"

○ 검출된 일반구 보유 시 13개

| 시도 | 시 (구 개수) |
|------|-------------|
| 경기도 | 수원시(4) / 성남시(3) / 안양시(2) / 안산시(2) / 고양시(3) / 용인시(3) / 화성시(4) / 부천시(3) |
| 충청북도 | 청주시(4) |
| 충청남도 | 천안시(2) |
| 전라북도 | 전주시(2) |
| 경상북도 | 포항시(2) |
| 경상남도 | 창원시(5) |

○ 적용
- `code_table.json` 재생성: `merged_cities` 인덱스 추가 (가상 코드 `CITY_31_용인시` 형태)
- ControlPanel: 시군구 드롭다운에 **optgroup "일반구 통합 (시 단위)"** + 개별 일반구 항목 동시 노출
  - 예: "용인시 (전체 3개 구)" 선택 시 → 처인구·기흥구·수지구 모든 읍면동 표시
- MapView: `filterFeatures`에서 CITY_ prefix 검출 → `sgg_codes` 배열 모두 매칭
- `codeTable.js` `getTargetCodes`: 직접 입력 / 엑셀 양식 모두 일반구 통합 모드 지원
- `excelTemplate.js`: 양식 다운로드 시에도 통합 모드 처리
- 통합 모드 선택 시 "ⓘ 일반구 통합 모드. N개 구의 모든 읍면동 표시" 안내 출력

### □ T-5 (T-1~T-4 후속): `! [rejected] main -> main (fetch first)`
○ 사용자 출력
```
! [rejected] main -> main (fetch first)
hint: Updates were rejected because the remote contains work that you do not
hint: have locally.
```
○ 진단: GitHub UI에서 README 자동 생성 등으로 원격이 로컬보다 앞섬
○ 처방: 본인 저장소 → `git push --force` 또는 `git push --force-with-lease` 권장

---

## 5. 이스터에그 (E-1)

### □ E-1: "Contribution by SJ" 은닉 표시
○ 요청 원문 (요약)
- 웹: 좌측 패널 가장 아래, 흰 배경 기준 흐릿한 회색, 거의 안 보이는 수준 작은 글씨
- PNG: "지역사회보장계획 수립을 위한 GIS분석" 위에 작은 흐린 글씨, 박스 상하 간격 짧게 (지도 잘림 방지)
- 깃허브 다운로드자 직접 검색으로는 즉시 발견 못 하도록 적절히 숨김

○ 숨김 전략
- 텍스트 자체를 **charCode 배열**(`[67,111,110,...]`)로만 저장 → 평문 검색 시 비노출
- 별도 파일 `src/utils/_meta.js` 분리 (눈에 띄지 않게)
- 변수명: `_b`, `_bm`, `_bv` (의도 불명확)
- 주석: "Build metadata signature (internal)" 위장

○ 표시 위치 + 스타일
- **웹 화면** (좌측 패널 가장 아래)
  - font-size 8px / color `#eef0f3` (배경 #fff 대비 거의 안 보임)
  - letter-spacing 0.02em / font-weight 300
  - aria-hidden="true" (스크린리더 무시)
- **PNG 캡처** (제목 박스 가장 위)
  - font-size 7px / color `#eef0f3`
  - 박스 padding 축소(5px) + line-height 1.2 → 수직 공간 약 8px만 추가 차지

○ 평문 노출 검증 결과 (PASS)
- `dist/assets/*.js` 평문 0회
- `dist/assets/*.css` 평문 0회
- charCode 배열만 1회 (`67,111,110,116,...`)
- 사용자 폴더 소스 파일 평문 노출 0회

---

## 6. 처리 후 산출물 정리

| 산출물 | 위치 | 관련 요청 |
|--------|------|----------|
| REVISION_REPORT.md | `web/REVISION_REPORT.md` | R-1 ~ R-4 |
| DEPLOY_GUIDE.md | `web/DEPLOY_GUIDE.md` | 배포 안내·트러블슈팅 |
| .github/workflows/deploy.yml | `web/.github/workflows/` | GitHub Actions 자동 배포 |
| vite.config.js (분기) | `web/vite.config.js` | 환경변수 분기 |
| package.json (스크립트) | `web/package.json` | build:gh / build:embedded / build:all |
| ResetButton.jsx (신규) | `web/src/components/` | R-4 |
| ExportButton.jsx (수정) | `web/src/components/` | R-2 + F-1 + E-1 |
| ExcelUpload.jsx (수정) | `web/src/components/` | R-3 + R-4 |
| excelTemplate.js (수정) | `web/src/utils/` | R-3 + R-4 + F-2 |
| code_table.json (재생성) | `web/public/data/` | F-2 (merged_cities 인덱스) |
| _meta.js (신규, 위장) | `web/src/utils/` | E-1 |
| 본 문서 | `web/REQUESTS_HISTORY.md` | 요청 이력 통합 |

---

## 7. 미해결 / 후속 작업 (백로그)

| 항목 | 상태 | 비고 |
|------|------|------|
| GitHub Pages Settings 수동 활성화 | 사용자 작업 대기 | T-4 처방 후 사용자 응답 미수신 |
| F-1 / F-2 / E-1 push 검증 | 사용자 작업 대기 | T-5 force push 처방 후 응답 미수신 |
| README.md 사용자 매뉴얼 | **본 세션에서 완료** | 2026-04-28 전면 개편 |
| 스크린샷 첨부 | 미완 | 실제 화면 캡처 후 README에 삽입 필요 |
| E2E 자동화 (Playwright) | 미완 | v2 백로그 |
| 다국어(영문) 지원 | 미완 | v2 백로그 |
| SVG·PDF export | 미완 | v2 백로그 |

---

## 8. 요청 처리 패턴 (학습용)

본 세션에서 반복 확인된 사용자 요청 패턴 정리. 차후 작업 추진 시 참조.

### □ 패턴 1: 단순 텍스트 변경 + 파급 효과
- R-1 헤더/푸터 수정 → 브라우저 탭·모바일·PNG 워터마크까지 **4개소 동기 갱신** 필요
- 시사점: 텍스트 수정 요청은 항상 노출 위치 전체 점검

### □ 패턴 2: 사용자 입장 강건성 요구
- R-3, R-4 → 양식 사용방법 + 9가지 에러 검증 + 리셋
- 시사점: 사용자 시각 시나리오(잘못된 파일·오류·변경 등) 모두 사전 차단

### □ 패턴 3: 환경 변경 시 트러블 발생
- T-1 ~ T-5 → git push 단계마다 환경(PowerShell·인증·Pages) 차이로 에러 발생
- 시사점: 단계별 에러 메시지 사전 카탈로그화 + 진단 패턴 정리

### □ 패턴 4: 보안성·은닉성 요구
- E-1 → 다운로드자 검색 회피 + 시각적 거의 안 보임
- 시사점: charCode 배열 + 변수명 위장 + 별도 파일 분리 3중 적용

---

## 9. 본 문서 활용 방법

- 신규 요청 발생 시 → 본 문서 패턴 절(8절) 우선 검토
- 기존 적용 위치 확인 시 → 6절 산출물 정리표 참조
- 후속 작업 진행 시 → 7절 백로그 우선순위 결정
- 외부 인계 시 → 본 문서 + REVISION_REPORT.md + PHASE 1~4 보고서 묶음 전달

---

작성: 2026-04-28
