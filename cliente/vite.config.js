import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Registro Tambo',
        short_name: 'Tambo',
        lang: 'es',
        background_color: '#FBF8EF',
        theme_color: '#145A32',
        display: 'standalone',
        icons: [
          { src: 'iconos/icono-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'iconos/icono-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
