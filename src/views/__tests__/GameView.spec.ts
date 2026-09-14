import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import GameView from '../GameView.vue'
import PlayerHand from '@/components/board/PlayerHand.vue'
import DiscardPile from '@/components/board/DiscardPile.vue'
import OtherPlayerHand from '@/components/board/OtherPlayerHand.vue'
import Button from '@/components/Button.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import { useSettingsStore } from '@/stores/settings'
import type { StateMessage } from '@/types/protocol'
import { PhasePlaying, Four, Eight } from '@/types/canasta'
import { SortRankDescending } from '@/utils/handSort'
import { handHalfWidthExpr } from '@/utils/handLayout'

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
    goneDown: false,
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

  it('sorts the hand by the configured method when Sort is clicked', async () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        hand: {
          1: { id: 1, suit: 0, rank: Eight },
          2: { id: 2, suit: 0, rank: Four },
        },
      }),
    )

    const wrapper = mount(GameView)
    expect(wrapper.findComponent(PlayerHand).props('cards').map((c) => c.id)).toEqual([1, 2])

    await wrapper.findComponent(Button).trigger('click')

    expect(wrapper.findComponent(PlayerHand).props('cards').map((c) => c.id)).toEqual([2, 1])
  })

  it('positions the Sort button relative to the hand\'s current size, hugging the right edge', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState()) // default hand has 2 cards

    const wrapper = mount(GameView)
    const sortWrapper = wrapper.findComponent(Button).element.parentElement!

    expect(sortWrapper.getAttribute('style')).toContain(
      `left: calc(50vw + ${handHalfWidthExpr(2)} + 1rem)`,
    )
  })

  it('uses the sortMethod configured in settings, not always rank ascending', async () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        hand: {
          1: { id: 1, suit: 0, rank: Four },
          2: { id: 2, suit: 0, rank: Eight },
        },
      }),
    )
    useSettingsStore().sortMethod = SortRankDescending

    const wrapper = mount(GameView)
    await wrapper.findComponent(Button).trigger('click')

    expect(wrapper.findComponent(PlayerHand).props('cards').map((c) => c.id)).toEqual([2, 1])
  })

  it('creates a meld from 3 selected same-rank cards and clears the selection', async () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        hand: {
          1: { id: 1, suit: 0, rank: Four },
          2: { id: 2, suit: 1, rank: Four },
          3: { id: 3, suit: 2, rank: Four },
        },
      }),
    )

    const wrapper = mount(GameView)
    const handButtons = wrapper.findComponent(PlayerHand).findAll('button')
    await handButtons[0]!.trigger('click')
    await handButtons[1]!.trigger('click')
    await handButtons[2]!.trigger('click')

    const createTile = wrapper.find('button[aria-label="Create meld from selected cards"]')
    expect(createTile.exists()).toBe(true)
    await createTile.trigger('click')

    expect(send).toHaveBeenCalledWith('new_meld', { cardIds: [1, 2, 3] })
    expect(handButtons[0]!.attributes('data-selected')).toBe('false')
  })

  it('does not show the create-meld tile for an invalid selection', async () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        hand: {
          1: { id: 1, suit: 0, rank: Four },
          2: { id: 2, suit: 1, rank: Eight },
        },
      }),
    )

    const wrapper = mount(GameView)
    const handButtons = wrapper.findComponent(PlayerHand).findAll('button')
    await handButtons[0]!.trigger('click')
    await handButtons[1]!.trigger('click')

    expect(wrapper.find('button[aria-label="Create meld from selected cards"]').exists()).toBe(
      false,
    )
  })

  it('does not make other players\' names clickable unless allowSeatSwitch is set', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ players: [{ name: 'Bob', handLength: 5, hasFoot: false }] }))

    const wrapper = mount(GameView)

    wrapper.findAllComponents(OtherPlayerHand).forEach((hand) => {
      expect(hand.props('clickable')).toBeFalsy()
    })
  })

  it('emits select-seat when a name is clicked with allowSeatSwitch set', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ players: [{ name: 'Bob', handLength: 5, hasFoot: false }] }))

    const wrapper = mount(GameView, { props: { allowSeatSwitch: true } })
    wrapper.findAllComponents(OtherPlayerHand).forEach((hand) => {
      expect(hand.props('clickable')).toBe(true)
    })

    wrapper.findComponent(OtherPlayerHand).vm.$emit('select')

    expect(wrapper.emitted('select-seat')).toHaveLength(1)
  })
})
