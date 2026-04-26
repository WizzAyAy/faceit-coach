import { fileURLToPath } from 'node:url'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'wxt'

// Public RSA key — derives a stable Extension ID across Chrome installs
// (khpfppjaichdmbcoihjihfahooklnblc). The matching private key lives outside
// the repo (see RELEASE.md). Only the public half is needed here.
const CHROME_PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjJPiWrFhpFN7j8HrVXY6hjG0aVkZy8Gx6jxYkh8yjTESBAsZhaImOxlM0p3vEEgNKKNkboSsh0QyFP3R2iRzEEyc+4njiybwkEkMoMiZ4g3azEYboGAvx5B2bhjrbDcQdZAcyOEsov208CuvbqQtfP7NGOgT6MrpeFpb36mDDZVD6zP7E1a1sEUepxt0zt57Ft/q5des0PkXfuOuWNhLqAP2hqTA9Md628QT7mLq8ry42Eh4Q/NuMkP/6Mn0Oc3m27oJFGvkB7qiTAj0Nc+SGJZz6Ir90ZXThAuSGhLjW9skBGJ+mWAa3UdIyMyFDd2cyjNwyn2h56c5JxwUGSKrOQIDAQAB'

// Stable Firefox Add-on ID (gecko)
const FIREFOX_EXTENSION_ID = 'faceit-coach@quentin.maignan'

export default defineConfig({
  srcDir: 'src',
  manifestVersion: 3,
  modules: ['@wxt-dev/module-vue'],
  imports: {
    presets: ['vue', 'pinia', '@vueuse/core'],
    dirs: ['composables', 'stores'],
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [
      UnoCSS(),
      Components({
        dirs: ['src/components'],
        dts: 'components.d.ts',
      }),
    ],
  }),
  manifest: {
    name: 'FACEIT Coach',
    description: 'Pick/ban analysis, live match detection and CS2 strats on faceit.com',
    permissions: ['storage', 'activeTab'],
    host_permissions: [
      'http://localhost:8787/*',
      'https://api.faceit-coach.example/*',
    ],
  },
  zip: {
    name: 'faceit-coach',
  },
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      if (wxt.config.browser === 'firefox') {
        manifest.browser_specific_settings = {
          gecko: {
            id: FIREFOX_EXTENSION_ID,
            strict_min_version: '115.0',
          },
        }
      }
      else {
        manifest.key = CHROME_PUBLIC_KEY
      }
    },
  },
})
