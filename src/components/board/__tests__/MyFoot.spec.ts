import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import MyFoot from '../MyFoot.vue'
import FootPile from '../FootPile.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import { handHalfWidthExpr } from '@/utils/handLayout'
import type { StateMessage } from '@/types/protocol'
import { PhaseDrawing, PhasePlaying, Hearts, Four } from '@/types/canasta'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

function baseState(overrides: Partial<StateMessage> = {}): StateMessage {
  return {
    deckCount: 100,
    discardCount: 1,
    discardTopCard: { id: 1, suit: 0, rank: 0 },
    name: 'Alice',
    hand: {},
    hasFoot: true,
    madeCanasta: false,
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

describe('MyFoot', () => {
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

  it('passes hasFoot/madeCanasta through to FootPile as visible/dimmed', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ hasFoot: true, madeCanasta: false }))

    const wrapper = mount(MyFoot, { props: { gameStore } })
    const pile = wrapper.findComponent(FootPile)

    expect(pile.props('visible')).toBe(true)
    expect(pile.props('dimmed')).toBe(true)
    expect(pile.props('clickable')).toBe(true)
    expect(pile.props('back')).toBe('blue')
  })

  it('is not dimmed once madeCanasta is true', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ hasFoot: true, madeCanasta: true }))

    const wrapper = mount(MyFoot, { props: { gameStore } })

    expect(wrapper.findComponent(FootPile).props('dimmed')).toBe(false)
  })

  it('sends pick_up_foot when the pile is picked up and eligible', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ hasFoot: true, madeCanasta: true, phase: PhasePlaying }))

    const wrapper = mount(MyFoot, { props: { gameStore } })
    wrapper.findComponent(FootPile).vm.$emit('pick-up')

    expect(send).toHaveBeenCalledWith('pick_up_foot', {})
  })

  it('ignores pick-up when madeCanasta is false', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ hasFoot: true, madeCanasta: false, phase: PhasePlaying }))

    const wrapper = mount(MyFoot, { props: { gameStore } })
    wrapper.findComponent(FootPile).vm.$emit('pick-up')

    expect(send).not.toHaveBeenCalled()
  })

  it('ignores pick-up when it is not this seat\'s turn to play', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ hasFoot: true, madeCanasta: true, phase: PhaseDrawing }))

    const wrapper = mount(MyFoot, { props: { gameStore } })
    wrapper.findComponent(FootPile).vm.$emit('pick-up')

    expect(send).not.toHaveBeenCalled()
  })

  it('positions itself relative to the hand\'s current size, hugging the left edge', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        hand: {
          1: { id: 1, suit: Hearts, rank: Four },
          2: { id: 2, suit: Hearts, rank: Four },
          3: { id: 3, suit: Hearts, rank: Four },
        },
      }),
    )

    const wrapper = mount(MyFoot, { props: { gameStore } })
    const style = wrapper.find('.fixed').attributes('style')!

    // Exact string match would be too brittle against the rotation-
    // overshoot term's own formatting — just confirm the hand-width
    // expression is present (so it does track hand size) and that the
    // whole thing is one calc() adding onto 50vw.
    expect(style).toContain('right: calc(50vw +')
    expect(style).toContain(handHalfWidthExpr(3))
  })
})
