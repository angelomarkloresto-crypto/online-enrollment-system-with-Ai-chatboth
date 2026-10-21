import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
            tailwindcss()
  ],
  server: {
    host: true,
    proxy: {
      // Proxy frontend requests starting with /backend-online-enrollment
      // to the local Apache/XAMPP PHP backend.
      '/backend-online-enrollment': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})