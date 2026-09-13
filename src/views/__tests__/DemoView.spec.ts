import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DemoView from '../DemoView.vue'
import GameView from '../GameView.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

// DemoView's initDemo awaits each seat's joinRoom, which only resolves once
// a `welcome` message arrives (see game.ts) — connect() is mocked and never
// delivers one, so tests drive that resolution directly via handleWelcome,
// exactly like a real server's welcome response would.
function completeJoins(seatIndexByInstance: number[]): void {
  seatIndexByInstance.forEach((seatIndex, i) => {
    useGameStore(`demo-${i}`).handleWelcome({
      seatIndex,
      roomCode: 'ABCD',
      roomState: 'playing',
    })
  })
}

describe('DemoView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useWebSocketStore).mockReturnValue({
      ws: null,
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      createRoom: vi.fn().mockResolvedValue('ABCD'),
      connect: vi.fn(),
      send: vi.fn(),
      disconnect: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it('starts controlling whichever seat the demo-0 instance became, regardless of join order', async () => {
    const wrapper = mount(DemoView)
    await flushPromises()
    // demo-0 raced to seat 2, not seat 0 — the pre-existing "never assume
    // SEAT_IDS[i] ends up seated at index i" behavior this preserves.
    completeJoins([2, 0, 3, 1])
    await flushPromises()

    expect(wrapper.findComponent(GameView).props('instanceId')).toBe('demo-0')
    expect(wrapper.findComponent(GameView).props('allowSeatSwitch')).toBe(true)
  })

  it('switches to the instance controlling the clicked seat on select-seat', async () => {
    const wrapper = mount(DemoView)
    await flushPromises()
    completeJoins([2, 0, 3, 1]) // demo-1 is seat 0, demo-3 is seat 1
    await flushPromises()

    await wrapper.findComponent(GameView).vm.$emit('select-seat', 0)

    expect(wrapper.findComponent(GameView).props('instanceId')).toBe('demo-1')
  })

  it('ignores a select-seat for a seat index nothing maps to', async () => {
    const wrapper = mount(DemoView)
    await flushPromises()
    completeJoins([2, 0, 3, 1])
    await flushPromises()

    await wrapper.findComponent(GameView).vm.$emit('select-seat', 99)

    expect(wrapper.findComponent(GameView).props('instanceId')).toBe('demo-0')
  })
})
