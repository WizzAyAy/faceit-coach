import type { MapScore, MatchResponse, PickBanResult, PlayerResponse } from '@faceit-coach/core'
import { analyzeLobbyBrowser, createFaceitBrowserClient, faceitMatchToMatchResponse, faceitPlayerToPlayerResponse, monthsAgoTimestamp } from '@faceit-coach/core/browser'

export type { MatchPlayer, MatchResponse, PlayerResponse } from '@faceit-coach/core'

export interface LiveResponse {
  live: boolean
  matchId?: string
  status?: string
  team?: 1 | 2
  analysis?: PickBanResult
  lastMatch?: { matchId: string, finishedAt: number }
  reason?: string
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

export function createHybridClient(settings: {
  apiBaseUrl: string
  apiKey: string
  faceitApiKey: string
}): ApiClient {
  if (settings.apiBaseUrl.trim())
    return new ApiClient(settings.apiBaseUrl, settings.apiKey)

  if (settings.faceitApiKey.trim()) {
    const faceit = createFaceitBrowserClient(settings.faceitApiKey)
    return {
      getPlayer: async (pseudo: string) => {
        const player = await faceit.getPlayerByNickname(pseudo)
        const stats = await faceit.getPlayerStats(player.player_id)
        return faceitPlayerToPlayerResponse(player, stats)
      },
      getLive: async (_pseudo: string): Promise<LiveResponse> => {
        return { live: false }
      },
      getMatch: async (roomId: string): Promise<MatchResponse> => {
        return faceitMatchToMatchResponse(await faceit.getMatch(roomId))
      },
      analyze: async (roomId: string, team: 1 | 2, periodMonths?: number): Promise<PickBanResult & { meta?: { periodMonths: number, maxMatchesPerPlayer: number } }> => {
        const options = periodMonths ? { fromTimestamp: monthsAgoTimestamp(periodMonths) } : {}
        return analyzeLobbyBrowser(faceit, roomId, team, options)
      },
      getStrats: async (_map: string) => {
        throw new Error('Strats not available in direct mode — configure a backend URL')
      },
      health: async () => true,
    } as unknown as ApiClient
  }

  throw new Error('No API configured — open the extension options to set a backend URL or a FACEIT API key.')
}
