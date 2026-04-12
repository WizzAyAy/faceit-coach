export const CS2_MAP_POOL = [
  'de_mirage',
  'de_inferno',
  'de_nuke',
  'de_anubis',
  'de_ancient',
  'de_dust2',
  'de_overpass',
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
}

// Known CT/T side advantage for each map (based on CS2 meta)
// Values > 0.5 = CT-sided, < 0.5 = T-sided
export const MAP_CT_BIAS: Record<string, number> = {
  de_nuke: 0.57,
  de_anubis: 0.52,
  de_ancient: 0.52,
  de_mirage: 0.50,
  de_inferno: 0.50,
  de_dust2: 0.49,
  de_overpass: 0.53,
}

export const FACEIT_API_BASE = 'https://open.faceit.com/data/v4'

export const CACHE_TTL = {
  PLAYER_STATS: 600, // 10 min
  MATCH_DETAILS: 120, // 2 min
  MATCH_HISTORY: 300, // 5 min
} as const

export const DEFAULT_MATCH_COUNT = 50
export const UNCERTAINTY_THRESHOLD = 10

// Scoring weights for map analysis
export const SCORE_WEIGHTS = {
  WINRATE: 0.5,
  KD: 0.3,
  ELO: 0.2,
} as const

// Pick/ban thresholds
export const PICK_THRESHOLD = 0.08
export const BAN_THRESHOLD = -0.08

// Confidence levels based on total team matches on a map
export const CONFIDENCE = {
  HIGH: 30, // >= 30 total team matches on a map
  MEDIUM: 15, // >= 15
  // below 15 = low
} as const
