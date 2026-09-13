import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OtherPlayers from '../OtherPlayers.vue'
import OtherPlayerHand from '../OtherPlayerHand.vue'
import { useGameStore } from '@/stores/game'
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
    // Server order: ascending seat index, self skipped.
    players: [
      { name: 'Seat1', handLength: 10, hasFoot: false },
      { name: 'Seat2', handLength: 11, hasFoot: false },
      { name: 'Seat3', handLength: 12, hasFoot: false },
    ],
    ourScore: 0,
    ourMelds: [],
    ourCanastas: [],
    ourRedThrees: [],
    otherScore: 0,
    otherMelds: [],
    otherCanastas: [],
    otherRedThrees: [],
    seatIndex: 0,
    currentPlayer: 2,
    isYourTurn: false,
    phase: PhaseDrawing,
    handNumber: 1,
    gameOver: false,
    canGoOut: false,
    ...overrides,
  }
}

describe('OtherPlayers', () => {
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

  it('maps seats to left/partner/right for a viewer at seat 0', () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
    gameStore.handleState(baseState())

    const wrapper = mount(OtherPlayers, { props: { gameStore } })
    const [top, left, right] = wrapper.findAllComponents(OtherPlayerHand)

    // seat 0 -> left=1, partner=2, right=3
    expect(top!.props()).toMatchObject({ name: 'Seat2', handLength: 11, isCurrentTurn: true })
    expect(left!.props()).toMatchObject({ name: 'Seat1', handLength: 10, isCurrentTurn: false })
    expect(right!.props()).toMatchObject({ name: 'Seat3', handLength: 12, isCurrentTurn: false })
  })

  it('remaps seats correctly for a viewer at a different seat', () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 2, roomCode: 'ABC123', roomState: 'playing' })
    gameStore.handleState(
      baseState({
        seatIndex: 2,
        currentPlayer: 3,
        // seat 2's own view: players = seats [0,1,3] in ascending order
        players: [
          { name: 'Seat0', handLength: 5, hasFoot: false },
          { name: 'Seat1', handLength: 6, hasFoot: false },
          { name: 'Seat3', handLength: 7, hasFoot: false },
        ],
      }),
    )

    const wrapper = mount(OtherPlayers, { props: { gameStore } })
    const [top, left, right] = wrapper.findAllComponents(OtherPlayerHand)

    // seat 2 -> left=3, partner=0, right=1
    expect(top!.props()).toMatchObject({ name: 'Seat0', handLength: 5, isCurrentTurn: false })
    expect(left!.props()).toMatchObject({ name: 'Seat3', handLength: 7, isCurrentTurn: true })
    expect(right!.props()).toMatchObject({ name: 'Seat1', handLength: 6, isCurrentTurn: false })
  })
})
