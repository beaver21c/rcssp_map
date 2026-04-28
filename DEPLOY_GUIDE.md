# GitHub Pages 배포 가이드 (rcssp_map)

저장소: https://github.com/beaver21c/rcssp_map
배포 URL (예정): https://beaver21c.github.io/rcssp_map/

## 1. 적용 완료 항목

### □ 환경변수 분기 (vite.config.js)
- `SINGLE=1` → 단일 HTML 빌드 (dist-single/, base=`./`)
- `GH_PAGES=1` → GitHub Pages 빌드 (dist/, base=`/rcssp_map/`)
- 기본 → 일반 빌드 (dist/, base=`./`)

### □ 빌드 스크립트 (package.json)
```bash
npm run dev             # 개발 서버
npm run build           # 일반 빌드 (./ base)
npm run build:gh        # GitHub Pages 빌드 (/rcssp_map/ base)
npm run build:single    # 단일 HTML (JS+CSS만 인라인)
npm run build:embedded  # 단일 HTML + 데이터 인라인 (더블클릭 가능)
npm run build:all       # 위 3종 일괄 빌드
npm run deploy          # GH_PAGES 빌드 + gh-pages 브랜치에 수동 push
npm run preview         # 로컬 미리보기
```

### □ GitHub Actions 워크플로우 (.github/workflows/deploy.yml)
- main 브랜치 push 시 자동 빌드·배포
- 수동 실행도 가능 (Actions 탭 → Run workflow)

### □ 빌드 검증 결과
- `GH_PAGES=1 npm run build` 정상 완료
- index.html 내부 자원 경로 → `/rcssp_map/assets/index-*.js` 정상 prefix 적용

---

## 2. 사용자 작업 절차 (순차)

### 단계 1. Git 사전 준비

#### Git 설치 확인
명령창 (PowerShell 또는 cmd)에서:
```bash
git --version
```
- 출력 예: `git version 2.42.0` → 설치됨
- 미설치 시 → https://git-scm.com/download/win 다운로드 후 기본 옵션으로 설치

#### Git 사용자 정보 등록 (최초 1회)
```bash
git config --global user.name "beaver21c"
git config --global user.email "beaver21c@gmail.com"
```

---

### 단계 2. 저장소 코드 업로드

#### 2-1. web 폴더로 이동
```bash
cd D:\drive\agent\지역사회보장계획_데이터\web
```

#### 2-2. Git 저장소 초기화 + 원격 연결
```bash
git init
git branch -M main
git remote add origin https://github.com/beaver21c/rcssp_map.git
```

#### 2-3. 파일 추가 + 커밋
```bash
git add .
git commit -m "초기 커밋: 지역사회보장계획 GIS분석 (rcssp_map)"
```

#### 2-4. GitHub로 업로드
```bash
git push -u origin main
```
- 인증 요청 시 → GitHub 사용자명 + Personal Access Token 입력
- PAT 발급 (최초 1회): https://github.com/settings/tokens → Generate new token (classic) → repo 권한 체크 → 생성된 토큰 복사 → 비밀번호 칸에 붙여넣기

---

### 단계 3. GitHub Pages 활성화

브라우저에서:
1. https://github.com/beaver21c/rcssp_map 접속
2. 상단 **Settings** 탭 클릭
3. 좌측 사이드바 **Pages** 클릭
4. **Source** 드롭다운에서 "**GitHub Actions**" 선택 (Deploy from a branch 아님)
5. 저장 (자동)

---

### 단계 4. 자동 배포 진행 확인

1. https://github.com/beaver21c/rcssp_map/actions 접속
2. "Deploy to GitHub Pages" 워크플로우 진행 상황 확인
3. 약 2~3분 소요. 녹색 체크 표시되면 배포 완료
4. 배포 완료 후 접속 URL: **https://beaver21c.github.io/rcssp_map/**

---

### 단계 5. 갱신 시 (재배포)

코드 수정 → push만 하면 자동 재배포:
```bash
cd D:\drive\agent\지역사회보장계획_데이터\web
git add .
git commit -m "변경 내용 설명"
git push
```

---

## 3. 발생 가능 문제 + 대응

### □ 문제: `git push` 시 인증 실패
- 원인: HTTPS 인증 방식 변경 (비밀번호 직접 입력 불가)
- 대응: Personal Access Token 사용
  - https://github.com/settings/tokens
  - Generate new token (classic)
  - 만료기간 90일~1년 / repo 권한 체크
  - 생성된 토큰을 비밀번호 칸에 붙여넣기
  - Windows 자격 증명 관리자에 자동 저장 → 다음부터 자동 로그인

### □ 문제: 워크플로우 실패 (npm ci 단계)
- 원인: package-lock.json 미커밋
- 대응: 로컬에서 `npm install` 후 `package-lock.json` 추가 commit + push

### □ 문제: 페이지 접속 시 404
- 원인: GitHub Pages 활성화 미완료 또는 base 경로 불일치
- 대응:
  - Settings → Pages 에서 Source가 "GitHub Actions" 인지 확인
  - vite.config.js의 base가 `/rcssp_map/` 인지 확인 (저장소명과 일치)
  - Actions 탭에서 워크플로우 성공 여부 확인

### □ 문제: 페이지는 떠도 빈 화면
- 원인: 자원 경로 prefix 누락
- 대응: 브라우저 콘솔(F12) 확인 → 404 발생 자원 확인 → vite.config.js base 재확인

### □ 문제: "deny push to protected branch"
- 원인: main 브랜치 보호 설정
- 대응: Settings → Branches → main 보호 해제 또는 다른 브랜치로 push

---

## 4. 단일 HTML 발송 시나리오 (병행)

GitHub Pages 외에 폐쇄망·오프라인 사용자에게 발송 시:

```bash
cd D:\drive\agent\지역사회보장계획_데이터\web
npm run build:embedded
```
→ `dist-single/index_embedded.html` (약 3 MB)
→ 메일·USB·드라이브로 발송. 받는 사람은 더블클릭만으로 사용

---

## 5. 두 빌드 동시 실행 (권장)

```bash
cd D:\drive\agent\지역사회보장계획_데이터\web
npm run build:all
```
- `dist/` → 일반 빌드 (정적 호스팅용)
- `dist-single/index.html` → 단일 HTML
- `dist-single/index_embedded.html` → 더블클릭 가능 단일 HTML
- `dist/` (GH_PAGES=1) → GitHub Pages 빌드 (마지막 빌드)

→ git push 시 GitHub Actions가 자동으로 GH_PAGES=1 빌드 실행하므로
  로컬에서는 일반·단일만 만들어도 무방.

---

## 6. 최종 운영 시나리오

| 채널 | URL/파일 | 갱신 방식 |
|------|---------|---------|
| 외부 공개 | https://beaver21c.github.io/rcssp_map/ | git push (자동) |
| 폐쇄망 발송 | dist-single/index_embedded.html | 메일 재발송 |
| 사내 서버 | dist/ 폴더 | 수동 복사 |

---

## 7. 즉시 실행할 명령 (요약)

```bash
# 1단계: 폴더 이동
cd D:\drive\agent\지역사회보장계획_데이터\web

# 2단계: Git 초기화 + 업로드
git init
git branch -M main
git remote add origin https://github.com/beaver21c/rcssp_map.git
git add .
git commit -m "초기 커밋: 지역사회보장계획 GIS분석"
git push -u origin main
```

→ Settings → Pages → Source = "GitHub Actions" 선택
→ 약 2~3분 후 https://beaver21c.github.io/rcssp_map/ 접속
