import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: '../website/images',
  build: {
    outDir: '../website/portal',
    emptyOutDir: true,
  },
});
