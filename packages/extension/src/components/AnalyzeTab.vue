<script setup lang="ts">
import type { MapScore, MatchResponse, PickBanResult } from '@/lib/api-client.js'
import { ref, watch } from 'vue'
import { useCurrentRoom } from '@/composables/useCurrentRoom.js'
import { useI18n } from '@/composables/useI18n.js'
import { createHybridClient } from '@/lib/api-client.js'
import { useSettingsStore } from '@/stores/settings.js'

const settings = useSettingsStore()
const { roomId } = useCurrentRoom()
const { t } = useI18n()

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

function apiClient() {
  return createHybridClient(settings)
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
watch(manualRoomId, loadMatch)

async function analyze() {
  const id = effectiveRoomId()
  if (!id) {
    error.value = t('extension.analyze.noRoomError')
    return
  }
  loading.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await apiClient().analyze(id, team.value)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : t('extension.analyze.unknownError')
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
    return t('common.confidence.high')
  if (c === 'medium')
    return t('common.confidence.medium')
  return t('common.confidence.low')
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
    mapShort(m.map).toUpperCase(),
    '',
    t('extension.analyze.tooltip.usLine', {
      wr: pctAbs(m.ourBreakdown.winrate),
      kd: m.ourBreakdown.kd.toFixed(2),
      elo: Math.round(m.ourBreakdown.elo),
    }),
    t('extension.analyze.tooltip.themLine', {
      wr: pctAbs(m.theirBreakdown.winrate),
      kd: m.theirBreakdown.kd.toFixed(2),
      elo: Math.round(m.theirBreakdown.elo),
    }),
    '',
    t('extension.analyze.tooltip.scoreLine', {
      us: pctAbs(m.ourScore),
      them: pctAbs(m.theirScore),
      adv: pct(m.advantage),
    }),
    t('extension.analyze.tooltip.confidenceLine', {
      conf: confidenceLabel(m.confidence),
      usMatches: m.ourTotalMatches,
      themMatches: m.theirTotalMatches,
    }),
    '',
    t('extension.analyze.tooltip.formulaLine'),
  ].join('\n')
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="roomId" class="flex items-center gap-1 text-xs opacity-70">
      <div i-mdi-check-circle class="text-green-400" />
      {{ t('extension.analyze.roomDetected', { id: roomId.slice(0, 8) }) }}
    </div>
    <div v-else class="flex items-center gap-1 text-xs opacity-60">
      <div i-mdi-information-outline />
      {{ t('extension.analyze.noRoom') }}
    </div>

    <input
      v-if="!roomId"
      v-model="manualRoomId"
      :placeholder="t('extension.analyze.roomPlaceholder')"
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
        <span class="w-12 shrink-0">{{ t('extension.analyze.team', { n: key === 'faction1' ? 1 : 2 }) }}</span>
        <span class="truncate">{{ faction.roster.map(p => p.nickname).join(', ') }}</span>
      </div>
    </section>

    <label class="block text-xs opacity-70 space-y-1">
      <span class="flex items-center gap-1">
        {{ t('extension.analyze.myTeam') }}
        <span
          v-if="teamAutoDetected"
          class="rounded bg-green-600/30 px-1 text-[10px] text-green-300"
          :title="t('extension.analyze.autoTip')"
        >
          {{ t('extension.analyze.autoBadge') }}
        </span>
      </span>
      <select
        v-model.number="team"
        class="w-full border border-white/10 rounded bg-black/30 px-2 py-1.5 text-sm outline-none focus:border-faceit-primary"
        @change="teamAutoDetected = false"
      >
        <option :value="1">
          {{ t('extension.analyze.team', { n: 1 }) }}
        </option>
        <option :value="2">
          {{ t('extension.analyze.team', { n: 2 }) }}
        </option>
      </select>
    </label>

    <button
      :disabled="loading || matchLoading"
      class="w-full rounded bg-faceit-primary px-3 py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90"
      @click="analyze"
    >
      {{ loading ? t('extension.analyze.loading') : t('extension.analyze.startBtn') }}
    </button>
    <p class="text-center text-[10px] opacity-50">
      {{ t('extension.analyze.periodNote') }}
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
            <span class="opacity-60">{{ t('extension.analyze.us') }}</span>
            {{ pctAbs(m.ourScore) }}
            <span class="font-mono" :class="matchCountColor(m.ourTotalMatches)">
              ({{ t('common.matchesShort', { n: m.ourTotalMatches }) }})
            </span>
          </span>
          <span>
            <span class="opacity-60">{{ t('extension.analyze.them') }}</span>
            {{ pctAbs(m.theirScore) }}
            <span class="font-mono" :class="matchCountColor(m.theirTotalMatches)">
              ({{ t('common.matchesShort', { n: m.theirTotalMatches }) }})
            </span>
          </span>
        </div>
      </div>
      <p class="pt-1 text-[10px] opacity-50">
        {{ t('extension.analyze.hoverHint') }}
      </p>
    </section>
  </div>
</template>
