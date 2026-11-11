import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const server = 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/socket.io': { target: server, ws: true },
      '/api': server,
      '/auth': server,
    },
  },
})
