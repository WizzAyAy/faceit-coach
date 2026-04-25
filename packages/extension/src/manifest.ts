import { defineManifest } from '@crxjs/vite-plugin'

// Public RSA key — derives a stable Extension ID across all installs
// (khpfppjaichdmbcoihjihfahooklnblc). The matching private key is stored
// outside the repo (see RELEASE.md). Only the public half is needed here.
const PUBLIC_KEY = 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAjJPiWrFhpFN7j8HrVXY6hjG0aVkZy8Gx6jxYkh8yjTESBAsZhaImOxlM0p3vEEgNKKNkboSsh0QyFP3R2iRzEEyc+4njiybwkEkMoMiZ4g3azEYboGAvx5B2bhjrbDcQdZAcyOEsov208CuvbqQtfP7NGOgT6MrpeFpb36mDDZVD6zP7E1a1sEUepxt0zt57Ft/q5des0PkXfuOuWNhLqAP2hqTA9Md628QT7mLq8ry42Eh4Q/NuMkP/6Mn0Oc3m27oJFGvkB7qiTAj0Nc+SGJZz6Ir90ZXThAuSGhLjW9skBGJ+mWAa3UdIyMyFDd2cyjNwyn2h56c5JxwUGSKrOQIDAQAB'

export default defineManifest({
  manifest_version: 3,
  name: 'FACEIT Coach',
  version: '1.0.0',
  description: 'Pick/ban analysis, live match detection and CS2 strats on faceit.com',
  key: PUBLIC_KEY,
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
  host_permissions: [
    'http://localhost:8787/*',
    'https://api.faceit-coach.example/*',
  ],
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: false,
  },
})
