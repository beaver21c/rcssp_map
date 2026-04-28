import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// 환경변수 분기
// SINGLE=1   → 단일 HTML 빌드 (dist-single/)
// GH_PAGES=1 → GitHub Pages용 빌드 (base = /rcssp_map/)
// 기본       → 정적 호스팅·로컬·단일 HTML 호환 (base = ./)
const isSingle = process.env.SINGLE === '1';
const isGhPages = process.env.GH_PAGES === '1';

export default defineConfig({
  plugins: [react(), ...(isSingle ? [viteSingleFile()] : [])],
  base: isGhPages ? '/rcssp_map/' : './',
  build: {
    outDir: isSingle ? 'dist-single' : 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2048,
    assetsInlineLimit: isSingle ? 100000000 : 4096,
    rollupOptions: isSingle
      ? { output: { inlineDynamicImports: true, manualChunks: undefined } }
      : {}
  },
  server: { port: 5173, open: true }
});
