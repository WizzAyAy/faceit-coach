<script setup lang="ts">
import type { MapScore, MatchResponse, PickBanResult } from '../lib/api-client.js'
import { ref, watch } from 'vue'
import { useCurrentRoom } from '../composables/useCurrentRoom.js'
import { ApiClient } from '../lib/api-client.js'
import { useSettingsStore } from '../stores/settings.js'

const settings = useSettingsStore()
const { roomId } = useCurrentRoom()

const manualRoomId = ref('')
const team = ref<1 | 2>(1)
const teamAutoDetected = ref(false)
const loading = ref(false)
const matchLoading = ref(false)
const error = ref('')
const result = ref<PickBanResult | null>(null)
const match = ref<MatchResponse | null>(null)

function effectiveRoomId(): string {
  return (manualRoomId.value.trim() || roomId.value || '').trim()
}

function apiClient(): ApiClient {
  return new ApiClient(settings.apiBaseUrl, settings.apiKey)
}

async function loadMatch() {
  const id = effectiveRoomId()
  if (!id) {
    match.value = null
    teamAutoDetected.value = false
    return
  }
  matchLoading.value = true
  try {
    match.value = await apiClient().getMatch(id)
    autoSelectTeam()
  }
  catch {
    match.value = null
    teamAutoDetected.value = false
  }
  finally {
    matchLoading.value = false
  }
}

function autoSelectTeam() {
  if (!match.value || !settings.defaultPseudo)
    return
  const pseudo = settings.defaultPseudo.toLowerCase()
  const in1 = match.value.teams.faction1.roster.some(p => p.nickname.toLowerCase() === pseudo)
  const in2 = match.value.teams.faction2.roster.some(p => p.nickname.toLowerCase() === pseudo)
  if (in1) {
    team.value = 1
    teamAutoDetected.value = true
  }
  else if (in2) {
    team.value = 2
    teamAutoDetected.value = true
  }
  else {
    teamAutoDetected.value = false
  }
}

watch(roomId, loadMatch, { immediate: true })
watch(manualRoomId, () => {
  if (!roomId.value)
    loadMatch()
})

async function analyze() {
  const id = effectiveRoomId()
  if (!id) {
    error.value = 'Aucune room detectee — colle un room_id ci-dessous.'
    return
  }
  loading.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await apiClient().analyze(id, team.value)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Unknown error'
  }
  finally {
    loading.value = false
  }
}

function pct(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${Math.round(n * 100)}%`
}

function pctAbs(n: number): string {
  return `${Math.round(n * 100)}%`
}

function mapShort(m: string): string {
  return m.replace('de_', '')
}

function rowColor(m: MapScore): string {
  if (m.advantage >= 0.08)
    return 'bg-green-900/40 border-green-700/40'
  if (m.advantage <= -0.08)
    return 'bg-red-900/40 border-red-700/40'
  return 'bg-black/20 border-white/10'
}

function confidenceLabel(c: MapScore['confidence']): string {
  if (c === 'high')
    return 'Confiance élevée'
  if (c === 'medium')
    return 'Confiance moyenne'
  return 'Confiance faible'
}

function matchCountColor(n: number): string {
  if (n >= 30)
    return 'text-green-300'
  if (n >= 15)
    return 'text-yellow-300'
  return 'text-red-300/80'
}

function breakdownTooltip(m: MapScore): string {
  return [
    `${mapShort(m.map).toUpperCase()}`,
    '',
    `Toi — WR ${pctAbs(m.ourBreakdown.winrate)} · K/D ${m.ourBreakdown.kd.toFixed(2)} · ELO moyen ${Math.round(m.ourBreakdown.elo)}`,
    `Eux — WR ${pctAbs(m.theirBreakdown.winrate)} · K/D ${m.theirBreakdown.kd.toFixed(2)} · ELO moyen ${Math.round(m.theirBreakdown.elo)}`,
    '',
    `Score: ${pctAbs(m.ourScore)} vs ${pctAbs(m.theirScore)}  (avantage ${pct(m.advantage)})`,
    `${confidenceLabel(m.confidence)} — ${m.ourTotalMatches}/${m.theirTotalMatches} matchs analyses`,
    '',
    `Score = 50% winrate + 30% K/D + 20% poids ELO, ajuste pour l'incertitude sur faibles samples`,
  ].join('\n')
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="roomId" class="flex items-center gap-1 text-xs opacity-70">
      <div i-mdi-check-circle class="text-green-400" />
      Room detectee : <span class="font-mono">{{ roomId.slice(0, 8) }}…</span>
    </div>
    <div v-else class="flex items-center gap-1 text-xs opacity-60">
      <div i-mdi-information-outline />
      Aucune room detectee sur cet onglet
    </div>

    <input
      v-if="!roomId"
      v-model="manualRoomId"
      placeholder="Colle le room_id ici"
      class="w-full border border-white/10 rounded bg-black/30 px-3 py-2 text-sm font-mono outline-none focus:border-faceit-primary"
    >

    <section
      v-if="match"
      class="border border-white/10 rounded bg-black/20 p-2 text-xs space-y-1"
    >
      <div
        v-for="(faction, key) in match.teams"
        :key="key"
        class="flex items-center gap-2"
        :class="(key === 'faction1' && team === 1) || (key === 'faction2' && team === 2) ? 'text-faceit-primary font-medium' : 'opacity-80'"
      >
        <span class="w-12 shrink-0">{{ key === 'faction1' ? 'Team 1' : 'Team 2' }}</span>
        <span class="truncate">{{ faction.roster.map(p => p.nickname).join(', ') }}</span>
      </div>
    </section>

    <label class="block text-xs opacity-70 space-y-1">
      <span class="flex items-center gap-1">
        Mon equipe
        <span
          v-if="teamAutoDetected"
          class="rounded bg-green-600/30 px-1 text-[10px] text-green-300"
          title="Detecte via ton pseudo par defaut"
        >
          auto
        </span>
      </span>
      <select
        v-model.number="team"
        class="w-full border border-white/10 rounded bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-faceit-primary"
        @change="teamAutoDetected = false"
      >
        <option :value="1">
          Team 1
        </option>
        <option :value="2">
          Team 2
        </option>
      </select>
    </label>

    <button
      :disabled="loading || matchLoading"
      class="w-full rounded bg-faceit-primary px-3 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90"
      @click="analyze"
    >
      {{ loading ? 'Analyse en cours…' : 'Lancer l\'analyse' }}
    </button>
    <p class="text-center text-[10px] opacity-50">
      Historique des 6 derniers mois
    </p>

    <p v-if="error" class="text-sm text-red-400">
      {{ error }}
    </p>

    <section v-if="result" class="space-y-1">
      <div
        v-for="m in result.allMaps"
        :key="m.map"
        class="cursor-help border rounded px-2 py-1.5"
        :class="rowColor(m)"
        :title="breakdownTooltip(m)"
      >
        <div class="flex items-center justify-between text-sm">
          <span class="font-medium">{{ mapShort(m.map) }}</span>
          <span class="text-xs font-mono" :class="m.advantage >= 0 ? 'text-green-300' : 'text-red-300'">
            {{ pct(m.advantage) }}
          </span>
        </div>
        <div class="flex items-center justify-between text-[11px] opacity-80">
          <span>
            <span class="opacity-60">toi</span>
            {{ pctAbs(m.ourScore) }}
            <span class="font-mono" :class="matchCountColor(m.ourTotalMatches)">
              ({{ m.ourTotalMatches }}m)
            </span>
          </span>
          <span>
            <span class="opacity-60">eux</span>
            {{ pctAbs(m.theirScore) }}
            <span class="font-mono" :class="matchCountColor(m.theirTotalMatches)">
              ({{ m.theirTotalMatches }}m)
            </span>
          </span>
        </div>
      </div>
      <p class="pt-1 text-[10px] opacity-50">
        💡 Survole une map pour voir le detail (winrate, K/D, ELO)
      </p>
    </section>
  </div>
</template>
