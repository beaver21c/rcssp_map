// dist-single/index.html에 데이터 파일 일체 인라인 → 진정한 단일 HTML 생성
// 결과: dist-single/index_embedded.html (더블클릭 가능, CORS 차단 회피)
import fs from 'node:fs';
import path from 'node:path';

const dist = 'dist-single';
const srcHtml = path.join(dist, 'index.html');
const outHtml = path.join(dist, 'index_embedded.html');

if (!fs.existsSync(srcHtml)) {
  console.error('단일 HTML 빌드(dist-single/index.html)가 없음. SINGLE=1 vite build 먼저 실행.');
  process.exit(1);
}

// 데이터 파일 수집
const dataFiles = {};
const dataDir = path.join(dist, 'data');
function walk(dir, prefix = '') {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    const rel = path.posix.join(prefix, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, rel);
    else dataFiles['./data/' + rel] = JSON.parse(fs.readFileSync(p, 'utf8'));
  }
}
walk(dataDir);
console.log('인라인 대상 데이터 파일 수:', Object.keys(dataFiles).length);

// HTML 읽기 + window.__EMBEDDED_DATA__ 주입
let html = fs.readFileSync(srcHtml, 'utf8');
const inlineScript = `<script>window.__EMBEDDED_DATA__=${JSON.stringify(dataFiles)};window.__FETCH_INTERCEPT__=true;</script>`;
html = html.replace('</head>', inlineScript + '</head>');

fs.writeFileSync(outHtml, html);
const sizeMB = (fs.statSync(outHtml).size / 1024 / 1024).toFixed(2);
console.log(`생성 완료: ${outHtml} (${sizeMB} MB)`);
