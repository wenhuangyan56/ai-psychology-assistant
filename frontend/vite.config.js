import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 8080,
    host: true,
    proxy: {
      '/chat': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/end_session': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/reports': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      },
      '/translate': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
})