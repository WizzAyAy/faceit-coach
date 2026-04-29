<script setup lang="ts">
import type { MapScore, PickBanResult } from '@faceit-coach/core'
import type { MatchResponse } from '@/lib/api-client.js'
import { computed, onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'
import { useFaceitUser } from '@/composables/useFaceitUser.js'
import { useI18n } from '@/composables/useI18n.js'
import { createHybridClient } from '@/lib/api-client.js'
import { FIXTURE_ANALYSIS, FIXTURE_MATCH } from '@/lib/fixtures.js'
import { parseRoomId } from '@/lib/parse-room-id.js'

const { t } = useI18n()

interface PersistedSettings {
  apiBaseUrl: string
  defaultPseudo: string
  apiKey: string
  faceitApiKey: string
  mockMode: boolean
}

const settings = ref<PersistedSettings>({
  apiBaseUrl: 'http://localhost:8787',
  defaultPseudo: '',
  apiKey: '',
  faceitApiKey: '',
  mockMode: false,
})
const collapsed = ref(false)
const loading = ref(false)
const error = ref('')
const roomId = ref<string | null>(null)
const match = ref<MatchResponse | null>(null)
const result = ref<PickBanResult | null>(null)
const team = ref<1 | 2 | null>(null)
const teamAutoDetected = ref(false)

const { nickname: detectedNickname, ready: detectionReady } = useFaceitUser()

function effectivePseudo(): string {
  return (detectedNickname.value ?? settings.value.defaultPseudo).trim()
}

async function loadSettings() {
  const stored = await browser.storage.sync.get([
    'apiBaseUrl',
    'defaultPseudo',
    'apiKey',
    'faceitApiKey',
    'mockMode',
  ])
  settings.value = {
    apiBaseUrl: typeof stored.apiBaseUrl === 'string' ? stored.apiBaseUrl : 'http://localhost:8787',
    defaultPseudo: typeof stored.defaultPseudo === 'string' ? stored.defaultPseudo : '',
    apiKey: typeof stored.apiKey === 'string' ? stored.apiKey : '',
    faceitApiKey: typeof stored.faceitApiKey === 'string' ? stored.faceitApiKey : '',
    mockMode: typeof stored.mockMode === 'boolean' ? stored.mockMode : false,
  }
}

function autoSelectTeam(m: MatchResponse) {
  const pseudo = effectivePseudo().toLowerCase()
  if (!pseudo) {
    team.value = team.value ?? 1
    teamAutoDetected.value = false
    return
  }
  const in1 = m.teams.faction1.roster.some(p => p.nickname.toLowerCase() === pseudo)
  const in2 = m.teams.faction2.roster.some(p => p.nickname.toLowerCase() === pseudo)
  if (in1) {
    team.value = 1
    teamAutoDetected.value = true
  }
  else if (in2) {
    team.value = 2
    teamAutoDetected.value = true
  }
  else {
    team.value = team.value ?? 1
    teamAutoDetected.value = false
  }
}

async function refresh() {
  const id = parseRoomId(window.location.href)
  roomId.value = id
  if (!id)
    return

  loading.value = true
  error.value = ''
  match.value = null
  result.value = null

  if (settings.value.mockMode) {
    match.value = FIXTURE_MATCH
    autoSelectTeam(FIXTURE_MATCH)
    result.value = FIXTURE_ANALYSIS
    loading.value = false
    return
  }

  try {
    const api = createHybridClient(settings.value)
    const m = await api.getMatch(id)
    match.value = m
    autoSelectTeam(m)
    result.value = await api.analyze(id, team.value ?? 1)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Unexpected error'
  }
  finally {
    loading.value = false
  }
}

async function changeTeam(next: 1 | 2) {
  team.value = next
  teamAutoDetected.value = false
  if (settings.value.mockMode || !roomId.value)
    return
  loading.value = true
  error.value = ''
  try {
    const api = createHybridClient(settings.value)
    result.value = await api.analyze(roomId.value, next)
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Unexpected error'
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadSettings(), detectionReady])
  await refresh()
})

const sortedMaps = computed<MapScore[]>(() => {
  if (!result.value)
    return []
  return [...result.value.allMaps].sort((a, b) => b.advantage - a.advantage)
})

function pct(n: number): string {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${Math.round(n * 100)}%`
}

function mapShort(m: string): string {
  return m.replace('de_', '')
}

function decisionFor(m: MapScore): 'pick' | 'ban' | 'neutral' {
  if (m.advantage >= 0.08)
    return 'pick'
  if (m.advantage <= -0.08)
    return 'ban'
  return 'neutral'
}
</script>

<template>
  <div class="fc-root" :class="{ 'fc-collapsed': collapsed }">
    <header class="fc-header">
      <div class="fc-title">
        <span class="fc-dot" />
        <span>{{ t('extension.panel.title') }}</span>
        <span v-if="settings.mockMode" class="fc-badge">{{ t('extension.panel.mockBadge') }}</span>
      </div>
      <button
        type="button"
        class="fc-toggle"
        :title="collapsed ? t('extension.panel.expand') : t('extension.panel.collapse')"
        @click="collapsed = !collapsed"
      >
        {{ collapsed ? '▾' : '▴' }}
      </button>
    </header>

    <div v-if="!collapsed" class="fc-body">
      <div v-if="match && !teamAutoDetected" class="fc-teams">
        <button
          type="button"
          class="fc-team"
          :class="{ 'fc-team-active': team === 1 }"
          @click="changeTeam(1)"
        >
          <span class="fc-team-label">T1</span>
          <span class="fc-team-roster">{{ match.teams.faction1.roster.map(p => p.nickname).join(', ') }}</span>
        </button>
        <button
          type="button"
          class="fc-team"
          :class="{ 'fc-team-active': team === 2 }"
          @click="changeTeam(2)"
        >
          <span class="fc-team-label">T2</span>
          <span class="fc-team-roster">{{ match.teams.faction2.roster.map(p => p.nickname).join(', ') }}</span>
        </button>
      </div>

      <p v-if="match && !teamAutoDetected && !effectivePseudo()" class="fc-hint">
        {{ t('extension.panel.noTeam') }}
      </p>

      <div v-if="loading" class="fc-loading">
        {{ t('extension.panel.loading') }}
      </div>

      <p v-else-if="error" class="fc-error">
        {{ error }}
      </p>

      <ul v-else-if="result" class="fc-maps">
        <li
          v-for="m in sortedMaps"
          :key="m.map"
          class="fc-map"
          :class="`fc-${decisionFor(m)}`"
          :title="`Us ${Math.round(m.ourScore * 100)}% · Them ${Math.round(m.theirScore * 100)}% · ${m.confidence}`"
        >
          <span class="fc-map-name">{{ mapShort(m.map) }}</span>
          <span class="fc-map-adv">{{ pct(m.advantage) }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.fc-root {
  position: fixed;
  top: 76px;
  right: 16px;
  width: 320px;
  max-height: calc(100vh - 100px);
  overflow: auto;
  z-index: 2147483600;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, sans-serif;
  font-size: 13px;
  color: #f3f3f3;
  background: rgba(20, 20, 22, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
}
.fc-collapsed {
  max-height: none;
}
.fc-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.fc-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}
.fc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff5500;
  box-shadow: 0 0 6px rgba(255, 85, 0, 0.7);
}
.fc-badge {
  padding: 1px 6px;
  font-size: 10px;
  letter-spacing: 0.05em;
  background: #ffb800;
  color: #1a1a1a;
  border-radius: 3px;
}
.fc-toggle {
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 4px;
}
.fc-toggle:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}
.fc-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fc-teams {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.fc-team {
  display: flex;
  gap: 8px;
  padding: 6px 8px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  color: inherit;
  font: inherit;
  cursor: pointer;
  text-align: left;
}
.fc-team:hover {
  background: rgba(255, 255, 255, 0.04);
}
.fc-team-active {
  border-color: #ff5500;
  background: rgba(255, 85, 0, 0.12);
}
.fc-team-label {
  font-weight: 600;
  font-size: 11px;
  opacity: 0.8;
  flex-shrink: 0;
  width: 22px;
}
.fc-team-roster {
  font-size: 11px;
  opacity: 0.85;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fc-hint {
  margin: 0;
  padding: 6px 8px;
  font-size: 11px;
  opacity: 0.7;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
}
.fc-loading {
  padding: 6px 0;
  text-align: center;
  font-size: 12px;
  opacity: 0.7;
}
.fc-error {
  margin: 0;
  padding: 6px 8px;
  font-size: 12px;
  color: #ff8a80;
  background: rgba(255, 138, 128, 0.08);
  border-radius: 4px;
}
.fc-maps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.fc-map {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: help;
}
.fc-map-name {
  font-weight: 500;
  text-transform: capitalize;
}
.fc-map-adv {
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
}
.fc-pick {
  background: rgba(34, 197, 94, 0.16);
  border-color: rgba(34, 197, 94, 0.3);
}
.fc-pick .fc-map-adv {
  color: #86efac;
}
.fc-ban {
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(239, 68, 68, 0.3);
}
.fc-ban .fc-map-adv {
  color: #fca5a5;
}
.fc-neutral {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.fc-neutral .fc-map-adv {
  color: rgba(255, 255, 255, 0.7);
}
</style>
