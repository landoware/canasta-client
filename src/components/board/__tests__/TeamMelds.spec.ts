import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TeamMelds from '../TeamMelds.vue'
import MeldRow from '../MeldRow.vue'
import Button from '@/components/Button.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import { useSettingsStore, MeldsPositionTop } from '@/stores/settings'
import type { StateMessage } from '@/types/protocol'
import { PhaseDrawing, PhasePlaying, Hearts, Diamonds, Clubs, Four } from '@/types/canasta'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

function baseState(overrides: Partial<StateMessage> = {}): StateMessage {
  return {
    deckCount: 100,
    discardCount: 1,
    discardTopCard: { id: 1, suit: 0, rank: 0 },
    name: 'Alice',
    hand: {
      101: { id: 101, suit: Hearts, rank: Four },
      102: { id: 102, suit: Diamonds, rank: Four },
      103: { id: 103, suit: Clubs, rank: Four },
    },
    hasFoot: false,
    players: [],
    ourScore: 0,
    ourMelds: [{ id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 }],
    ourCanastas: [
      {
        id: 2,
        rank: Four,
        cards: Array.from({ length: 7 }, (_, i) => ({ id: 10 + i, suit: Hearts, rank: Four })),
        count: 7,
        natural: true,
      },
    ],
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

describe('TeamMelds', () => {
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

  it('passes melds and canastas to their own row', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(TeamMelds, { props: { gameStore, selectedCardIds: new Set<number>() } })
    const [first, second] = wrapper.findAllComponents(MeldRow)

    expect(first!.props('groups')).toEqual(gameStore.myTeamMelds)
    expect(second!.props('groups')).toEqual(gameStore.myTeamCanastas)
  })

  it('puts melds at the bottom (near the player) by default', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(TeamMelds, { props: { gameStore, selectedCardIds: new Set<number>() } })
    const containers = wrapper.findAll('.fixed.inset-x-0')

    expect(containers[0]!.classes()).toContain('top-3/4')
    expect(containers[1]!.classes()).toContain('top-1/4')
  })

  it('swaps positions when meldsPosition is set to top', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())
    useSettingsStore().meldsPosition = MeldsPositionTop

    const wrapper = mount(TeamMelds, { props: { gameStore, selectedCardIds: new Set<number>() } })
    const containers = wrapper.findAll('.fixed.inset-x-0')

    expect(containers[0]!.classes()).toContain('top-1/4')
    expect(containers[1]!.classes()).toContain('top-3/4')
  })

  it('shows the create-meld affordance only on the melds row when the selection is a valid meld', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying }))

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set([101, 102, 103]) },
    })
    const [meldsRow, canastasRow] = wrapper.findAllComponents(MeldRow)

    expect(meldsRow!.props('showCreateAffordance')).toBe(true)
    expect(canastasRow!.props('showCreateAffordance')).toBe(false)
  })

  it('hides the create-meld affordance when the selection is invalid', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying }))

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set([101, 102]) }, // only 2 cards
    })

    expect(wrapper.findComponent(MeldRow).props('showCreateAffordance')).toBe(false)
  })

  it('hides the create-meld affordance when it is not this seat\'s turn to play', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhaseDrawing }))

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set([101, 102, 103]) },
    })

    expect(wrapper.findComponent(MeldRow).props('showCreateAffordance')).toBe(false)
  })

  it('creates the meld through the real store action and emits melded when the tile is clicked', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying }))

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set([101, 102, 103]) },
    })
    wrapper.findComponent(MeldRow).vm.$emit('create')

    expect(send).toHaveBeenCalledWith('new_meld', { cardIds: [101, 102, 103] })
    expect(wrapper.emitted('melded')).toHaveLength(1)
  })

  it('dims the melds row (never the canastas row) while the team has not gone down', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ goneDown: false }))

    const wrapper = mount(TeamMelds, { props: { gameStore, selectedCardIds: new Set<number>() } })
    const [meldsRow, canastasRow] = wrapper.findAllComponents(MeldRow)

    expect(meldsRow!.props('dimmed')).toBe(true)
    expect(canastasRow!.props('dimmed')).toBe(false)
  })

  it('does not dim the melds row once the team has gone down', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ goneDown: true }))

    const wrapper = mount(TeamMelds, { props: { gameStore, selectedCardIds: new Set<number>() } })

    expect(wrapper.findComponent(MeldRow).props('dimmed')).toBe(false)
  })

  it('shows Go down once staged melds meet the hand-1 threshold (50pts) and it is playing phase', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        handNumber: 1,
        ourMelds: [
          {
            id: 1,
            rank: Four,
            cards: Array.from({ length: 10 }, (_, i) => ({ id: 900 + i, suit: Hearts, rank: Four })),
            wildCount: 0,
          },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, { props: { gameStore, selectedCardIds: new Set<number>() } })

    expect(wrapper.findComponent(Button).exists()).toBe(true)
  })

  it('hides Go down when staged melds fall short of the threshold', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying, handNumber: 1 })) // default meld is only 5pts

    const wrapper = mount(TeamMelds, { props: { gameStore, selectedCardIds: new Set<number>() } })

    expect(wrapper.findComponent(Button).exists()).toBe(false)
  })

  it('hides Go down once the team has already gone down', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        handNumber: 1,
        goneDown: true,
        ourMelds: [
          {
            id: 1,
            rank: Four,
            cards: Array.from({ length: 10 }, (_, i) => ({ id: 900 + i, suit: Hearts, rank: Four })),
            wildCount: 0,
          },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, { props: { gameStore, selectedCardIds: new Set<number>() } })

    expect(wrapper.findComponent(Button).exists()).toBe(false)
  })

  it('calls the real goDown store action when Go down is clicked', async () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        handNumber: 1,
        ourMelds: [
          {
            id: 1,
            rank: Four,
            cards: Array.from({ length: 10 }, (_, i) => ({ id: 900 + i, suit: Hearts, rank: Four })),
            wildCount: 0,
          },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, { props: { gameStore, selectedCardIds: new Set<number>() } })
    await wrapper.findComponent(Button).trigger('click')

    expect(send).toHaveBeenCalledWith('go_down', {})
  })

  it('marks a staging meld clickable when the selection is valid for it', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        goneDown: false,
        ourMelds: [{ id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 }],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set([101]) }, // a Four, matches the staging meld
    })
    const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

    expect(meldsRow.props('clickableGroupIds')).toEqual(new Set([1]))
  })

  it('marks an official meld clickable the same way once the team has gone down', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        goneDown: true,
        ourMelds: [{ id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 }],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set([101]) },
    })
    const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

    expect(meldsRow.props('clickableGroupIds')).toEqual(new Set([1]))
  })

  it('hides clickability when the selection does not match the meld rank', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        ourMelds: [{ id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 }],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set<number>() }, // nothing selected
    })
    const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

    expect(meldsRow.props('clickableGroupIds')).toEqual(new Set())
  })

  it('hides clickability when it is not this seat\'s turn to play', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhaseDrawing,
        ourMelds: [{ id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 }],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set([101]) },
    })
    const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

    expect(meldsRow.props('clickableGroupIds')).toEqual(new Set())
  })

  it('adds to the meld through the real store action and emits melded when the tile is selected', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        ourMelds: [{ id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 }],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set([101]) },
    })
    wrapper.findAllComponents(MeldRow)[0]!.vm.$emit('select-group', 1)

    expect(send).toHaveBeenCalledWith('add_to_meld', { cardIds: [101], meldId: 1 })
    expect(wrapper.emitted('melded')).toHaveLength(1)
  })

  it('ignores select-group for a meld id that is not actually clickable', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        ourMelds: [{ id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 }],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: { gameStore, selectedCardIds: new Set<number>() }, // nothing selected, so meld 1 isn't clickable
    })
    wrapper.findAllComponents(MeldRow)[0]!.vm.$emit('select-group', 1)

    expect(send).not.toHaveBeenCalled()
    expect(wrapper.emitted('melded')).toBeUndefined()
  })
})
