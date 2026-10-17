import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works under a GitHub Pages project path
// (https://<user>.github.io/<repo>/) as well as at a domain root.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    sourcemap: false,
    // Firebase (~130 KB gzipped) is its own lazy chunk, loaded only when cloud sync is configured.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom'], icons: ['lucide-react'] },
      },
    },
  },
  server: { host: true },
  preview: { host: true },
});
