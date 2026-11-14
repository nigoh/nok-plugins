import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'
const which = process.env.MEASURE ?? 'all'
export default defineConfig({
  root: path.resolve(__dirname, '..'),
  plugins: [react(), tailwindcss()],
  build: { outDir: `/tmp/measure-${which}`, emptyOutDir: true, rollupOptions: { input: path.resolve(__dirname, which === 'all' ? '../index.html' : `${which}.html`) } },
})
