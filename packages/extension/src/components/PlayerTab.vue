<script setup lang="ts">
import type { PlayerResponse } from '@/lib/api-client.js'
import { onMounted, ref } from 'vue'
import { useI18n } from '@/composables/useI18n.js'
import { createHybridClient } from '@/lib/api-client.js'
import { useSettingsStore } from '@/stores/settings.js'

const settings = useSettingsStore()
const { t } = useI18n()
const pseudo = ref('')
const loading = ref(false)
const error = ref('')
const player = ref<PlayerResponse | null>(null)

onMounted(() => {
  pseudo.value = settings.defaultPseudo
})

async function search() {
  if (!pseudo.value.trim())
    return
  loading.value = true
  error.value = ''
  player.value = null
  try {
    const api = createHybridClient(settings)
    player.value = await api.getPlayer(pseudo.value.trim())
    await settings.save({ defaultPseudo: pseudo.value.trim() })
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : t('extension.analyze.unknownError')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <form class="flex gap-2" @submit.prevent="search">
      <input
        v-model="pseudo"
        :placeholder="t('extension.player.placeholder')"
        class="flex-1 border border-white/10 rounded bg-black/30 px-3 py-2 text-sm outline-none focus:border-faceit-primary"
      >
      <button
        type="submit"
        :disabled="loading"
        class="rounded bg-faceit-primary px-3 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90"
      >
        {{ loading ? t('extension.player.loading') : t('extension.player.goBtn') }}
      </button>
    </form>

    <p v-if="error" class="text-sm text-red-400">
      {{ error }}
    </p>

    <section v-if="player" class="space-y-3">
      <div class="flex items-center gap-3">
        <img v-if="player.avatar" :src="player.avatar" class="h-12 w-12 rounded" alt="">
        <div>
          <div class="font-semibold">
            {{ player.nickname }}
          </div>
          <div class="text-xs opacity-70">
            ELO {{ player.elo }} · Lvl {{ player.level }} · {{ player.region }}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2 text-center text-sm">
        <div class="rounded bg-black/30 p-2">
          <div class="text-xs opacity-60">
            {{ t('extension.player.winrate') }}
          </div>
          <div>{{ player.lifetime.winrate }}</div>
        </div>
        <div class="rounded bg-black/30 p-2">
          <div class="text-xs opacity-60">
            {{ t('extension.player.kd') }}
          </div>
          <div>{{ player.lifetime.kd }}</div>
        </div>
        <div class="rounded bg-black/30 p-2">
          <div class="text-xs opacity-60">
            {{ t('extension.player.hs') }}
          </div>
          <div>{{ player.lifetime.hs }}</div>
        </div>
      </div>

      <div v-if="player.maps.length" class="space-y-1">
        <h2 class="text-xs uppercase opacity-60">
          {{ t('extension.player.maps') }}
        </h2>
        <ul class="text-sm space-y-0.5">
          <li
            v-for="m in player.maps.slice(0, 5)"
            :key="m.map"
            class="flex justify-between"
          >
            <span>{{ m.map.replace('de_', '') }}</span>
            <span class="opacity-80">{{ m.winrate }}% · {{ t('common.matchesShort', { n: m.matches }) }}</span>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
