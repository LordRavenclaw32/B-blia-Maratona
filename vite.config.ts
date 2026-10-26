import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { igrejasPlugin } from './scripts/igrejas-plugin';

export default defineConfig({
  base: './',
  plugins: [react(), igrejasPlugin()],
  build: { target: 'es2020', chunkSizeWarningLimit: 900 },
});
