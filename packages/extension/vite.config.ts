import { fileURLToPath, URL } from 'node:url'
import { crx } from '@crxjs/vite-plugin'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import manifest from './src/manifest.js'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    Vue(),
    UnoCSS(),
    AutoImport({
      imports: [
        'vue',
        '@vueuse/core',
        'pinia',
      ],
      dts: 'auto-imports.d.ts',
      dirs: ['src/composables', 'src/stores'],
      vueTemplate: true,
    }),
    Components({
      dirs: ['src/components'],
      dts: 'components.d.ts',
    }),
    crx({ manifest }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
})
