import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: './' で相対パス出力 → どのサブパスに置いても動く
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { target: 'es2020', assetsInlineLimit: 0 },
  test: { environment: 'node' },
} as never);
