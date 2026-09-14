import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OpponentMelds from '../OpponentMelds.vue'
import MeldRow from '../MeldRow.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import type { StateMessage } from '@/types/protocol'
import { PhaseDrawing, Hearts, Four } from '@/types/canasta'

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
    hasFoot: false,
    madeCanasta: false,
    canastaMadeThisTurn: false,
    players: [],
    ourScore: 0,
    ourMelds: [],
    ourCanastas: [],
    ourRedThrees: [],
    otherScore: 0,
    otherMelds: [{ id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 }],
    otherCanastas: [
      {
        id: 2,
        rank: Four,
        cards: Array.from({ length: 7 }, (_, i) => ({ id: 10 + i, suit: Hearts, rank: Four })),
        count: 7,
        natural: true,
      },
    ],
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

describe('OpponentMelds', () => {
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

  it('puts the melds row on the left and the canastas row on the right', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(OpponentMelds, { props: { gameStore } })
    const [meldsRow, canastasRow] = wrapper.findAllComponents(MeldRow)

    expect(meldsRow!.props('groups')).toEqual(gameStore.opponentMelds)
    expect(canastasRow!.props('groups')).toEqual(gameStore.opponentCanastas)
  })

  it('positions the melds band at the left-of-center band and the canastas band at the right-of-center band', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(OpponentMelds, { props: { gameStore } })
    const bands = wrapper.findAll('.fixed.inset-y-0')

    expect(bands).toHaveLength(2)
    expect(bands[0]!.classes()).toContain('left-1/4')
    expect(bands[1]!.classes()).toContain('right-1/4')
  })

  it('renders nothing for either row when the opposing team has no melds or canastas', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ otherMelds: [], otherCanastas: [] }))

    const wrapper = mount(OpponentMelds, { props: { gameStore } })

    wrapper.findAllComponents(MeldRow).forEach((row) => {
      expect(row.props('groups')).toEqual([])
    })
  })

  it('rotates the melds band to match the left opponent and the canastas band to match the right opponent', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(OpponentMelds, { props: { gameStore } })
    const bands = wrapper.findAll('.fixed.inset-y-0')

    // Scoped to the wrapper div specifically (not just any descendant) —
    // the count label inside also carries a rotate class of its own (the
    // opposite one, to counter-rotate back upright), which would
    // otherwise make a broader descendant search ambiguous.
    expect(bands[0]!.find('div.-rotate-90').exists()).toBe(true)
    expect(bands[1]!.find('div.rotate-90').exists()).toBe(true)
    expect(bands[1]!.find('div.-rotate-90').exists()).toBe(false)
  })

  it('tells each row which way to counter-rotate its count label back upright', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(OpponentMelds, { props: { gameStore } })
    const [meldsRow, canastasRow] = wrapper.findAllComponents(MeldRow)

    expect(meldsRow!.props('counterRotate')).toBe('left')
    expect(canastasRow!.props('counterRotate')).toBe('right')
  })
})
