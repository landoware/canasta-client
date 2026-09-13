import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GameView from '../GameView.vue'
import PlayerHand from '@/components/board/PlayerHand.vue'
import DiscardPile from '@/components/board/DiscardPile.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import type { StateMessage } from '@/types/protocol'
import { PhasePlaying } from '@/types/canasta'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

function baseState(overrides: Partial<StateMessage> = {}): StateMessage {
  return {
    deckCount: 100,
    discardCount: 1,
    discardTopCard: { id: 99, suit: 0, rank: 0 },
    name: 'Alice',
    hand: {
      1: { id: 1, suit: 0, rank: 0 },
      2: { id: 2, suit: 0, rank: 1 },
    },
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
    phase: PhasePlaying,
    handNumber: 1,
    gameOver: false,
    canGoOut: false,
    ...overrides,
  }
}

describe('GameView', () => {
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

  it('discards the single selected hand card when the discard pile is clicked', async () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(GameView)

    const [firstHandCard] = wrapper.findComponent(PlayerHand).findAll('button')
    await firstHandCard!.trigger('click')

    await wrapper.findComponent(DiscardPile).find('button').trigger('click')

    expect(send).toHaveBeenCalledWith('discard', { cardId: 1 })
  })

  it('keeps the discard pile disabled while zero or multiple cards are selected', async () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(GameView)
    expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)

    const handButtons = wrapper.findComponent(PlayerHand).findAll('button')
    await handButtons[0]!.trigger('click')
    await handButtons[1]!.trigger('click')

    expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
  })

  it('clears the selection after a successful discard', async () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(GameView)
    const firstHandButton = () => wrapper.findComponent(PlayerHand).findAll('button')[0]!

    await firstHandButton().trigger('click')
    expect(firstHandButton().attributes('data-selected')).toBe('true')

    await wrapper.findComponent(DiscardPile).find('button').trigger('click')

    expect(firstHandButton().attributes('data-selected')).toBe('false')
  })
})
