import { defineConfig } from 'vite'
import path from 'path'
import fs from 'node:fs'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

function ffmpegCoreAssets() {
  const sourceDirectory = path.resolve(__dirname, 'node_modules/@ffmpeg/core/dist/umd')
  const assets: Record<string, string> = {
    'ffmpeg-core.js': 'text/javascript',
    'ffmpeg-core.wasm': 'application/wasm',
  }

  return {
    name: 'ffmpeg-core-assets',
    configureServer(server) {
      server.middlewares.use('/vendor/ffmpeg', (request, response, next) => {
        const fileName = (request.url || '').split('?')[0].replace(/^\/+/, '')
        if (!Object.prototype.hasOwnProperty.call(assets, fileName)) {
          next()
          return
        }

        response.setHeader('Content-Type', assets[fileName])
        fs.createReadStream(path.join(sourceDirectory, fileName)).pipe(response)
      })
    },
    writeBundle(outputOptions) {
      const outputDirectory = outputOptions.dir || path.resolve(__dirname, 'dist')
      const targetDirectory = path.join(outputDirectory, 'vendor/ffmpeg')
      fs.mkdirSync(targetDirectory, { recursive: true })
      Object.keys(assets).forEach(fileName => {
        fs.copyFileSync(path.join(sourceDirectory, fileName), path.join(targetDirectory, fileName))
      })
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    ffmpegCoreAssets(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
