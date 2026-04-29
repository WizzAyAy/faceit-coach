import { fileURLToPath } from 'node:url'
import { builtinPresets } from 'unimport'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'wxt'

// `toRef` is auto-imported from both `vue` (added by @wxt-dev/module-vue) and
// `@vueuse/core`, which triggers a duplicate-import warning on every build/test.
// VueUse re-exports Vue's `toRef`, so dropping it from the VueUse preset keeps
// semantics identical and silences the warning.
const vueUseBase = builtinPresets['@vueuse/core']({})
const vueUseWithoutToRef = {
  ...vueUseBase,
  imports: vueUseBase.imports.filter(
    i => (typeof i === 'string' ? i : i.name) !== 'toRef',
  ),
}

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
  // The Firefox manifest gets `gecko.data_collection_permissions = { required: ['none'] }`
  // via the `build:manifestGenerated` hook below. WXT's static check runs before
  // the hook, so it warns regardless — silence it since the field is correctly set.
  suppressWarnings: { firefoxDataCollection: true },
  imports: {
    presets: ['vue', 'pinia', vueUseWithoutToRef],
    dirs: ['composables', 'stores'],
  },
  vite: () => ({
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [
      UnoCSS({ mode: 'per-module' }),
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
      'https://www.faceit.com/*',
      'https://open.faceit.com/*',
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
            data_collection_permissions: { required: ['none'] },
          },
        }
      }
      else if (wxt.config.command === 'serve') {
        // key is only needed in dev to maintain a stable extension ID locally.
        // CWS rejects manifests that contain this field.
        manifest.key = CHROME_PUBLIC_KEY
      }
    },
  },
})
