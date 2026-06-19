import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Warn on large chunks (500KB+)
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks(id: string) {
          // Vendor chunk: React ecosystem
          if (id.includes('node_modules/react') ||
              id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react-router') ||
              id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-react';
          }
          // Vendor chunk: Animation
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-animation';
          }
          // Vendor chunk: Charts
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          // Vendor chunk: i18n
          if (id.includes('node_modules/i18next') ||
              id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n';
          }
        },
      },
    },
    // Generate sourcemaps for error tracking
    sourcemap: false,
  },
})
