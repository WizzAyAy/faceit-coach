import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
  manifest_version: 3,
  name: 'FACEIT Coach',
  version: '1.0.0',
  description: 'Pick/ban analysis, live match detection and CS2 strats on faceit.com',
  icons: {
    16: 'src/assets/icon-16.png',
    32: 'src/assets/icon-32.png',
    48: 'src/assets/icon-48.png',
    128: 'src/assets/icon-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'FACEIT Coach',
    default_icon: {
      16: 'src/assets/icon-16.png',
      32: 'src/assets/icon-32.png',
      48: 'src/assets/icon-48.png',
      128: 'src/assets/icon-128.png',
    },
  },
  permissions: ['storage', 'activeTab'],
  host_permissions: ['http://localhost:8787/*'],
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: false,
  },
})
