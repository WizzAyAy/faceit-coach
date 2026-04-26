import { createPinia } from 'pinia'
import { createApp } from 'vue'
import Options from '@/entrypoints/options/Options.vue'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

createApp(Options).use(createPinia()).mount('#app')
