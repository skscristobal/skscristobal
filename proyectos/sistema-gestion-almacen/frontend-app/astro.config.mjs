import { defineConfig } from 'astro/config'
import preact from '@astrojs/preact'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite';

import node from "@astrojs/node";

export default defineConfig({
  integrations: [preact()],
  
  output: "server",
  adapter: node({
    mode: 'standalone',
    // --- 👇 AÑADE ESTAS DOS LÍNEAS AQUÍ 👇 ---
    host: '0.0.0.0', // Le dice a Astro que escuche en todas las IPs (requerido por Render)
    port: process.env.PORT || 4321 // Usa el puerto de Render (o 4321 si corres 'npm run preview' local)
    // --- 👆 FIN DE LAS LÍNEAS A AÑADIR 👆 ---
  }),

  vite: {
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },

    server: {
      port: 4321,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000', // tu backend FastAPI
          changeOrigin: true,
        },
      },
    },

    plugins: [tailwindcss()],
  },
})