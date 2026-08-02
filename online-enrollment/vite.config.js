import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),
            tailwindcss()
  ],
  server: {
    proxy: {
      // Proxy frontend requests starting with /backend-online-enrollment
      // to the local PHP server. Start your PHP server on port 8000.
      '/backend-online-enrollment': {
        // XAMPP serves PHP on port 80 from htdocs; proxy to that origin
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})