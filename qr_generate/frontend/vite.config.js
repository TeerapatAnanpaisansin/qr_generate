// vite.config.js

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command }) => {
  const isBuild = command === 'build'
  return {
    // serve SPA from /app/ in production (matches your Express setup)
    base: '/',
    plugins: [vue(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: { port: 3000 },
  }
})