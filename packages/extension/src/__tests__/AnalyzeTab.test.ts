import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { locale } from '@/composables/useI18n.js'

beforeAll(() => {
  locale.value = 'fr'
})

const getMatchMock = vi.fn()
const analyzeMock = vi.fn()
vi.mock('../lib/api-client.js', () => ({
  ApiClient: class {
    getMatch = getMatchMock
    analyze = analyzeMock
  },
}))

declare const __resetChrome: () => void
const AnalyzeTab = (await import('@/components/AnalyzeTab.vue')).default
const { useSettingsStore } = await import('@/stores/settings.js')

function aMap(o: { map: string, advantage: number, confidence?: 'high' | 'medium' | 'low', ourTotal?: number, theirTotal?: number }) {
  return {
    map: o.map,
    ourScore: 0.55,
    theirScore: 0.45,
    advantage: o.advantage,
    confidence: o.confidence ?? 'high',
    ourTotalMatches: o.ourTotal ?? 30,
    theirTotalMatches: o.theirTotal ?? 30,
    ourBreakdown: { winrate: 0.55, kd: 1.1, elo: 2000 },
    theirBreakdown: { winrate: 0.45, kd: 1.0, elo: 1900 },
  }
}

function mountTab(opts: { defaultPseudo?: string } = {}) {
  setActivePinia(createPinia())
  if (opts.defaultPseudo)
    useSettingsStore().defaultPseudo = opts.defaultPseudo
  return mount(AnalyzeTab)
}

describe('analyzeTab', () => {
  beforeEach(() => {
    __resetChrome()
    getMatchMock.mockReset()
    analyzeMock.mockReset()
  })

  it('should display the no-room hint and manual input when no room is detected', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([])
    const wrapper = mountTab()
    await flushPromises()
    expect(wrapper.find('input[placeholder="Colle le room_id ici"]').exists()).toBe(true)
  })

  it('should show an error when analyze is clicked without a room', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([])
    const wrapper = mountTab()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Aucune room')
  })

  it('should load a match and auto-select team 1 when default pseudo matches faction1', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([{
      url: 'https://www.faceit.com/fr/cs2/room/1-abc',
    }])
    getMatchMock.mockResolvedValueOnce({
      matchId: '1-abc',
      status: 'ONGOING',
      teams: {
        faction1: { name: 'Alpha', roster: [{ playerId: 'p1', nickname: 'PlayerA', avatar: '', skillLevel: 8 }] },
        faction2: { name: 'Bravo', roster: [{ playerId: 'p2', nickname: 'PlayerB', avatar: '', skillLevel: 7 }] },
      },
    })
    const wrapper = mountTab({ defaultPseudo: 'PlayerA' })
    await flushPromises()
    expect(wrapper.text()).toContain('PlayerA')
    expect(wrapper.text()).toContain('auto')
  })

  it('should auto-select team 2 when pseudo matches faction2', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([{ url: 'https://faceit.com/room/r' }])
    getMatchMock.mockResolvedValueOnce({
      matchId: 'r',
      status: 'ONGOING',
      teams: {
        faction1: { name: 'A', roster: [{ playerId: 'p1', nickname: 'PlayerA', avatar: '', skillLevel: 8 }] },
        faction2: { name: 'B', roster: [{ playerId: 'p2', nickname: 'PlayerB', avatar: '', skillLevel: 7 }] },
      },
    })
    const wrapper = mountTab({ defaultPseudo: 'PlayerB' })
    await flushPromises()
    const select = wrapper.get('select').element as HTMLSelectElement
    expect(select.value).toBe('2')
  })

  it('should reset auto badge when the pseudo is not found', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([{ url: 'https://faceit.com/room/r' }])
    getMatchMock.mockResolvedValueOnce({
      matchId: 'r',
      status: 'ONGOING',
      teams: {
        faction1: { name: 'A', roster: [{ playerId: 'p1', nickname: 'Foo', avatar: '', skillLevel: 8 }] },
        faction2: { name: 'B', roster: [{ playerId: 'p2', nickname: 'Bar', avatar: '', skillLevel: 7 }] },
      },
    })
    const wrapper = mountTab({ defaultPseudo: 'Ghost' })
    await flushPromises()
    expect(wrapper.text()).not.toContain('auto')
  })

  it('should drop match state when getMatch fails', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([{ url: 'https://faceit.com/room/r' }])
    getMatchMock.mockRejectedValueOnce(new Error('nope'))
    const wrapper = mountTab()
    await flushPromises()
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('should render analysis with all color branches', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([{ url: 'https://faceit.com/room/r' }])
    getMatchMock.mockResolvedValueOnce({
      matchId: 'r',
      status: 'ONGOING',
      teams: {
        faction1: { name: 'A', roster: [] },
        faction2: { name: 'B', roster: [] },
      },
    })
    analyzeMock.mockResolvedValueOnce({
      picks: [],
      neutral: [],
      bans: [],
      allMaps: [
        aMap({ map: 'de_mirage', advantage: 0.15, ourTotal: 40, theirTotal: 35 }), // pick (green)
        aMap({ map: 'de_inferno', advantage: 0.02, confidence: 'medium', ourTotal: 20, theirTotal: 15 }), // neutral
        aMap({ map: 'de_nuke', advantage: -0.15, confidence: 'low', ourTotal: 5, theirTotal: 3 }), // ban
      ],
    })
    const wrapper = mountTab()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('mirage')
    expect(wrapper.text()).toContain('nuke')
    expect(wrapper.text()).toContain('inferno')
    // Hover tooltip content
    const rows = wrapper.findAll('.cursor-help')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows[0].attributes('title')).toContain('WR')
  })

  it('should render an error from analyze failure', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([{ url: 'https://faceit.com/room/r' }])
    getMatchMock.mockResolvedValueOnce({
      matchId: 'r',
      status: 'ONGOING',
      teams: { faction1: { name: 'A', roster: [] }, faction2: { name: 'B', roster: [] } },
    })
    analyzeMock.mockRejectedValueOnce(new Error('server down'))
    const wrapper = mountTab()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('server down')
  })

  it('should handle non-Error rejections from analyze', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([{ url: 'https://faceit.com/room/r' }])
    getMatchMock.mockResolvedValueOnce({
      matchId: 'r',
      status: 'ONGOING',
      teams: { faction1: { name: 'A', roster: [] }, faction2: { name: 'B', roster: [] } },
    })
    analyzeMock.mockRejectedValueOnce('boom')
    const wrapper = mountTab()
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Erreur inconnue')
  })

  it('should use manual room id when auto-detection gives nothing', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([])
    getMatchMock.mockResolvedValueOnce({
      matchId: 'manual',
      status: 'ONGOING',
      teams: { faction1: { name: 'A', roster: [] }, faction2: { name: 'B', roster: [] } },
    })
    analyzeMock.mockResolvedValueOnce({ picks: [], neutral: [], bans: [], allMaps: [] })
    const wrapper = mountTab()
    await flushPromises()
    await wrapper.find('input[placeholder="Colle le room_id ici"]').setValue('manual')
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(analyzeMock).toHaveBeenCalledWith('manual', 1)
  })

  it('should reset auto badge when the user changes the team select', async () => {
    ;(browser.tabs.query as any).mockResolvedValueOnce([{ url: 'https://faceit.com/room/r' }])
    getMatchMock.mockResolvedValueOnce({
      matchId: 'r',
      status: 'ONGOING',
      teams: {
        faction1: { name: 'A', roster: [{ playerId: 'p1', nickname: 'PlayerA', avatar: '', skillLevel: 8 }] },
        faction2: { name: 'B', roster: [{ playerId: 'p2', nickname: 'PlayerB', avatar: '', skillLevel: 7 }] },
      },
    })
    const wrapper = mountTab({ defaultPseudo: 'PlayerA' })
    await flushPromises()
    expect(wrapper.text()).toContain('auto')
    await wrapper.get('select').setValue(2)
    expect(wrapper.text()).not.toContain('auto')
  })
})
