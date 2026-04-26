import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { browser } from 'wxt/browser'
import { locale } from '@/composables/useI18n.js'

beforeAll(() => {
  locale.value = 'fr'
})

const getPlayerMock = vi.fn()
vi.mock('../lib/api-client.js', () => ({
  ApiClient: class {
    getPlayer = getPlayerMock
  },
}))

declare const __resetChrome: () => void
const PlayerTab = (await import('@/components/PlayerTab.vue')).default
const { useSettingsStore } = await import('@/stores/settings.js')

describe('playerTab', () => {
  beforeEach(() => {
    __resetChrome()
    setActivePinia(createPinia())
    getPlayerMock.mockReset()
  })

  it('should prefill pseudo from settings on mount', async () => {
    await browser.storage.sync.set({ defaultPseudo: 'Default' })
    const settings = useSettingsStore()
    await settings.load()
    const wrapper = mount(PlayerTab)
    await flushPromises()
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Default')
  })

  it('should ignore empty pseudo on submit', async () => {
    const wrapper = mount(PlayerTab)
    await wrapper.get('form').trigger('submit.prevent')
    expect(getPlayerMock).not.toHaveBeenCalled()
  })

  it('should display error when the API fails', async () => {
    getPlayerMock.mockRejectedValueOnce(new Error('not found'))
    const wrapper = mount(PlayerTab)
    await wrapper.get('input').setValue('ghost')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('not found')
  })

  it('should handle non-Error rejections with a generic message', async () => {
    getPlayerMock.mockRejectedValueOnce('oops')
    const wrapper = mount(PlayerTab)
    await wrapper.get('input').setValue('ghost')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('Erreur inconnue')
  })

  it('should render a player profile on success with avatar + maps', async () => {
    getPlayerMock.mockResolvedValueOnce({
      nickname: 'Foo',
      elo: 2500,
      level: 10,
      region: 'EU',
      avatar: 'https://a/avatar',
      lifetime: { winrate: '55%', kd: '1.2', hs: '48%', matches: '100' },
      maps: [
        { map: 'de_mirage', winrate: 70, matches: 10, kd: 1.3 },
        { map: 'de_nuke', winrate: 30, matches: 5, kd: 0.9 },
      ],
    })
    const wrapper = mount(PlayerTab)
    await wrapper.get('input').setValue('Foo')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.text()).toContain('Foo')
    expect(wrapper.text()).toContain('ELO 2500')
    expect(wrapper.text()).toContain('mirage')
    expect(wrapper.find('img').attributes('src')).toBe('https://a/avatar')
  })

  it('should skip the avatar when not provided and hide the maps section when empty', async () => {
    getPlayerMock.mockResolvedValueOnce({
      nickname: 'NoMaps',
      elo: 1500,
      level: 5,
      region: 'EU',
      avatar: '',
      lifetime: { winrate: '50%', kd: '1.0', hs: '40%', matches: '10' },
      maps: [],
    })
    const wrapper = mount(PlayerTab)
    await wrapper.get('input').setValue('NoMaps')
    await wrapper.get('form').trigger('submit.prevent')
    await flushPromises()
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('ul').exists()).toBe(false)
  })
})
