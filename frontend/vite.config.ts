// Конфиг Vite: в dev весь /api уходит на локальный uvicorn; на проде тот же путь обслуживает Nginx (см. deploy/timeweb/nginx-selfio.conf).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /* Прод: nginx root = /var/www/selfio/dist — сборка должна попадать туда же (не в frontend/dist). */
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 900,
    /* На узком LTE десятки параллельных modulepreload (каждый webp → отдельный чанк) подавляют канал и дают белый экран.
       Предзагружаем только то, без чего не стартует лендинг; остальное подтянется цепочкой после выполнения entry. */
    modulePreload: {
      resolveDependencies(_filename, deps) {
        return deps.filter(
          (dep) =>
            dep.includes('rolldown-runtime') ||
            dep.includes('vendor-react') ||
            dep.includes('vendor-icons') ||
            (dep.includes('index-') && dep.endsWith('.js')),
        )
      },
    },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }
          /* JSX-runtime должен жить с React, иначе лендинг тянет framer-motion (~125 kB) на первом экране. */
          if (
            id.includes('react/jsx-runtime') ||
            id.includes('react-jsx-runtime') ||
            id.includes('react/jsx-dev-runtime')
          ) {
            return 'vendor-react'
          }
          if (id.includes('framer-motion')) {
            return 'vendor-motion'
          }
          if (id.includes('react-router') || id.includes('react-dom') || /[/\\]react[/\\]/.test(id)) {
            return 'vendor-react'
          }
          if (id.includes('lucide-react')) {
            return 'vendor-icons'
          }
          if (id.includes('axios')) {
            return 'vendor-axios'
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
