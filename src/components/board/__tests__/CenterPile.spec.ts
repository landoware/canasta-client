import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import CenterPile from '../CenterPile.vue'
import DeckPile from '../DeckPile.vue'
import DiscardPile from '../DiscardPile.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import type { StateMessage } from '@/types/protocol'
import {
  PhaseDrawing,
  PhasePlaying,
  Hearts,
  Diamonds,
  Clubs,
  Spades,
  Four,
  Five,
  Seven,
  Two,
  Joker,
  King,
  Wild,
  Three,
} from '@/types/canasta'

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
    madeCanasta: false,
    canastaMadeThisTurn: false,
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
    goneDown: false,
    ...overrides,
  }
}

// selectedCardIds defaults to empty — most tests only care about
// selectedCardId (discard) or explicitly pass a selection (pile pickup).
function mountCenterPile(gameStore: ReturnType<typeof useGameStore>, selectedCardId: number | null, selectedCardIds: Set<number> = new Set()) {
  return mount(CenterPile, { props: { gameStore, selectedCardId, selectedCardIds } })
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

    const wrapper = mountCenterPile(gameStore, null)

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

    const wrapper = mountCenterPile(gameStore, null)

    expect(wrapper.findComponent(DeckPile).props('disabled')).toBe(true)
  })

  it('draws from the deck through the real store action when the deck pile emits draw', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mountCenterPile(gameStore, null)
    wrapper.findComponent(DeckPile).vm.$emit('draw')

    expect(send).toHaveBeenCalledWith('draw_from_deck', {})
  })

  it('disables the discard pile when no card is selected', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying }))

    const wrapper = mountCenterPile(gameStore, null)

    expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
  })

  it('disables the discard pile when a card is selected but it is not this seat\'s turn to play', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhaseDrawing }))

    const wrapper = mountCenterPile(gameStore, 7)

    expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
  })

  it('discards the selected card through the real store action and emits played', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({ phase: PhasePlaying, hand: { 7: { id: 7, suit: Clubs, rank: Four } } }),
    )

    const wrapper = mountCenterPile(gameStore, 7)
    expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(false)

    wrapper.findComponent(DiscardPile).vm.$emit('click')

    expect(send).toHaveBeenCalledWith('discard', { cardId: 7 })
    expect(wrapper.emitted('played')).toHaveLength(1)
  })

  it('disables the discard pile when the selected card is a red three', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({ phase: PhasePlaying, hand: { 7: { id: 7, suit: Hearts, rank: Three } } }),
    )

    const wrapper = mountCenterPile(gameStore, 7)

    expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
  })

  it('allows discarding a black three (only red threes are special)', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({ phase: PhasePlaying, hand: { 7: { id: 7, suit: Clubs, rank: Three } } }),
    )

    const wrapper = mountCenterPile(gameStore, 7)

    expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(false)
  })

  describe('picking up the discard pile', () => {
    const hand = {
      7: { id: 7, suit: Clubs, rank: Four },
      8: { id: 8, suit: Hearts, rank: Four },
      9: { id: 9, suit: Diamonds, rank: Four },
    }

    it('enables the pile once 2+ matching cards are selected during the draw phase', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({ phase: PhaseDrawing, discardTopCard: { id: 1, suit: Spades, rank: Four }, hand }),
      )

      const wrapper = mountCenterPile(gameStore, null, new Set([7, 8]))

      expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(false)
    })

    it('stays disabled with fewer than 2 selected cards', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({ phase: PhaseDrawing, discardTopCard: { id: 1, suit: Spades, rank: Four }, hand }),
      )

      const wrapper = mountCenterPile(gameStore, null, new Set([7]))

      expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
    })

    it('stays disabled once the phase advances to playing', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({ phase: PhasePlaying, discardTopCard: { id: 1, suit: Spades, rank: Four }, hand }),
      )

      const wrapper = mountCenterPile(gameStore, null, new Set([7, 8]))

      expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
    })

    it('stays disabled when the selected cards do not match the top card\'s rank', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhaseDrawing,
          discardTopCard: { id: 1, suit: Spades, rank: Three },
          hand: { 7: { id: 7, suit: Clubs, rank: Four }, 8: { id: 8, suit: Hearts, rank: Four } },
        }),
      )

      const wrapper = mountCenterPile(gameStore, null, new Set([7, 8]))

      expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
    })

    it('stays disabled when the pile is frozen (top card is a three)', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhaseDrawing,
          discardTopCard: { id: 1, suit: Spades, rank: Three },
          hand: { 7: { id: 7, suit: Clubs, rank: Three }, 8: { id: 8, suit: Hearts, rank: Three } },
        }),
      )

      const wrapper = mountCenterPile(gameStore, null, new Set([7, 8]))

      expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
    })

    it('requires an all-wild selection when the top card itself is wild', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhaseDrawing,
          discardTopCard: { id: 1, suit: Spades, rank: Two },
          hand: { 7: { id: 7, suit: Clubs, rank: Two }, 8: { id: 8, suit: Hearts, rank: Four } },
        }),
      )

      const wrapper = mountCenterPile(gameStore, null, new Set([7, 8]))

      expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
    })

    it('picks up the pile through the real store action and emits played', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({ phase: PhaseDrawing, discardTopCard: { id: 1, suit: Spades, rank: Four }, hand }),
      )

      const wrapper = mountCenterPile(gameStore, null, new Set([7, 8]))
      wrapper.findComponent(DiscardPile).vm.$emit('click')

      expect(send).toHaveBeenCalledWith('pick_up_discard_pile', { cardIds: [7, 8] })
      expect(wrapper.emitted('played')).toHaveLength(1)
    })

    describe('hand stranding', () => {
      // A 2-card hand, both contributed, with only the top card in the
      // pile (discardCount: 1) — mirrors PickUpDiscardPile's own
      // finalHandSize check in moves.go: 2 - 2 + (1 - 1) = 0 remaining.
      const twoCardHand = {
        7: { id: 7, suit: Clubs, rank: Four },
        8: { id: 8, suit: Hearts, rank: Four },
      }

      it('stays disabled when the pile is too thin to refill the hand', () => {
        const gameStore = useGameStore()
        gameStore.handleState(
          baseState({
            phase: PhaseDrawing,
            discardCount: 1,
            discardTopCard: { id: 1, suit: Spades, rank: Four },
            hand: twoCardHand,
            canGoOut: false,
          }),
        )

        const wrapper = mountCenterPile(gameStore, null, new Set([7, 8]))

        expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
      })

      it('is enabled for the same thin pile once granted go-out permission', () => {
        const gameStore = useGameStore()
        gameStore.handleState(
          baseState({
            phase: PhaseDrawing,
            discardCount: 1,
            discardTopCard: { id: 1, suit: Spades, rank: Four },
            hand: twoCardHand,
            canGoOut: true,
          }),
        )

        const wrapper = mountCenterPile(gameStore, null, new Set([7, 8]))

        expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(false)
      })

      it('is enabled when the rest of the pile would refill the hand', () => {
        const gameStore = useGameStore()
        gameStore.handleState(
          baseState({
            phase: PhaseDrawing,
            discardCount: 3,
            discardTopCard: { id: 1, suit: Spades, rank: Four },
            hand: twoCardHand,
            canGoOut: false,
          }),
        )

        const wrapper = mountCenterPile(gameStore, null, new Set([7, 8]))

        expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(false)
      })

      it('is enabled when the pickup completes the team\'s last required canasta type, leaving exactly one card', () => {
        const gameStore = useGameStore()
        const canasta = (id: number, rank: number, natural: boolean) => ({
          id,
          rank,
          cards: Array.from({ length: 7 }, (_, i) => ({ id: id * 100 + i, suit: Hearts, rank })),
          count: 7,
          natural,
        })
        const sixWildTwos = Object.fromEntries(
          Array.from({ length: 6 }, (_, i) => [100 + i, { id: 100 + i, suit: Hearts, rank: Two }]),
        )

        gameStore.handleState(
          baseState({
            phase: PhaseDrawing,
            goneDown: true,
            canGoOut: false,
            discardCount: 1,
            discardTopCard: { id: 1, suit: Spades, rank: Joker },
            hand: { ...sixWildTwos, 999: { id: 999, suit: Clubs, rank: King } },
            // Already covers natural, unnatural, and sevens — only
            // wildcards is missing.
            ourCanastas: [canasta(10, Four, true), canasta(11, Five, false), canasta(12, Seven, true)],
          }),
        )

        const wrapper = mountCenterPile(gameStore, null, new Set([100, 101, 102, 103, 104, 105]))

        expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(false)
      })

      it('stays disabled when the pickup would leave zero cards, even completing the last required type', () => {
        const gameStore = useGameStore()
        const canasta = (id: number, rank: number, natural: boolean) => ({
          id,
          rank,
          cards: Array.from({ length: 7 }, (_, i) => ({ id: id * 100 + i, suit: Hearts, rank })),
          count: 7,
          natural,
        })
        const sixWildTwos = Object.fromEntries(
          Array.from({ length: 6 }, (_, i) => [100 + i, { id: 100 + i, suit: Hearts, rank: Two }]),
        )

        gameStore.handleState(
          baseState({
            phase: PhaseDrawing,
            goneDown: true,
            canGoOut: false,
            discardCount: 1,
            discardTopCard: { id: 1, suit: Spades, rank: Joker },
            hand: sixWildTwos, // no spare card left over this time
            ourCanastas: [canasta(10, Four, true), canasta(11, Five, false), canasta(12, Seven, true)],
          }),
        )

        const wrapper = mountCenterPile(gameStore, null, new Set([100, 101, 102, 103, 104, 105]))

        expect(wrapper.findComponent(DiscardPile).props('disabled')).toBe(true)
      })
    })
  })
})
