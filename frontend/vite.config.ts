// Конфиг Vite: в dev весь /api уходит на локальный uvicorn; на проде тот же путь обслуживает Nginx (см. deploy/timeweb/nginx-selfio.conf).
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
