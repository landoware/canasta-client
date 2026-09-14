import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GoOutRequestDialog from '../GoOutRequestDialog.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

describe('GoOutRequestDialog', () => {
  let send: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    send = vi.fn()
    vi.mocked(useWebSocketStore).mockReturnValue({
      ws: null,
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      createRoom: vi.fn(),
      connect: vi.fn(),
      send,
      disconnect: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it('renders nothing when there is no pending request', () => {
    const gameStore = useGameStore()

    const wrapper = mount(GoOutRequestDialog, { props: { gameStore } })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('shows the asker\'s name once a request comes in', () => {
    const gameStore = useGameStore()
    gameStore.handleGoOutRequested({ askerName: 'Bob' })

    const wrapper = mount(GoOutRequestDialog, { props: { gameStore } })

    expect(wrapper.text()).toContain('Bob wants to go out')
  })

  it('clicking Yes grants permission through the real store action and clears the request', async () => {
    const gameStore = useGameStore()
    gameStore.handleGoOutRequested({ askerName: 'Bob' })

    const wrapper = mount(GoOutRequestDialog, { props: { gameStore } })
    await wrapper.findAll('button').find((b) => b.text() === 'Yes')!.trigger('click')

    expect(send).toHaveBeenCalledWith('grant_permission_to_go_out', {})
    expect(gameStore.goOutRequest).toBeNull()
  })

  it('clicking No just clears the request, with no server call', async () => {
    const gameStore = useGameStore()
    gameStore.handleGoOutRequested({ askerName: 'Bob' })

    const wrapper = mount(GoOutRequestDialog, { props: { gameStore } })
    await wrapper.findAll('button').find((b) => b.text() === 'No')!.trigger('click')

    expect(send).not.toHaveBeenCalled()
    expect(gameStore.goOutRequest).toBeNull()
  })

  it('clicking the backdrop is treated as No, never silently granting', async () => {
    const gameStore = useGameStore()
    gameStore.handleGoOutRequested({ askerName: 'Bob' })

    const wrapper = mount(GoOutRequestDialog, { props: { gameStore } })
    await wrapper.find('[aria-label="Dismiss"]').trigger('click')

    expect(send).not.toHaveBeenCalled()
    expect(gameStore.goOutRequest).toBeNull()
  })
})
