import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/execute': {
        target: 'https://api.jdoodle.com',
        changeOrigin: true,
        rewrite: () => '/v1/execute',
      },
    },
  },
})
