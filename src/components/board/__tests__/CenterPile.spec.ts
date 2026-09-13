import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CenterPile from '../CenterPile.vue'
import DeckPile from '../DeckPile.vue'
import DiscardPile from '../DiscardPile.vue'
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
    discardCount: 3,
    discardTopCard: { id: 1, suit: 0, rank: 0 },
    name: 'Alice',
    hand: {},
    hasFoot: false,
    players: [],
    ourScore: 0,
    ourMelds: [],
    ourCanastas: [],
    ourRedThrees: [],
    otherScore: 0,
    otherMelds: [],
    otherCanastas: [],
    otherRedThrees: [],
    seatIndex: 0,
    currentPlayer: 0,
    isYourTurn: true,
    phase: PhaseDrawing,
    handNumber: 1,
    gameOver: false,
    canGoOut: false,
    ...overrides,
  }
}

describe('CenterPile', () => {
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

  it('passes deck/discard state down to the child components', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ deckCount: 40, discardCount: 2 }))

    const wrapper = mount(CenterPile, { props: { gameStore } })

    expect(wrapper.findComponent(DeckPile).props('count')).toBe(40)
    expect(wrapper.findComponent(DeckPile).props('disabled')).toBe(false)
    expect(wrapper.findComponent(DiscardPile).props('count')).toBe(2)
    expect(wrapper.findComponent(DiscardPile).props('topCard')).toEqual(
      gameStore.discardTopCard,
    )
  })

  it('disables the deck pile when it is not this seat\'s turn to draw', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ isYourTurn: false }))

    const wrapper = mount(CenterPile, { props: { gameStore } })

    expect(wrapper.findComponent(DeckPile).props('disabled')).toBe(true)
  })

  it('draws from the deck through the real store action when the deck pile emits draw', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(CenterPile, { props: { gameStore } })
    wrapper.findComponent(DeckPile).vm.$emit('draw')

    expect(send).toHaveBeenCalledWith('draw_from_deck', {})
  })
})
