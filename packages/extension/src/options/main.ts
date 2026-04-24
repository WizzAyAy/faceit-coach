import { createPinia } from 'pinia'
import { createApp } from 'vue'
import Options from './Options.vue'
import 'virtual:uno.css'
import '@unocss/reset/tailwind.css'

createApp(Options).use(createPinia()).mount('#app')
