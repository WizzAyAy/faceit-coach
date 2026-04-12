export const CS2_MAP_POOL = [
  'de_mirage',
  'de_inferno',
  'de_nuke',
  'de_anubis',
  'de_ancient',
  'de_dust2',
  'de_train',
] as const

export type CS2Map = typeof CS2_MAP_POOL[number]

export const MAP_DISPLAY_NAMES: Record<string, string> = {
  de_mirage: 'Mirage',
  de_inferno: 'Inferno',
  de_nuke: 'Nuke',
  de_anubis: 'Anubis',
  de_ancient: 'Ancient',
  de_dust2: 'Dust2',
  de_train: 'Train',
}

export const FACEIT_API_BASE = 'https://open.faceit.com/data/v4'

export const CACHE_TTL = {
  PLAYER_STATS: 600, // 10 min
  MATCH_DETAILS: 120, // 2 min
  MATCH_HISTORY: 300, // 5 min
} as const

export const DEFAULT_MATCH_COUNT = 50
export const UNCERTAINTY_THRESHOLD = 5
