import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth/login': {
        target: 'http://localhost:8080',
      },
      '/start': {
        target: 'http://localhost:8080',
      },
      '/stop': {
        target: 'http://localhost:8080',
      },
      '/resume': {
        target: 'http://localhost:8080',
      },
      '/reset': {
        target: 'http://localhost:8080',
      },
      '/hide-result': {
        target: 'http://localhost:8080',
      },
      '/charge/start': {
        target: 'http://localhost:8080',
      },
      '/charge/stop': {
        target: 'http://localhost:8080',
      },
      '/state': {
        target: 'http://localhost:8080',
      },
      '/results': {
        target: 'http://localhost:8080',
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
    },
  },
})
