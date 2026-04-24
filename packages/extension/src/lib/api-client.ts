import type { MapScore, PickBanResult } from '@faceit-coach/core'

export interface PlayerResponse {
  playerId: string
  nickname: string
  avatar: string
  country: string
  elo: number
  level: number
  region: string
  lifetime: { winrate: string, kd: string, hs: string, matches: string }
  maps: { map: string, winrate: number, matches: number, kd: number }[]
}

export interface LiveResponse {
  live: boolean
  matchId?: string
  status?: string
  team?: 1 | 2
  analysis?: PickBanResult
  lastMatch?: { matchId: string, finishedAt: number }
  reason?: string
}

export interface MatchPlayer {
  playerId: string
  nickname: string
  avatar: string
  skillLevel: number
}

export interface MatchResponse {
  matchId: string
  status: string
  teams: {
    faction1: { name: string, roster: MatchPlayer[] }
    faction2: { name: string, roster: MatchPlayer[] }
  }
}

export class ApiClient {
  constructor(private baseUrl: string, private apiKey?: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey && path !== '/health')
      headers['X-API-Key'] = this.apiKey
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: { ...headers, ...init?.headers },
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(body.error ?? `API ${res.status}`)
    }
    return res.json() as Promise<T>
  }

  getPlayer(pseudo: string): Promise<PlayerResponse> {
    return this.request<PlayerResponse>(`/player/${encodeURIComponent(pseudo)}`)
  }

  getLive(pseudo: string): Promise<LiveResponse> {
    return this.request<LiveResponse>(`/live/${encodeURIComponent(pseudo)}`)
  }

  getMatch(roomId: string): Promise<MatchResponse> {
    return this.request<MatchResponse>(`/match/${encodeURIComponent(roomId)}`)
  }

  analyze(roomId: string, team: 1 | 2, periodMonths?: number): Promise<PickBanResult & { meta?: { periodMonths: number, maxMatchesPerPlayer: number } }> {
    return this.request('/analyze', {
      method: 'POST',
      body: JSON.stringify({ roomId, team, periodMonths }),
    })
  }

  getStrats(map: string): Promise<{ map: string, strats: { pistol: { ct: string, t: string }, gun: { ct: string, t: string, antiEco: string, forceBuy: string } } }> {
    return this.request(`/strats/${map}`)
  }

  async health(): Promise<boolean> {
    try {
      await this.request('/health')
      return true
    }
    catch {
      return false
    }
  }
}

export type { MapScore, PickBanResult }
