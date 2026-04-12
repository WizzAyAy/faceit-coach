// --- Bot command type ---

import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'

export interface BotCommand {
  data: SlashCommandBuilder
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>
}

// --- FACEIT API response types ---

export interface FaceitPlayer {
  player_id: string
  nickname: string
  avatar: string
  country: string
  games: {
    cs2?: {
      faceit_elo: number
      skill_level: number
      region: string
    }
  }
}

export interface FaceitMatchTeamRoster {
  player_id: string
  nickname: string
  avatar: string
  game_player_id: string
  game_player_name: string
  game_skill_level: number
}

export interface FaceitMatchTeam {
  faction_id: string
  leader: string
  name: string
  avatar: string
  type: string
  roster: FaceitMatchTeamRoster[]
}

export interface FaceitMatch {
  match_id: string
  game: string
  region: string
  competition_id: string
  competition_name: string
  competition_type: string
  organizer_id: string
  teams: {
    faction1: FaceitMatchTeam
    faction2: FaceitMatchTeam
  }
  voting: {
    map?: {
      pick?: string[]
      entities?: { class_name: string, name: string }[]
    }
    location?: {
      pick?: string[]
    }
  } | null
  status: 'READY' | 'ONGOING' | 'FINISHED' | 'CANCELLED'
  started_at: number
  finished_at: number
  results?: {
    winner: 'faction1' | 'faction2'
    score: {
      faction1: number
      faction2: number
    }
  }
}

export interface FaceitPlayerStatsSegment {
  label: string
  img_small: string
  img_regular: string
  mode: string
  type: string
  stats: {
    'Matches': string
    'Win Rate %': string
    'K/D Ratio': string
    'Average K/D Ratio': string
    'Headshots %': string
    'Average Headshots %': string
    'Wins': string
    'Rounds': string
    [key: string]: string
  }
}

export interface FaceitPlayerStats {
  player_id: string
  game_id: string
  lifetime: {
    'Matches': string
    'Win Rate %': string
    'K/D Ratio': string
    'Longest Win Streak': string
    'Current Win Streak': string
    'Average K/D Ratio': string
    'Average Headshots %': string
    'Total Headshots %': string
    [key: string]: string
  }
  segments: FaceitPlayerStatsSegment[]
}

export interface FaceitMatchHistory {
  items: FaceitMatchHistoryItem[]
  start: number
  end: number
  from: number
  to: number
}

export interface FaceitMatchHistoryItem {
  match_id: string
  game_id: string
  game_mode: string
  competition_id: string
  competition_name: string
  competition_type: string
  organizer_id: string
  playing_players: string[]
  started_at: number
  finished_at: number
  status: string
  faceit_url: string
  results: {
    winner: string
    score: Record<string, number>
  }
  teams: Record<string, {
    team_id: string
    nickname: string
    avatar: string
    type: string
    players: { player_id: string, nickname: string, avatar: string }[]
  }>
}

export interface FaceitGameStatsResponse {
  items: { stats: FaceitGameStatsItem }[]
  start: number
  end: number
}

export interface FaceitGameStatsItem {
  'Player Id': string
  'Match Id': string
  'Map': string
  'Result': string
  'Kills': string
  'Deaths': string
  'Assists': string
  'Headshots %': string
  'K/R Ratio': string
  'K/D Ratio': string
  [key: string]: string
}

// --- Internal app types ---

export interface PlayerMapStats {
  map: string
  matches: number
  wins: number
  winrate: number
  kdRatio: number
  hsPercent: number
}

export interface PlayerAnalysis {
  playerId: string
  nickname: string
  elo: number
  weight: number
  mapStats: PlayerMapStats[]
}

export interface ScoreBreakdown {
  winrate: number
  kd: number
  elo: number
}

export interface MapScore {
  map: string
  ourScore: number
  theirScore: number
  advantage: number
  confidence: 'high' | 'medium' | 'low'
  ourTotalMatches: number
  theirTotalMatches: number
  ourBreakdown: ScoreBreakdown
  theirBreakdown: ScoreBreakdown
}

export interface PickBanResult {
  picks: MapScore[]
  neutral: MapScore[]
  bans: MapScore[]
  allMaps: MapScore[]
}

export interface TeamAnalysis {
  players: PlayerAnalysis[]
  averageElo: number
}

export interface PredictionResult {
  map: string
  team1WinProbability: number
  team2WinProbability: number
  keyPlayers: { nickname: string, contribution: number }[]
}

export interface StratsResult {
  map: string
  recommendedSide: 'CT' | 'T'
  ctWinrate: number
  tWinrate: number
  playerBreakdown: {
    nickname: string
    ctWinrate: number
    tWinrate: number
  }[]
}
