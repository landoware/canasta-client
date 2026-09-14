import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OtherPlayers from '../OtherPlayers.vue'
import OtherPlayerHand from '../OtherPlayerHand.vue'
import Button from '@/components/Button.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import type { StateMessage } from '@/types/protocol'
import { PhaseDrawing, Four, Five, Seven, Wild } from '@/types/canasta'

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
    goneDown: false,
    ...overrides,
  }
}

describe('OtherPlayers', () => {
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

  it('threads hasFoot from OtherPlayerState into each OtherPlayerHand', () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
    gameStore.handleState(
      baseState({
        players: [
          { name: 'Seat1', handLength: 10, hasFoot: true },
          { name: 'Seat2', handLength: 11, hasFoot: false },
          { name: 'Seat3', handLength: 12, hasFoot: true },
        ],
      }),
    )

    const wrapper = mount(OtherPlayers, { props: { gameStore } })
    const [top, left, right] = wrapper.findAllComponents(OtherPlayerHand)

    // seat 0 -> left=1 (hasFoot), partner=2 (no foot), right=3 (hasFoot)
    expect(left!.props('hasFoot')).toBe(true)
    expect(top!.props('hasFoot')).toBe(false)
    expect(right!.props('hasFoot')).toBe(true)
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

  it('leaves clickable unset on every OtherPlayerHand by default', () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
    gameStore.handleState(baseState())

    const wrapper = mount(OtherPlayers, { props: { gameStore } })

    wrapper.findAllComponents(OtherPlayerHand).forEach((hand) => {
      expect(hand.props('clickable')).toBeFalsy()
    })
  })

  it('passes clickableNames through to every OtherPlayerHand', () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
    gameStore.handleState(baseState())

    const wrapper = mount(OtherPlayers, { props: { gameStore, clickableNames: true } })

    wrapper.findAllComponents(OtherPlayerHand).forEach((hand) => {
      expect(hand.props('clickable')).toBe(true)
    })
  })

  it('emits select-seat with the clicked player\'s absolute seat index', () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
    gameStore.handleState(baseState())

    const wrapper = mount(OtherPlayers, { props: { gameStore, clickableNames: true } })
    const [top, left, right] = wrapper.findAllComponents(OtherPlayerHand)

    // seat 0 -> left=1, partner(top)=2, right=3
    top!.vm.$emit('select')
    left!.vm.$emit('select')
    right!.vm.$emit('select')

    expect(wrapper.emitted('select-seat')).toEqual([[2], [1], [3]])
  })

  describe('ask to go out', () => {
    const allFourCanastas = [
      { id: 1, rank: Four, cards: [], count: 7, natural: true },
      { id: 2, rank: Five, cards: [], count: 7, natural: false },
      { id: 3, rank: Seven, cards: [], count: 7, natural: true },
      { id: 4, rank: Wild, cards: [], count: 7, natural: false },
    ]

    it('hides the button by default (no canastas)', () => {
      const gameStore = useGameStore()
      gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
      gameStore.handleState(baseState())

      const wrapper = mount(OtherPlayers, { props: { gameStore } })

      expect(wrapper.findComponent(Button).exists()).toBe(false)
    })

    it('shows the button once the team is eligible', () => {
      const gameStore = useGameStore()
      gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
      gameStore.handleState(baseState({ goneDown: true, ourCanastas: allFourCanastas }))

      const wrapper = mount(OtherPlayers, { props: { gameStore } })

      expect(wrapper.findComponent(Button).exists()).toBe(true)
      expect(wrapper.findComponent(Button).props('label')).toBe('Ask to go out')
    })

    it('hides the button once permission has already been granted', () => {
      const gameStore = useGameStore()
      gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
      gameStore.handleState(
        baseState({ goneDown: true, ourCanastas: allFourCanastas, canGoOut: true }),
      )

      const wrapper = mount(OtherPlayers, { props: { gameStore } })

      expect(wrapper.findComponent(Button).exists()).toBe(false)
    })

    it('sends ask_to_go_out through the real store action when clicked', async () => {
      const gameStore = useGameStore()
      gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'playing' })
      gameStore.handleState(baseState({ goneDown: true, ourCanastas: allFourCanastas }))

      const wrapper = mount(OtherPlayers, { props: { gameStore } })
      await wrapper.findComponent(Button).trigger('click')

      expect(send).toHaveBeenCalledWith('ask_to_go_out', {})
    })
  })
})
