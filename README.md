# 전국 읍면동 코로플레스 맵 웹서비스

읍면동 단위 통계값 입력 → 색상 매핑 → 코로플레스 맵 시각화 도구.

## 데이터 출처 및 감사의 글
본 서비스는 [vuski/admdongkor](https://github.com/vuski/admdongkor) 저장소가
공개·관리하는 대한민국 행정동 경계 데이터를 활용함. 정밀하고 지속적으로 갱신되는
행정구역 경계 자료를 자유 이용 가능 형태로 공개해 주신 데이터 제공자께 깊이 감사드림.
- 데이터 라이선스: 자유 이용 (출처 표기)
- 최종 반영 기준일: 2026-04-01 (ver20260401)
- 변환 도구: mapshaper 0.7.3 (simplify 12%)

## 코드 체계
- 통계청 8자리 한국행정구역분류코드(adm_cd) 단일 통일
- 행안부 10자리(adm_cd2) 보조 수록 → 매칭 fallback 활용

## 실행 방법

### 의존성 설치
```bash
cd web
npm install
```

### 개발 서버 실행
```bash
npm run dev
# http://localhost:5173 자동 오픈
```

### 빌드
```bash
npm run build
# dist/ 폴더 생성 → 정적 호스팅 배포
```

### 미리보기
```bash
npm run preview
```

## GitHub Pages 배포
1. `vite.config.js`의 `base`를 `/{repo}/` 형식으로 수정
2. `npm run build`
3. `npm run deploy` (gh-pages 브랜치에 자동 배포)

## 폴더 구조
```
web/
├── public/
│   ├── data/
│   │   ├── sido.topojson
│   │   ├── sgg.topojson
│   │   ├── emd/{17개}.topojson
│   │   ├── code_table.json
│   │   └── data_version.json
│   └── templates/
│       └── template_01~03.xlsx
├── src/
│   ├── components/
│   │   ├── MapView.jsx
│   │   ├── ControlPanel.jsx
│   │   ├── UsageGuide.jsx
│   │   └── Footer.jsx
│   ├── hooks/
│   │   └── useGeoData.js
│   ├── utils/
│   │   ├── codeTable.js
│   │   └── mapStyles.js
│   ├── store.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

## 진행 단계
- Phase 1: 데이터 준비 (완료)
- Phase 2: 기본 지도 + 보기 모드 3종 (현재)
- Phase 3: 코로플레스 기능 (직접입력·엑셀업로드·색상매핑·라벨·범례)
- Phase 4: 마감 (PNG export·반응형·에러처리)
