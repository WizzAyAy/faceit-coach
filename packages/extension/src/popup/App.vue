<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AnalyzeTab from '../components/AnalyzeTab.vue'
import Logo from '../components/Logo.vue'
import PlayerTab from '../components/PlayerTab.vue'
import { useCurrentRoom } from '../composables/useCurrentRoom.js'
import { useSettingsStore } from '../stores/settings.js'

type Tab = 'analyze' | 'player'
const tab = ref<Tab>('player')

const settings = useSettingsStore()
const { roomId } = useCurrentRoom()

onMounted(async () => {
  await settings.load()
  // Auto-switch to analyze if we landed on a faceit room
  if (roomId.value)
    tab.value = 'analyze'
})
</script>

<template>
  <main class="w-80 p-4 font-sans space-y-3">
    <header class="flex items-center gap-2.5">
      <Logo :size="32" />
      <div>
        <h1 class="text-lg font-semibold leading-tight">
          FACEIT Coach
        </h1>
        <p class="text-[10px] leading-none opacity-60">
          CS2 pick/ban & stats
        </p>
      </div>
    </header>

    <nav class="flex overflow-hidden border border-white/10 rounded text-sm">
      <button
        class="flex-1 px-3 py-1.5"
        :class="tab === 'player' ? 'bg-faceit-primary font-medium' : 'bg-black/30 hover:bg-black/20'"
        @click="tab = 'player'"
      >
        Player
      </button>
      <button
        class="relative flex-1 px-3 py-1.5"
        :class="tab === 'analyze' ? 'bg-faceit-primary font-medium' : 'bg-black/30 hover:bg-black/20'"
        @click="tab = 'analyze'"
      >
        Analyze
        <span
          v-if="roomId"
          class="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-green-400"
          title="Room detectee"
        />
      </button>
    </nav>

    <PlayerTab v-if="tab === 'player'" />
    <AnalyzeTab v-else-if="tab === 'analyze'" />
  </main>
</template>
