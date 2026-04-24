import { defineConfig, presetIcons, presetUno } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetIcons({ scale: 1.2, warn: true }),
  ],
  theme: {
    colors: {
      faceit: {
        primary: '#FF5500',
        dark: '#1F1F22',
      },
    },
  },
})
