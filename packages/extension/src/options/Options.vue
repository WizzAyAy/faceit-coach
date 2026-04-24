<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Logo from '../components/Logo.vue'
import { useI18n } from '../composables/useI18n.js'
import { useSettingsStore } from '../stores/settings.js'

const settings = useSettingsStore()
const { t } = useI18n()

const apiBaseUrl = ref('')
const defaultPseudo = ref('')
const apiKey = ref('')
const saved = ref(false)

onMounted(async () => {
  await settings.load()
  apiBaseUrl.value = settings.apiBaseUrl
  defaultPseudo.value = settings.defaultPseudo
  apiKey.value = settings.apiKey
})

async function onSave() {
  await settings.save({
    apiBaseUrl: apiBaseUrl.value.trim(),
    defaultPseudo: defaultPseudo.value.trim(),
    apiKey: apiKey.value.trim(),
  })
  saved.value = true
  setTimeout(() => {
    saved.value = false
  }, 1500)
}
</script>

<template>
  <main class="w-96 p-6 space-y-4">
    <header class="flex items-center gap-2.5">
      <Logo :size="36" />
      <div>
        <h1 class="text-lg font-semibold leading-tight">
          FACEIT Coach
        </h1>
        <p class="text-xs leading-none opacity-60">
          {{ t('extension.options.title') }}
        </p>
      </div>
    </header>

    <form class="space-y-4" @submit.prevent="onSave">
      <label class="block text-sm space-y-1">
        <span class="opacity-70">{{ t('extension.options.apiUrl') }}</span>
        <input
          v-model="apiBaseUrl"
          class="w-full border border-white/10 rounded bg-black/30 px-3 py-2 outline-none focus:border-faceit-primary"
          :placeholder="t('extension.options.apiUrlPlaceholder')"
        >
      </label>

      <label class="block text-sm space-y-1">
        <span class="opacity-70">{{ t('extension.options.defaultPseudo') }}</span>
        <input
          v-model="defaultPseudo"
          class="w-full border border-white/10 rounded bg-black/30 px-3 py-2 outline-none focus:border-faceit-primary"
          :placeholder="t('extension.options.defaultPseudoPlaceholder')"
        >
      </label>

      <label class="block text-sm space-y-1">
        <span class="opacity-70">{{ t('extension.options.apiKey') }}</span>
        <input
          v-model="apiKey"
          type="password"
          class="w-full border border-white/10 rounded bg-black/30 px-3 py-2 outline-none focus:border-faceit-primary"
          :placeholder="t('extension.options.apiKeyPlaceholder')"
        >
      </label>

      <button
        type="submit"
        class="rounded bg-faceit-primary px-3 py-2 text-sm font-medium"
      >
        {{ saved ? t('extension.options.saved') : t('extension.options.save') }}
      </button>
    </form>
  </main>
</template>
