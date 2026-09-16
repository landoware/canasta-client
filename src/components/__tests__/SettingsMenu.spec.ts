import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import SettingsMenu from '../SettingsMenu.vue'
import {
  useSettingsStore,
  MIN_CARD_SCALE,
  MAX_CARD_SCALE,
  MeldsPositionBottom,
  MeldsPositionTop,
} from '@/stores/settings'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import { SORT_METHOD_OPTIONS, SortRankDescending } from '@/utils/handSort'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

async function mountSettingsMenu(path = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  void router.push(path)
  await router.isReady()
  const wrapper = mount(SettingsMenu, { global: { plugins: [router] } })
  return { wrapper, router }
}

describe('SettingsMenu', () => {
  let disconnect: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    disconnect = vi.fn()
    vi.mocked(useWebSocketStore).mockReturnValue({
      ws: null,
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      createRoom: vi.fn(),
      connect: vi.fn(),
      send: vi.fn(),
      disconnect,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it('is closed until the hamburger button is clicked', async () => {
    const { wrapper } = await mountSettingsMenu()

    expect(wrapper.find('input[type="range"]').exists()).toBe(false)

    await wrapper.find('button[aria-label="Open settings"]').trigger('click')
    expect(wrapper.find('input[type="range"]').exists()).toBe(true)
  })

  it('closes when the close button is clicked', async () => {
    const { wrapper } = await mountSettingsMenu()
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    await wrapper.find('button[aria-label="Close settings"]').trigger('click')
    expect(wrapper.find('input[type="range"]').exists()).toBe(false)
  })

  it('exposes the card scale bounds on the slider and binds the store', async () => {
    const { wrapper } = await mountSettingsMenu()
    const settings = useSettingsStore()
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    const slider = wrapper.find('input[type="range"]')
    expect(slider.attributes('min')).toBe(String(MIN_CARD_SCALE))
    expect(slider.attributes('max')).toBe(String(MAX_CARD_SCALE))

    await slider.setValue('1.5')
    expect(settings.cardScale).toBe(1.5)
  })

  it('renders one option per sort method in the dropdown, defaulting to rank ascending', async () => {
    const { wrapper } = await mountSettingsMenu()
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    const select = wrapper.find('select')
    const options = select.findAll('option')
    expect(options).toHaveLength(SORT_METHOD_OPTIONS.length)
    expect((select.element as HTMLSelectElement).value).toBe(SORT_METHOD_OPTIONS[0]!.value)
  })

  it('updates the sortMethod setting when a different option is chosen', async () => {
    const { wrapper } = await mountSettingsMenu()
    const settings = useSettingsStore()
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    await wrapper.find('select').setValue(SortRankDescending)

    expect(settings.sortMethod).toBe(SortRankDescending)
  })

  it('defaults the melds-position dropdown to bottom and updates the setting', async () => {
    const { wrapper } = await mountSettingsMenu()
    const settings = useSettingsStore()
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    const meldsSelect = wrapper.findAll('select')[1]!
    expect((meldsSelect.element as HTMLSelectElement).value).toBe(MeldsPositionBottom)

    await meldsSelect.setValue(MeldsPositionTop)
    expect(settings.meldsPosition).toBe(MeldsPositionTop)
  })

  describe('leaving the game', () => {
    it('hides the Leave Game button outside the game board', async () => {
      const { wrapper } = await mountSettingsMenu('/join/ABCD')
      await wrapper.find('button[aria-label="Open settings"]').trigger('click')

      const leaveButton = wrapper.findAll('button').find((b) => b.text() === 'Leave Game')
      expect(leaveButton).toBeUndefined()
    })

    it('shows the Leave Game button while on the game board', async () => {
      const { wrapper } = await mountSettingsMenu('/game/ABCD')
      await wrapper.find('button[aria-label="Open settings"]').trigger('click')

      const leaveButton = wrapper.findAll('button').find((b) => b.text() === 'Leave Game')
      expect(leaveButton).not.toBeUndefined()
    })

    it('disconnects, clears game state, closes the menu, and navigates home when clicked', async () => {
      const { wrapper, router } = await mountSettingsMenu('/game/ABCD')
      const gameStore = useGameStore()
      const clearGameStateSpy = vi.spyOn(gameStore, 'clearGameState')
      await wrapper.find('button[aria-label="Open settings"]').trigger('click')

      const leaveButton = wrapper.findAll('button').find((b) => b.text() === 'Leave Game')!
      await leaveButton.trigger('click')
      await router.isReady()

      expect(disconnect).toHaveBeenCalledTimes(1)
      expect(clearGameStateSpy).toHaveBeenCalledTimes(1)
      expect(wrapper.find('input[type="range"]').exists()).toBe(false)
      expect(router.currentRoute.value.path).toBe('/')
    })
  })
})
