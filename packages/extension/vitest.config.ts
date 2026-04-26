import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vitest/config'
import { WxtVitest } from 'wxt/testing'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    vue(),
    UnoCSS(),
    Components({
      dirs: ['src/components'],
      dts: 'components.d.ts',
    }),
    WxtVitest(),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/__tests__/**/*.test.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/__tests__/**',
        'src/entrypoints/popup/main.ts',
        'src/entrypoints/options/main.ts',
        // Content-script entry uses WXT lifecycle APIs that are not worth
        // exercising via unit tests; the panel itself is verified manually
        // and via the fixture/mock mode toggle.
        'src/entrypoints/faceit-coach.content/**',
        // Pure fixture data — nothing to assert beyond shape.
        'src/lib/fixtures.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
})
