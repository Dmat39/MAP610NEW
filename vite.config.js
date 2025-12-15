import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
  ],
  // Configuración para archivos estáticos
  assetsInclude: ['**/*.webp', '**/*.png', '**/*.jpg', '**/*.svg'],
  build: {
    // Asegurar que los archivos estáticos se copien correctamente
    copyPublicDir: true,
    // Deshabilitar sourcemaps en producción
    sourcemap: false,
    // Minificar código
    minify: 'terser',
    rollupOptions: {
      output: {
        // Mantener nombres de archivos estáticos
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.webp')) {
            return 'assets/[name].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    }
  }
 /*  define: {
    // Asegurarse de que las variables de entorno estén disponibles
    'process.env': process.env
  },
  optimizeDeps: {
    include: ['@googlemaps/react-wrapper', '@react-google-maps/api']
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      // Asegurarse de que Google Maps se cargue correctamente
      external: ['google'],
    }
  },
  server: {
    // Configuración para desarrollo
    host: true,
    port: 3000,
    open: true,
    cors: true
  } */
})
