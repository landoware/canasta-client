import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import LiveScore from '../LiveScore.vue'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'
import { useWebSocketStore } from '@/stores/websocket'
import type { StateMessage } from '@/types/protocol'
import { PhaseDrawing } from '@/types/canasta'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

function baseState(overrides: Partial<StateMessage> = {}): StateMessage {
  return {
    deckCount: 100,
    discardCount: 1,
    discardTopCard: { id: 1, suit: 0, rank: 0 },
    name: 'Me',
    hand: {},
    hasFoot: false,
    madeCanasta: false,
    canastaMadeThisTurn: false,
    // Server order: ascending seat index, self skipped.
    players: [
      { name: 'Left', handLength: 10, hasFoot: false },
      { name: 'Partner', handLength: 11, hasFoot: false },
      { name: 'Right', handLength: 12, hasFoot: false },
    ],
    ourScore: 150,
    ourMelds: [],
    ourCanastas: [],
    ourRedThrees: [],
    otherScore: 75,
    otherMelds: [],
    otherCanastas: [],
    otherRedThrees: [],
    seatIndex: 0,
    currentPlayer: 0,
    isYourTurn: false,
    phase: PhaseDrawing,
    handNumber: 1,
    gameOver: false,
    canGoOut: false,
    goneDown: false,
    ...overrides,
  }
}

describe('LiveScore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(useWebSocketStore).mockReturnValue({
      ws: null,
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      createRoom: vi.fn(),
      connect: vi.fn(),
      send: vi.fn(),
      disconnect: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it('renders nothing before a game is in progress', () => {
    const gameStore = useGameStore()

    const wrapper = mount(LiveScore, { props: { gameStore } })

    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('shows the toggle button but hides the score panel by default', () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
    gameStore.handleState(baseState())

    const wrapper = mount(LiveScore, { props: { gameStore } })

    expect(wrapper.find('button[aria-label="Show live score"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Me & Partner')
  })

  it('reveals team names as "Name & Name" and scores when toggled open', async () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
    gameStore.handleState(baseState())

    const wrapper = mount(LiveScore, { props: { gameStore } })
    await wrapper.find('button').trigger('click')

    expect(wrapper.text()).toContain('Me & Partner')
    expect(wrapper.text()).toContain('150')
    expect(wrapper.text()).toContain('Left & Right')
    expect(wrapper.text()).toContain('75')
    expect(wrapper.find('button[aria-label="Hide live score"]').exists()).toBe(true)
  })

  it('persists the toggle state through the settings store', async () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
    gameStore.handleState(baseState())
    const settings = useSettingsStore()

    const wrapper = mount(LiveScore, { props: { gameStore } })
    await wrapper.find('button').trigger('click')

    expect(settings.showLiveScore).toBe(true)
  })
})
