import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
      proxy: {
          '/api': {
              target: 'http://api-express:3000',
              changeOrigin: true,
        }
    },
    host: true,
    port: 5173,
  },
})
