import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import type {
  StateMessage,
  PlayersLobbyPayload,
  PlayerStatusPayload,
  GoOutRequestedPayload,
} from '@/types/protocol'
import { PhaseDrawing, Four, Five, Seven, Wild } from '@/types/canasta'

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
    madeCanasta: false,
    canastaMadeThisTurn: false,
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

  it('canAskToGoOut is true only once gone down, not yet granted, with all four required canastas', () => {
    const store = useGameStore()
    const natural = { id: 1, rank: Four, cards: [], count: 7, natural: true }
    const unnatural = { id: 2, rank: Five, cards: [], count: 7, natural: false }
    const sevens = { id: 3, rank: Seven, cards: [], count: 7, natural: true }
    const wildcards = { id: 4, rank: Wild, cards: [], count: 7, natural: false }
    const allFour = [natural, unnatural, sevens, wildcards]

    store.handleState(baseState({ goneDown: false, ourCanastas: allFour }))
    expect(store.canAskToGoOut).toBe(false) // not gone down

    store.handleState(baseState({ goneDown: true, ourCanastas: [natural, unnatural, sevens] }))
    expect(store.canAskToGoOut).toBe(false) // missing the wildcards canasta

    store.handleState(baseState({ goneDown: true, ourCanastas: allFour, canGoOut: true }))
    expect(store.canAskToGoOut).toBe(false) // already granted

    store.handleState(baseState({ goneDown: true, ourCanastas: allFour, canGoOut: false }))
    expect(store.canAskToGoOut).toBe(true)
  })

  it('handleGoOutRequested sets goOutRequest with the asker\'s name', () => {
    const store = useGameStore()
    expect(store.goOutRequest).toBeNull()

    const payload: GoOutRequestedPayload = { askerName: 'Bob' }
    store.handleGoOutRequested(payload)

    expect(store.goOutRequest).toEqual({ askerName: 'Bob' })
  })

  it('respondToGoOutRequest(true) grants permission and clears the request', () => {
    const store = useGameStore()
    store.handleGoOutRequested({ askerName: 'Bob' })

    store.respondToGoOutRequest(true)

    expect(send).toHaveBeenCalledWith('grant_permission_to_go_out', {})
    expect(store.goOutRequest).toBeNull()
  })

  it('respondToGoOutRequest(false) just clears the request, with no server call', () => {
    const store = useGameStore()
    store.handleGoOutRequested({ askerName: 'Bob' })

    store.respondToGoOutRequest(false)

    expect(send).not.toHaveBeenCalled()
    expect(store.goOutRequest).toBeNull()
  })

  it('myHasFoot reflects the server-sent hasFoot flag', () => {
    const store = useGameStore()

    store.handleState(baseState({ hasFoot: true }))
    expect(store.myHasFoot).toBe(true)

    store.handleState(baseState({ hasFoot: false }))
    expect(store.myHasFoot).toBe(false)
  })

  it('myMadeCanasta reflects the server-sent madeCanasta flag', () => {
    const store = useGameStore()

    store.handleState(baseState({ madeCanasta: false }))
    expect(store.myMadeCanasta).toBe(false)

    store.handleState(baseState({ madeCanasta: true }))
    expect(store.myMadeCanasta).toBe(true)
  })

  it('myCanastaMadeThisTurn reflects the server-sent canastaMadeThisTurn flag', () => {
    const store = useGameStore()

    store.handleState(baseState({ canastaMadeThisTurn: true }))
    expect(store.myCanastaMadeThisTurn).toBe(true)

    store.handleState(baseState({ canastaMadeThisTurn: false }))
    expect(store.myCanastaMadeThisTurn).toBe(false)
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
        { seatIndex: 0, name: 'Alice', connected: true, ready: true, isHost: true },
        { seatIndex: 1, name: '', connected: false, ready: false, isHost: false },
      ],
    }

    store.handlePlayersLobby(payload)

    expect(store.lobbySeats).toEqual(payload.seats)
  })

  it('handlePlayerStatus adds a notification naming the seat', () => {
    const store = useGameStore()
    store.handlePlayersLobby({
      seats: [{ seatIndex: 1, name: 'Bob', connected: true, ready: false, isHost: false }],
    })

    const payload: PlayerStatusPayload = { seatIndex: 1, status: 'away' }
    store.handlePlayerStatus(payload)

    expect(store.notifications).toContainEqual(expect.stringContaining('Bob'))
    expect(store.notifications).toContainEqual(expect.stringContaining('away'))
  })

  it('myIsHost/myIsReady reflect the lobby seat matching mySeatIndex', () => {
    const store = useGameStore()
    store.handleWelcome({ seatIndex: 1, roomCode: 'ABC123', roomState: 'lobby' })
    store.handlePlayersLobby({
      seats: [
        { seatIndex: 0, name: 'Alice', connected: true, ready: true, isHost: true },
        { seatIndex: 1, name: 'Bob', connected: true, ready: false, isHost: false },
      ],
    })

    expect(store.myIsHost).toBe(false)
    expect(store.myIsReady).toBe(false)

    store.handlePlayersLobby({
      seats: [
        { seatIndex: 0, name: 'Alice', connected: true, ready: true, isHost: true },
        { seatIndex: 1, name: 'Bob', connected: true, ready: true, isHost: false },
      ],
    })
    expect(store.myIsReady).toBe(true)
  })

  it('lobbySeatsFull/lobbyAllReady/canStartGame require all 4 seats named and ready, and host to start', () => {
    const store = useGameStore()
    store.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'lobby' })

    store.handlePlayersLobby({
      seats: [
        { seatIndex: 0, name: 'Alice', connected: true, ready: true, isHost: true },
        { seatIndex: 1, name: 'Bob', connected: true, ready: false, isHost: false },
      ],
    })
    expect(store.lobbySeatsFull).toBe(false)
    expect(store.canStartGame).toBe(false)

    store.handlePlayersLobby({
      seats: [
        { seatIndex: 0, name: 'Alice', connected: true, ready: true, isHost: true },
        { seatIndex: 1, name: 'Bob', connected: true, ready: false, isHost: false },
        { seatIndex: 2, name: 'Carol', connected: true, ready: true, isHost: false },
        { seatIndex: 3, name: 'Dave', connected: true, ready: true, isHost: false },
      ],
    })
    expect(store.lobbySeatsFull).toBe(true)
    expect(store.lobbyAllReady).toBe(false)
    expect(store.canStartGame).toBe(false)

    store.handlePlayersLobby({
      seats: [
        { seatIndex: 0, name: 'Alice', connected: true, ready: true, isHost: true },
        { seatIndex: 1, name: 'Bob', connected: true, ready: true, isHost: false },
        { seatIndex: 2, name: 'Carol', connected: true, ready: true, isHost: false },
        { seatIndex: 3, name: 'Dave', connected: true, ready: true, isHost: false },
      ],
    })
    expect(store.lobbyAllReady).toBe(true)
    expect(store.canStartGame).toBe(true)
  })

  it('handleState updates mySeatIndex to the broadcast table position', () => {
    const store = useGameStore()
    store.handleWelcome({ seatIndex: 0, roomCode: 'ABC123', roomState: 'lobby' })
    expect(store.mySeatIndex).toBe(0)

    store.handleState(baseState({ seatIndex: 2 }))
    expect(store.mySeatIndex).toBe(2)
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
    ['askToGoOut', () => useGameStore().askToGoOut(), 'ask_to_go_out', {}],
  ])('%s sends the matching typed payload', (_name, act, expectedType, expectedData) => {
    act()
    expect(send).toHaveBeenCalledWith(expectedType, expectedData)
  })

  it.each([
    ['setReady', () => useGameStore().setReady(true), 'set_ready', { ready: true }],
    [
      'reorderSeats',
      () => useGameStore().reorderSeats([1, 0, 2, 3]),
      'reorder_seats',
      { order: [1, 0, 2, 3] },
    ],
    ['startGame', () => useGameStore().startGame(), 'start_game', {}],
  ])('%s sends the matching typed payload, bypassing pendingMove', (_name, act, expectedType, expectedData) => {
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
