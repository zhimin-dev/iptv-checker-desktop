import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Tauri 开发模式下 WebView 加载 http://127.0.0.1:5173
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: {
    target: 'es2021',
  },
})
