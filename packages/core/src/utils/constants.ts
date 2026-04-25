export const CS2_MAP_POOL = [
  'de_mirage',
  'de_inferno',
  'de_nuke',
  'de_anubis',
  'de_ancient',
  'de_dust2',
  'de_overpass',
  'de_cache',
] as const

export type CS2Map = typeof CS2_MAP_POOL[number]

export const MAP_DISPLAY_NAMES: Record<string, string> = {
  de_mirage: 'Mirage',
  de_inferno: 'Inferno',
  de_nuke: 'Nuke',
  de_anubis: 'Anubis',
  de_ancient: 'Ancient',
  de_dust2: 'Dust2',
  de_overpass: 'Overpass',
  de_cache: 'Cache',
}

const MAP_NAME_TO_ID: Record<string, string> = Object.fromEntries(
  Object.entries(MAP_DISPLAY_NAMES).map(([id, name]) => [name, id]),
)

export function isInMapPool(label: string): boolean {
  return CS2_MAP_POOL.includes(label as any) || label in MAP_NAME_TO_ID
}

export function normalizeMapName(label: string): string {
  return MAP_NAME_TO_ID[label] ?? label
}

export const FACEIT_API_BASE = 'https://open.faceit.com/data/v4'

export const CACHE_TTL = {
  PLAYER_STATS: 600,
  MATCH_DETAILS: 120,
  MATCH_HISTORY: 300,
} as const

export const UNCERTAINTY_THRESHOLD = 10

export const SCORE_WEIGHTS = {
  WINRATE: 0.5,
  KD: 0.3,
  ELO: 0.2,
} as const

export const PICK_THRESHOLD = 0.08
export const BAN_THRESHOLD = -0.08

export const CONFIDENCE = {
  HIGH: 30,
  MEDIUM: 15,
} as const
