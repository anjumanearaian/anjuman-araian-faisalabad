import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/xlsx/')) return 'xlsx'
          if (id.includes('/recharts/') || id.includes('/d3-')) return 'charts'
          if (id.includes('/@mui/') || id.includes('/@emotion/')) return 'mui'
          if (id.includes('/react-router/') || id.includes('/react-dom/') || id.includes('/react/')) return 'react-vendor'
          if (id.includes('/lucide-react/')) return 'icons'
          return undefined
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    }
  }
})
