import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { internalIpV4 } from "internal-ip";

const mobile = !!/android|ios/.exec(process.env.TAURI_ENV_PLATFORM);

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  base:'/',
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: "0.0.0.0",
    hmr: mobile
      ? {
          protocol: "ws",
          host: await internalIpV4(),
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      '^/check/.*': {
        target: 'http://127.0.0.1:8089',
        changeOrigin: true,
      },
      '^/fetch/.*': {
        target: 'http://127.0.0.1:8089',
        changeOrigin: true,
      },
      '^/system/.*': {
        target: 'http://127.0.0.1:8089',
        changeOrigin: true,
      },
      '^/tasks/.*': {
        target: 'http://127.0.0.1:8089',
        changeOrigin: true,
      },
      '^/media/.*': {
        target: 'http://127.0.0.1:8089',
        changeOrigin: true,
      },
      '^/static/.*': {
        target: 'http://127.0.0.1:8089',
        changeOrigin: true,
      },
      '^/q/.*': {
        target: 'http://127.0.0.1:8089',
        changeOrigin: true,
      },
      '^/epg': {
        target: 'http://127.0.0.1:8089',
        changeOrigin: true,
      },
    }
  }
}));
