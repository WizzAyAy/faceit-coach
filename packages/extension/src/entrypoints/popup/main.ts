import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from '@/entrypoints/popup/App.vue'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

createApp(App).use(createPinia()).mount('#app')
