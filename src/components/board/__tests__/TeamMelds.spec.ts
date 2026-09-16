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
import {
  PhaseDrawing,
  PhasePlaying,
  Hearts,
  Diamonds,
  Clubs,
  Four,
  Five,
  Seven,
  Eight,
  Queen,
  King,
  Two,
  Wild,
  Three,
} from '@/types/canasta'

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
    madeCanasta: false,
    canastaMadeThisTurn: false,
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

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const [first, second] = wrapper.findAllComponents(MeldRow)

    expect(first!.props('groups')).toEqual(gameStore.myTeamMelds)
    expect(second!.props('groups')).toEqual(gameStore.myTeamCanastas)
  })

  it('puts melds at the bottom (near the player) by default', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const containers = wrapper.findAll('.fixed.inset-x-0')

    expect(containers[0]!.classes()).toContain('top-3/4')
    expect(containers[1]!.classes()).toContain('top-1/4')
  })

  it('swaps positions when meldsPosition is set to top', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState())
    useSettingsStore().meldsPosition = MeldsPositionTop

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const containers = wrapper.findAll('.fixed.inset-x-0')

    expect(containers[0]!.classes()).toContain('top-1/4')
    expect(containers[1]!.classes()).toContain('top-3/4')
  })

  it('shows the create-meld affordance only on the melds row when the selection is a valid meld', () => {
    const gameStore = useGameStore()
    // canGoOut: true since this selection plays the entire 3-card hand
    // — see the "would strand the hand" tests below for that dimension.
    gameStore.handleState(baseState({ phase: PhasePlaying, canGoOut: true }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101, 102, 103]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const [meldsRow, canastasRow] = wrapper.findAllComponents(MeldRow)

    expect(meldsRow!.props('showCreateAffordance')).toBe(true)
    expect(canastasRow!.props('showCreateAffordance')).toBe(false)
  })

  it('hides the create-meld affordance when the selection is invalid', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101, 102]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      }, // only 2 cards
    })

    expect(wrapper.findComponent(MeldRow).props('showCreateAffordance')).toBe(false)
  })

  it("hides the create-meld affordance when it is not this seat's turn at all", () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ isYourTurn: false }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101, 102, 103]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })

    expect(wrapper.findComponent(MeldRow).props('showCreateAffordance')).toBe(false)
  })

  // New meld/add-to-meld may now also run during the draw phase, but only
  // while staging (before going down) — see dispatch.go's
  // meldAllowedInDrawPhase carve-out.
  it('shows the create-meld affordance during the draw phase while still staging (not gone down)', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhaseDrawing, goneDown: false, canGoOut: true }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101, 102, 103]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })

    expect(wrapper.findComponent(MeldRow).props('showCreateAffordance')).toBe(true)
  })

  it('hides the create-meld affordance during the draw phase once the team has gone down', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhaseDrawing, goneDown: true }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101, 102, 103]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })

    expect(wrapper.findComponent(MeldRow).props('showCreateAffordance')).toBe(false)
  })

  it('creates the meld through the real store action and emits melded when the tile is clicked', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying, canGoOut: true }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101, 102, 103]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    wrapper.findComponent(MeldRow).vm.$emit('create')

    expect(send).toHaveBeenCalledWith('new_meld', { cardIds: [101, 102, 103] })
    expect(wrapper.emitted('melded')).toHaveLength(1)
  })

  it('dims the melds row (never the canastas row) while the team has not gone down', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ goneDown: false }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const [meldsRow, canastasRow] = wrapper.findAllComponents(MeldRow)

    expect(meldsRow!.props('dimmed')).toBe(true)
    expect(canastasRow!.props('dimmed')).toBe(false)
  })

  it('does not dim the melds row once the team has gone down', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ goneDown: true }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })

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
            cards: Array.from({ length: 10 }, (_, i) => ({
              id: 900 + i,
              suit: Hearts,
              rank: Four,
            })),
            wildCount: 0,
          },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })

    expect(wrapper.findComponent(Button).exists()).toBe(true)
  })

  it('hides Go down when staged melds fall short of the threshold', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying, handNumber: 1 })) // default meld is only 5pts

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })

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
            cards: Array.from({ length: 10 }, (_, i) => ({
              id: 900 + i,
              suit: Hearts,
              rank: Four,
            })),
            wildCount: 0,
          },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })

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
            cards: Array.from({ length: 10 }, (_, i) => ({
              id: 900 + i,
              suit: Hearts,
              rank: Four,
            })),
            wildCount: 0,
          },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    await wrapper.findComponent(Button).trigger('click')

    expect(send).toHaveBeenCalledWith('go_down', {})
  })

  it('marks a staging meld clickable when the selection is valid for it', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        goneDown: false,
        ourMelds: [
          { id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      }, // a Four, matches the staging meld
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
        ourMelds: [
          { id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

    expect(meldsRow.props('clickableGroupIds')).toEqual(new Set([1]))
  })

  it('hides clickability when the selection does not match the meld rank', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        ourMelds: [
          { id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      }, // nothing selected
    })
    const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

    expect(meldsRow.props('clickableGroupIds')).toEqual(new Set())
  })

  it("hides clickability when it is not this seat's turn at all", () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        isYourTurn: false,
        ourMelds: [
          { id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

    expect(meldsRow.props('clickableGroupIds')).toEqual(new Set())
  })

  it('shows clickability during the draw phase while still staging (not gone down)', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhaseDrawing,
        goneDown: false,
        ourMelds: [
          { id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

    expect(meldsRow.props('clickableGroupIds')).toEqual(new Set([1]))
  })

  it('hides clickability during the draw phase once the team has gone down', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhaseDrawing,
        goneDown: true,
        ourMelds: [
          { id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

    expect(meldsRow.props('clickableGroupIds')).toEqual(new Set())
  })

  it('adds to the meld through the real store action and emits melded when the tile is selected', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({
        phase: PhasePlaying,
        ourMelds: [
          { id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
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
        ourMelds: [
          { id: 1, rank: Four, cards: [{ id: 2, suit: Hearts, rank: Four }], wildCount: 0 },
        ],
      }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      }, // nothing selected, so meld 1 isn't clickable
    })
    wrapper.findAllComponents(MeldRow)[0]!.vm.$emit('select-group', 1)

    expect(send).not.toHaveBeenCalled()
    expect(wrapper.emitted('melded')).toBeUndefined()
  })

  it('marks a canasta clickable when the selection is a valid burn for it', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      }, // a Four, matches the default canasta
    })
    const canastasRow = wrapper.findAllComponents(MeldRow)[1]!

    expect(canastasRow.props('clickableGroupIds')).toEqual(new Set([2]))
  })

  it('hides canasta clickability when the selection does not match the canasta rank', () => {
    const gameStore = useGameStore()
    gameStore.handleState(
      baseState({ phase: PhasePlaying, hand: { 201: { id: 201, suit: Hearts, rank: Eight } } }),
    )

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([201]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const canastasRow = wrapper.findAllComponents(MeldRow)[1]!

    expect(canastasRow.props('clickableGroupIds')).toEqual(new Set())
  })

  it("hides canasta clickability when it is not this seat's turn to play", () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhaseDrawing }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    const canastasRow = wrapper.findAllComponents(MeldRow)[1]!

    expect(canastasRow.props('clickableGroupIds')).toEqual(new Set())
  })

  it('burns through the real store action and emits melded when the canasta tile is selected', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set([101]),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      },
    })
    wrapper.findAllComponents(MeldRow)[1]!.vm.$emit('select-group', 2)

    expect(send).toHaveBeenCalledWith('burn_cards', { cardIds: [101], canastaId: 2 })
    expect(wrapper.emitted('melded')).toHaveLength(1)
  })

  it('ignores select-group for a canasta id that is not actually clickable', () => {
    const gameStore = useGameStore()
    gameStore.handleState(baseState({ phase: PhasePlaying }))

    const wrapper = mount(TeamMelds, {
      props: {
        gameStore,
        selectedCardIds: new Set<number>(),
        displayMelds: gameStore.myTeamMelds,
        displayCanastas: gameStore.myTeamCanastas,
        displayRedThrees: gameStore.myRedThrees,
      }, // nothing selected, so canasta 2 isn't clickable
    })
    wrapper.findAllComponents(MeldRow)[1]!.vm.$emit('select-group', 2)

    expect(send).not.toHaveBeenCalled()
    expect(wrapper.emitted('melded')).toBeUndefined()
  })

  describe('hand stranding', () => {
    // Default hand is exactly 3 cards (101-103, all Fours) — playing all
    // 3 for a new meld, or 2 of them onto the default meld/canasta
    // (also rank Four), would leave 0 or 1 cards respectively without
    // go-out permission.
    it('hides the create-meld affordance when playing the whole hand without go-out permission', () => {
      const gameStore = useGameStore()
      gameStore.handleState(baseState({ phase: PhasePlaying, canGoOut: false }))

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([101, 102, 103]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })

      expect(wrapper.findComponent(MeldRow).props('showCreateAffordance')).toBe(false)
    })

    it('shows the create-meld affordance for the same selection once granted permission', () => {
      const gameStore = useGameStore()
      gameStore.handleState(baseState({ phase: PhasePlaying, canGoOut: true }))

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([101, 102, 103]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })

      expect(wrapper.findComponent(MeldRow).props('showCreateAffordance')).toBe(true)
    })

    it('hides add-to-meld clickability when it would strand the hand', () => {
      const gameStore = useGameStore()
      gameStore.handleState(baseState({ phase: PhasePlaying, canGoOut: false }))

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([101, 102]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

      expect(meldsRow.props('clickableGroupIds')).toEqual(new Set())
    })

    it('shows add-to-meld clickability for the same selection once granted permission', () => {
      const gameStore = useGameStore()
      gameStore.handleState(baseState({ phase: PhasePlaying, canGoOut: true }))

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([101, 102]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

      expect(meldsRow.props('clickableGroupIds')).toEqual(new Set([1]))
    })

    it('hides burn clickability when it would strand the hand', () => {
      const gameStore = useGameStore()
      gameStore.handleState(baseState({ phase: PhasePlaying, canGoOut: false }))

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([101, 102]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const canastasRow = wrapper.findAllComponents(MeldRow)[1]!

      expect(canastasRow.props('clickableGroupIds')).toEqual(new Set())
    })

    it('shows burn clickability for the same selection once granted permission', () => {
      const gameStore = useGameStore()
      gameStore.handleState(baseState({ phase: PhasePlaying, canGoOut: true }))

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([101, 102]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const canastasRow = wrapper.findAllComponents(MeldRow)[1]!

      expect(canastasRow.props('clickableGroupIds')).toEqual(new Set([2]))
    })
  })

  describe('completing the last required canasta type despite stranding the hand', () => {
    // Mirrors the reported edge case exactly: a 2-card hand (King + a
    // wildcard Two), adding the wildcard to an existing 6-card Queens
    // meld completes the team's last required (unnatural) canasta type.
    const queensMeld = {
      id: 1,
      rank: Queen,
      cards: Array.from({ length: 6 }, (_, i) => ({ id: 900 + i, suit: Hearts, rank: Queen })),
      wildCount: 0,
    }
    const canasta = (id: number, rank: number, natural: boolean) => ({
      id,
      rank,
      cards: Array.from({ length: 7 }, (_, i) => ({ id: id * 100 + i, suit: Hearts, rank })),
      count: 7,
      natural,
    })
    const missingOnlyUnnatural = [
      canasta(10, Four, true),
      canasta(11, Seven, true),
      canasta(12, Wild, false),
    ]
    const twoCardHand = {
      500: { id: 500, suit: Clubs, rank: King },
      501: { id: 501, suit: Wild, rank: Two },
    }

    it('shows add-to-meld clickability when it completes the last required canasta type, leaving exactly one card', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhasePlaying,
          goneDown: true,
          canGoOut: false,
          hand: twoCardHand,
          ourMelds: [queensMeld],
          ourCanastas: missingOnlyUnnatural,
        }),
      )

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([501]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

      expect(meldsRow.props('clickableGroupIds')).toEqual(new Set([1]))
    })

    it('hides add-to-meld clickability when the completed canasta does not fill a missing bucket', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhasePlaying,
          goneDown: true,
          canGoOut: false,
          hand: {
            500: { id: 500, suit: Clubs, rank: King },
            501: { id: 501, suit: Diamonds, rank: Queen },
          },
          ourMelds: [queensMeld],
          // Missing sevens instead — completing a (still-natural) Queens
          // canasta doesn't help.
          ourCanastas: [
            canasta(10, Four, true),
            canasta(11, Five, false),
            canasta(12, Wild, false),
          ],
        }),
      )

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([501]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

      expect(meldsRow.props('clickableGroupIds')).toEqual(new Set())
    })

    it('hides add-to-meld clickability when it would leave zero cards, even completing the last required type', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhasePlaying,
          goneDown: true,
          canGoOut: false,
          hand: { 501: { id: 501, suit: Wild, rank: Two } }, // only the wildcard, no spare King
          ourMelds: [queensMeld],
          ourCanastas: missingOnlyUnnatural,
        }),
      )

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([501]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const meldsRow = wrapper.findAllComponents(MeldRow)[0]!

      expect(meldsRow.props('clickableGroupIds')).toEqual(new Set())
    })
  })

  describe('red threes', () => {
    it('shows the red-threes pile as an extra tile in the canastas row when the team holds any', () => {
      const gameStore = useGameStore()
      gameStore.handleState(baseState({ ourRedThrees: [{ id: 500, suit: Hearts, rank: Three }] }))

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set<number>(),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const canastasRow = wrapper.findAllComponents(MeldRow)[1]!

      expect(canastasRow.props('groups')).toEqual([
        ...gameStore.myTeamCanastas,
        { id: -1, cards: [{ id: 500, suit: Hearts, rank: Three }] },
      ])
    })

    it('omits the red-threes tile when the team holds none', () => {
      const gameStore = useGameStore()
      gameStore.handleState(baseState({ ourRedThrees: [] }))

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set<number>(),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const canastasRow = wrapper.findAllComponents(MeldRow)[1]!

      expect(canastasRow.props('groups')).toEqual(gameStore.myTeamCanastas)
    })

    it('shows the create affordance only when the whole selection is red threes, in the drawing phase', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhaseDrawing,
          hand: { 201: { id: 201, suit: Hearts, rank: Three } },
        }),
      )

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([201]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      const canastasRow = wrapper.findAllComponents(MeldRow)[1]!

      expect(canastasRow.props('showCreateAffordance')).toBe(true)
    })

    it('hides the create affordance when nothing, or something other than a red three, is selected', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhaseDrawing,
          hand: {
            201: { id: 201, suit: Hearts, rank: Three },
            202: { id: 202, suit: Hearts, rank: Four },
          },
        }),
      )

      const none = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set<number>(),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      expect(none.findAllComponents(MeldRow)[1]!.props('showCreateAffordance')).toBe(false)

      const wrongCard = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([202]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      expect(wrongCard.findAllComponents(MeldRow)[1]!.props('showCreateAffordance')).toBe(false)

      const mixed = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([201, 202]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      expect(mixed.findAllComponents(MeldRow)[1]!.props('showCreateAffordance')).toBe(false)
    })

    it('hides the create affordance outside the drawing phase, even with a valid selection', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhasePlaying,
          hand: { 201: { id: 201, suit: Hearts, rank: Three } },
        }),
      )

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([201]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })

      expect(wrapper.findAllComponents(MeldRow)[1]!.props('showCreateAffordance')).toBe(false)
    })

    it('plays the selected red three(s) through the real store action and emits melded when the tile is clicked', () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhaseDrawing,
          hand: { 201: { id: 201, suit: Hearts, rank: Three } },
        }),
      )

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([201]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      wrapper.findAllComponents(MeldRow)[1]!.vm.$emit('create')

      expect(send).toHaveBeenCalledWith('play_red_three', { cardIds: [201], fromFoot: false })
      expect(wrapper.emitted('melded')).toHaveLength(1)
    })

    it('auto-draws once no red three remains in hand after this client played one', async () => {
      const gameStore = useGameStore()
      gameStore.handleState(
        baseState({
          phase: PhaseDrawing,
          hand: { 201: { id: 201, suit: Hearts, rank: Three } },
        }),
      )

      const wrapper = mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set([201]),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })
      wrapper.findAllComponents(MeldRow)[1]!.vm.$emit('create')
      expect(send).toHaveBeenCalledWith('play_red_three', { cardIds: [201], fromFoot: false })

      // Simulate the server's response: the three is gone from hand, a
      // fresh (non-three) replacement is in, still the drawing phase.
      gameStore.handleState(
        baseState({
          phase: PhaseDrawing,
          hand: { 210: { id: 210, suit: Hearts, rank: Four } },
        }),
      )
      await wrapper.vm.$nextTick()

      expect(send).toHaveBeenCalledWith('draw_from_deck', {})
    })

    it('does not auto-draw just because a turn starts with no red threes in hand', () => {
      const gameStore = useGameStore()
      gameStore.handleState(baseState({ phase: PhaseDrawing, hand: {} }))

      mount(TeamMelds, {
        props: {
          gameStore,
          selectedCardIds: new Set<number>(),
          displayMelds: gameStore.myTeamMelds,
          displayCanastas: gameStore.myTeamCanastas,
          displayRedThrees: gameStore.myRedThrees,
        },
      })

      expect(send).not.toHaveBeenCalled()
    })
  })
})
