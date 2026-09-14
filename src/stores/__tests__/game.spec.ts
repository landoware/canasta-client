import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import type { StateMessage, PlayersLobbyPayload, PlayerStatusPayload } from '@/types/protocol'
import { PhaseDrawing } from '@/types/canasta'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

function baseState(overrides: Partial<StateMessage> = {}): StateMessage {
  return {
    deckCount: 100,
    discardCount: 1,
    discardTopCard: { id: 1, suit: 0, rank: 0 },
    name: 'Alice',
    hand: { 1: { id: 1, suit: 0, rank: 0 } },
    hasFoot: false,
    players: [],
    ourScore: 10,
    ourMelds: [],
    ourCanastas: [],
    ourRedThrees: [],
    otherScore: 5,
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

describe('game store', () => {
  let send: ReturnType<typeof vi.fn>
  let connect: ReturnType<typeof vi.fn>
  let createRoomHttp: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()

    send = vi.fn()
    connect = vi.fn()
    createRoomHttp = vi.fn()
    vi.mocked(useWebSocketStore).mockReturnValue({
      ws: null,
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      createRoom: createRoomHttp,
      connect,
      send,
      disconnect: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it('joinRoom connects and resolves once welcome arrives', async () => {
    const store = useGameStore()

    const joinPromise = store.joinRoom('ABC123', 'Alice')
    expect(connect).toHaveBeenCalledWith('ABC123', 'Alice')

    store.handleWelcome({ seatIndex: 2, roomCode: 'ABC123', roomState: 'lobby' })
    await expect(joinPromise).resolves.toBeUndefined()

    expect(store.mySeatIndex).toBe(2)
    expect(store.roomCode).toBe('ABC123')
    expect(localStorage.getItem('canasta_room')).toBe('ABC123')
    expect(localStorage.getItem('canasta_name')).toBe('Alice')
  })

  it('joinRoom rejects when the connection is refused', async () => {
    const store = useGameStore()

    const joinPromise = store.joinRoom('NOPE', 'Alice')
    store.handleJoinFailure('room is full')

    await expect(joinPromise).rejects.toBe('room is full')
  })

  it('createRoom creates over HTTP then joins the returned room code', async () => {
    createRoomHttp.mockResolvedValue('XYZ999')
    const store = useGameStore()

    const createPromise = store.createRoom('Bob')
    await vi.waitFor(() => expect(connect).toHaveBeenCalled())
    store.handleWelcome({ seatIndex: 0, roomCode: 'XYZ999', roomState: 'lobby' })

    await expect(createPromise).resolves.toBe('XYZ999')
    expect(connect).toHaveBeenCalledWith('XYZ999', 'Bob')
  })

  it('handleState flattens the broadcast into gameState and clears pendingMove', () => {
    const store = useGameStore()
    store.pendingMove = true

    store.handleState(baseState())

    expect(store.pendingMove).toBe(false)
    expect(store.isPlaying).toBe(true)
    expect(store.isMyTurn).toBe(true)
    expect(store.currentPhase).toBe(PhaseDrawing)
    expect(store.myHand).toHaveLength(1)
    expect(store.myTeamScore).toBe(10)
    expect(store.opponentScore).toBe(5)
  })

  it('hasGoneDown reflects the server-sent goneDown flag', () => {
    const store = useGameStore()

    store.handleState(baseState({ goneDown: false }))
    expect(store.hasGoneDown).toBe(false)

    store.handleState(baseState({ goneDown: true }))
    expect(store.hasGoneDown).toBe(true)
  })

  it('handNumber reflects the current hand', () => {
    const store = useGameStore()
    store.handleState(baseState({ handNumber: 3 }))
    expect(store.handNumber).toBe(3)
  })

  it('handleState notifies when the hand number changes', () => {
    const store = useGameStore()
    store.handleState(baseState({ handNumber: 1 }))
    store.handleState(baseState({ handNumber: 2 }))

    expect(store.notifications).toContainEqual(expect.stringContaining('Hand 2'))
  })

  it('handlePlayersLobby stores the seat list', () => {
    const store = useGameStore()
    const payload: PlayersLobbyPayload = {
      seats: [
        { seatIndex: 0, name: 'Alice', connected: true },
        { seatIndex: 1, name: '', connected: false },
      ],
    }

    store.handlePlayersLobby(payload)

    expect(store.lobbySeats).toEqual(payload.seats)
  })

  it('handlePlayerStatus adds a notification naming the seat', () => {
    const store = useGameStore()
    store.handlePlayersLobby({ seats: [{ seatIndex: 1, name: 'Bob', connected: true }] })

    const payload: PlayerStatusPayload = { seatIndex: 1, status: 'away' }
    store.handlePlayerStatus(payload)

    expect(store.notifications).toContainEqual(expect.stringContaining('Bob'))
    expect(store.notifications).toContainEqual(expect.stringContaining('away'))
  })

  it.each([
    ['drawFromDeck', () => useGameStore().drawFromDeck(), 'draw_from_deck', {}],
    [
      'pickUpDiscardPile',
      () => useGameStore().pickUpDiscardPile([1, 2]),
      'pick_up_discard_pile',
      { cardIds: [1, 2] },
    ],
    ['newMeld', () => useGameStore().newMeld([1, 2, 3]), 'new_meld', { cardIds: [1, 2, 3] }],
    [
      'addToMeld',
      () => useGameStore().addToMeld([4], 7),
      'add_to_meld',
      { cardIds: [4], meldId: 7 },
    ],
    [
      'burnCards',
      () => useGameStore().burnCards([4], 9),
      'burn_cards',
      { cardIds: [4], canastaId: 9 },
    ],
    ['goDown', () => useGameStore().goDown(), 'go_down', {}],
    ['discard', () => useGameStore().discard(5), 'discard', { cardId: 5 }],
    ['pickUpFoot', () => useGameStore().pickUpFoot(), 'pick_up_foot', {}],
    [
      'playRedThree',
      () => useGameStore().playRedThree([1], true),
      'play_red_three',
      { cardIds: [1], fromFoot: true },
    ],
    [
      'grantPermissionToGoOut',
      () => useGameStore().grantPermissionToGoOut(),
      'grant_permission_to_go_out',
      {},
    ],
  ])('%s sends the matching typed payload', (_name, act, expectedType, expectedData) => {
    act()
    expect(send).toHaveBeenCalledWith(expectedType, expectedData)
  })

  it('refuses to send a second move while one is pending', () => {
    const store = useGameStore()
    store.drawFromDeck()
    store.discard(1)

    expect(send).toHaveBeenCalledTimes(1)
  })

  it('clears pendingMove on a server error, so a rejected move does not block every move after it', () => {
    const store = useGameStore()
    store.drawFromDeck()
    expect(store.pendingMove).toBe(true)

    store.handleServerError({ code: 'SOME_ERROR', message: 'nope' })
    expect(store.pendingMove).toBe(false)

    store.discard(1)
    expect(send).toHaveBeenCalledWith('discard', { cardId: 1 })
  })
})
