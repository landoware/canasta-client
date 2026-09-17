import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import DemoView from '../DemoView.vue'
import GameView from '../GameView.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import type { StateMessage } from '@/types/protocol'
import { PhasePlaying } from '@/types/canasta'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

// DemoView's initDemo awaits each seat's joinRoom, which only resolves once
// a `welcome` message arrives (see game.ts) — connect() is mocked and never
// delivers one, so tests drive that resolution directly via handleWelcome,
// exactly like a real server's welcome response would.
function completeJoins(seatIndexByInstance: number[]): void {
  seatIndexByInstance.forEach((seatIndex, i) => {
    useGameStore(`demo-${i}`).handleWelcome({
      seatIndex,
      roomCode: 'ABCD',
      roomState: 'playing',
    })
  })
}

function baseState(overrides: Partial<StateMessage> = {}): StateMessage {
  return {
    deckCount: 100,
    discardCount: 1,
    discardTopCard: { id: 99, suit: 0, rank: 0 },
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
    phase: PhasePlaying,
    handNumber: 1,
    gameOver: false,
    canGoOut: false,
    goneDown: false,
    ...overrides,
  }
}

// welcome (completeJoins) only means each seat connected — the room no
// longer auto-starts (see internal/room/lobby.go's applyStartGame), so
// the game doesn't actually begin until every seat is ready and the host
// starts it, which DemoView must drive itself before GameView can mount.
function completeGameStart(seatIndexByInstance: number[]): void {
  seatIndexByInstance.forEach((seatIndex, i) => {
    useGameStore(`demo-${i}`).handleState(baseState({ seatIndex }))
  })
}

// Simulates the server's players_lobby broadcast once every seat has set
// itself ready — delivered to all 4 stores at once, exactly like a real
// broadcast reaches every open connection.
function completeReadyUp(seatIndexByInstance: number[], hostSeatIndex: number): void {
  const seats = seatIndexByInstance.map((seatIndex, i) => ({
    seatIndex,
    name: `Player ${i + 1}`,
    connected: true,
    ready: true,
    isHost: seatIndex === hostSeatIndex,
  }))
  seatIndexByInstance.forEach((_, i) => {
    useGameStore(`demo-${i}`).handlePlayersLobby({ seats })
  })
}

// Each seat gets its own mock so a test can tell which instance sent
// set_ready/start_game — a single shared mock (the old setup) couldn't
// distinguish "seat 0 sent it" from "seat 3 sent it".
const wsMocks = new Map<string, { send: ReturnType<typeof vi.fn> }>()

function wsMockFor(instanceId: string) {
  if (!wsMocks.has(instanceId)) {
    wsMocks.set(instanceId, {
      ws: null,
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      createRoom: vi.fn().mockResolvedValue('ABCD'),
      connect: vi.fn(),
      send: vi.fn(),
      disconnect: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  }
  return wsMocks.get(instanceId)!
}

describe('DemoView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    wsMocks.clear()
    vi.mocked(useWebSocketStore).mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (instanceId) => wsMockFor(instanceId!) as any,
    )
  })

  it('starts controlling whichever seat the demo-0 instance became, regardless of join order', async () => {
    const wrapper = mount(DemoView)
    await flushPromises()
    // demo-0 raced to seat 2, not seat 0 — the pre-existing "never assume
    // SEAT_IDS[i] ends up seated at index i" behavior this preserves.
    completeJoins([2, 0, 3, 1])
    completeReadyUp([2, 0, 3, 1], 2)
    completeGameStart([2, 0, 3, 1])
    await flushPromises()

    expect(wrapper.findComponent(GameView).props('instanceId')).toBe('demo-0')
    expect(wrapper.findComponent(GameView).props('allowSeatSwitch')).toBe(true)
  })

  it('does not render the game board until every seat\'s game state has actually arrived', async () => {
    const wrapper = mount(DemoView)
    await flushPromises()

    // All 4 seats connected (welcome), but no one is ready yet and the
    // server hasn't broadcast `state` — GameView must not mount on
    // welcome alone, or it renders against a null gameState (see
    // DemoView.vue's waitUntilPlaying).
    completeJoins([2, 0, 3, 1])
    await flushPromises()

    expect(wrapper.findComponent(GameView).exists()).toBe(false)
    expect(wrapper.text()).toContain('Starting a game...')

    // Everyone's ready and the host has started the game, but the actual
    // `state` broadcast hasn't landed yet — still must not render.
    completeReadyUp([2, 0, 3, 1], 2)
    await flushPromises()

    expect(wrapper.findComponent(GameView).exists()).toBe(false)

    completeGameStart([2, 0, 3, 1])
    await flushPromises()

    expect(wrapper.findComponent(GameView).exists()).toBe(true)
  })

  it('switches to the instance controlling the clicked seat on select-seat', async () => {
    const wrapper = mount(DemoView)
    await flushPromises()
    completeJoins([2, 0, 3, 1]) // demo-1 is seat 0, demo-3 is seat 1
    completeReadyUp([2, 0, 3, 1], 2)
    completeGameStart([2, 0, 3, 1])
    await flushPromises()

    await wrapper.findComponent(GameView).vm.$emit('select-seat', 0)

    expect(wrapper.findComponent(GameView).props('instanceId')).toBe('demo-1')
  })

  it('readies up every seat and has the host start the game once all seats are ready', async () => {
    mount(DemoView)
    await flushPromises()
    completeJoins([2, 0, 3, 1])
    await flushPromises()

    // Every seat must ready itself up — this is the exact bug reported:
    // without it, no one ever sends set_ready and the room stays in its
    // lobby forever (see internal/room/lobby.go's applySetReady).
    ;[0, 1, 2, 3].forEach((i) => {
      expect(wsMockFor(`demo-${i}`).send).toHaveBeenCalledWith('set_ready', { ready: true })
    })
    ;[0, 1, 2, 3].forEach((i) => {
      expect(wsMockFor(`demo-${i}`).send).not.toHaveBeenCalledWith('start_game', {})
    })

    // demo-0 raced to seat 2 — make seat 2 the host.
    completeReadyUp([2, 0, 3, 1], 2)
    await flushPromises()

    expect(wsMockFor('demo-0').send).toHaveBeenCalledWith('start_game', {})
    ;[1, 2, 3].forEach((i) => {
      expect(wsMockFor(`demo-${i}`).send).not.toHaveBeenCalledWith('start_game', {})
    })
  })

  it('ignores a select-seat for a seat index nothing maps to', async () => {
    const wrapper = mount(DemoView)
    await flushPromises()
    completeJoins([2, 0, 3, 1])
    completeReadyUp([2, 0, 3, 1], 2)
    completeGameStart([2, 0, 3, 1])
    await flushPromises()

    await wrapper.findComponent(GameView).vm.$emit('select-seat', 99)

    expect(wrapper.findComponent(GameView).props('instanceId')).toBe('demo-0')
  })
})
