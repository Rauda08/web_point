import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  // ─── Konfigurasi single-server: hasil build masuk ke public/app milik Laravel ───
  base: '/app/',
  build: {
    outDir: '../../public/app',
    emptyOutDir: true,
  },

  // Saat development (`npm run dev`), panggilan ke /api diteruskan ke Laravel
  // yang jalan terpisah di port 8001 (php artisan serve --port=8001), supaya tidak kena CORS.
  // Catatan: port 8000 default Laravel kadang diblokir izin akses Windows,
  // makanya di project ini backend dijalankan secara eksplisit di port 8001.
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
