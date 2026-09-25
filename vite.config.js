import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project site: https://<owner>.github.io/imageapp/
export default defineConfig({
  plugins: [react()],
  base: '/imageapp/',
})
