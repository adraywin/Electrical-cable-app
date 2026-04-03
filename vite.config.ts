import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use relative paths for Capacitor/Android, GitHub Pages path for web
  base: process.env.BUILD_TARGET === 'android' ? './' : '/electrical-cable-app/',
})
