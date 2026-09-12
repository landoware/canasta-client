import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  WelcomePayload,
  StateMessage,
  PlayersLobbyPayload,
  LobbySeat,
  PlayerStatusPayload,
  ErrorPayload,
} from '@/types/protocol'
import {
  TypeDrawFromDeck,
  TypePickUpDiscardPile,
  TypeNewMeld,
  TypeAddToMeld,
  TypeBurnCards,
  TypeGoDown,
  TypeDiscard,
  TypePickUpFoot,
  TypePlayRedThree,
  TypeGrantPermissionToGoOut,
} from '@/types/protocol'
import type { Card, Meld, Canasta } from '@/types/canasta'
import { PhaseDrawing, PhasePlaying } from '@/types/canasta'
import { useWebSocketStore } from './websocket'

const NAME_STORAGE_KEY = 'canasta_name'
const ROOM_STORAGE_KEY = 'canasta_room'

export const useGameStore = defineStore('game', () => {
  // ============================================================================
  // STATE
  // ============================================================================

  // There's no server credential anymore (see internal/room.Room.Join) —
  // name + roomCode are only persisted so the join form can pre-fill and a
  // dropped connection can be resumed with the same identity.
  const playerName: Ref<string | null> = ref(localStorage.getItem(NAME_STORAGE_KEY))
  const roomCode: Ref<string | null> = ref(localStorage.getItem(ROOM_STORAGE_KEY))
  const mySeatIndex: Ref<number | null> = ref(null)

  const lobbySeats: Ref<LobbySeat[]> = ref([])
  const gameState: Ref<StateMessage | null> = ref(null)

  const errors: Ref<string[]> = ref([])
  const notifications: Ref<string[]> = ref([])

  const pendingMove: Ref<boolean> = ref(false)

  let pendingJoin: { resolve: () => void; reject: (message: string) => void } | null = null

  // ============================================================================
  // COMPUTED
  // ============================================================================

  // The room is "playing" the moment the first state broadcast arrives —
  // there's no separate game_started message (see internal/room.Room).
  const isPlaying: ComputedRef<boolean> = computed(() => gameState.value !== null)

  const isInLobby: ComputedRef<boolean> = computed(() => !isPlaying.value)

  const isGameOver: ComputedRef<boolean> = computed(() => gameState.value?.gameOver ?? false)

  const winner: ComputedRef<string | undefined> = computed(() => gameState.value?.winner)

  const isMyTurn: ComputedRef<boolean> = computed(() => gameState.value?.isYourTurn ?? false)

  const currentPhase: ComputedRef<string | undefined> = computed(() => gameState.value?.phase)

  const myHand: ComputedRef<Card[]> = computed(() => {
    const hand = gameState.value?.hand
    if (!hand) return []
    return Object.values(hand)
  })

  const myTeamScore: ComputedRef<number> = computed(() => gameState.value?.ourScore ?? 0)

  const opponentScore: ComputedRef<number> = computed(() => gameState.value?.otherScore ?? 0)

  const myTeamMelds: ComputedRef<Meld[]> = computed(() => gameState.value?.ourMelds ?? [])

  const myTeamCanastas: ComputedRef<Canasta[]> = computed(() => gameState.value?.ourCanastas ?? [])

  const canDraw: ComputedRef<boolean> = computed(
    () => isMyTurn.value && currentPhase.value === PhaseDrawing && !pendingMove.value,
  )

  const canPlay: ComputedRef<boolean> = computed(
    () => isMyTurn.value && currentPhase.value === PhasePlaying && !pendingMove.value,
  )

  // Whether MY team currently has permission to go out — granted by my
  // partner via grantPermissionToGoOut(), not a formal request/response
  // (the server has no "request" notification; see internal/protocol).
  const canGoOut: ComputedRef<boolean> = computed(() => gameState.value?.canGoOut ?? false)

  const discardTopCard: ComputedRef<Card | undefined> = computed(
    () => gameState.value?.discardTopCard,
  )

  const deckCount: ComputedRef<number> = computed(() => gameState.value?.deckCount ?? 0)

  // ============================================================================
  // ACTIONS - Lobby
  // ============================================================================

  // createRoom creates a new room over HTTP, then joins the first seat.
  // Resolves once the server accepts the join (a `welcome` message
  // arrives); rejects if the connection is refused.
  const createRoom = async (name: string): Promise<string> => {
    const ws = useWebSocketStore()
    const code = await ws.createRoom()
    await joinRoom(code, name)
    return code
  }

  // joinRoom connects directly to an existing room — no separate "join"
  // message, the connection itself (with ?name=) is the join. Resolves
  // once the server accepts it (a `welcome` message arrives); rejects if
  // the connection is refused (blank name, full room, unknown room code).
  const joinRoom = (code: string, name: string): Promise<void> => {
    playerName.value = name
    localStorage.setItem(NAME_STORAGE_KEY, name)

    return new Promise((resolve, reject) => {
      pendingJoin = { resolve, reject }
      const ws = useWebSocketStore()
      ws.connect(code, name)
    })
  }

  // ============================================================================
  // ACTIONS - Gameplay
  // ============================================================================

  const drawFromDeck = (): void => {
    sendMove(TypeDrawFromDeck, {})
  }

  const pickUpDiscardPile = (cardIds: number[]): void => {
    sendMove(TypePickUpDiscardPile, { cardIds })
  }

  const newMeld = (cardIds: number[]): void => {
    sendMove(TypeNewMeld, { cardIds })
  }

  const addToMeld = (cardIds: number[], meldId: number): void => {
    sendMove(TypeAddToMeld, { cardIds, meldId })
  }

  const burnCards = (cardIds: number[], canastaId: number): void => {
    sendMove(TypeBurnCards, { cardIds, canastaId })
  }

  const goDown = (): void => {
    sendMove(TypeGoDown, {})
  }

  const discard = (cardId: number): void => {
    sendMove(TypeDiscard, { cardId })
  }

  const pickUpFoot = (): void => {
    sendMove(TypePickUpFoot, {})
  }

  const playRedThree = (cardIds: number[], fromFoot: boolean = false): void => {
    sendMove(TypePlayRedThree, { cardIds, fromFoot })
  }

  // grantPermissionToGoOut lets my partner authorize me to go out. Sent by
  // the partner, not the current player — there's no formal "request"
  // round-trip; the partner decides based on the visible board (or being
  // asked out loud).
  const grantPermissionToGoOut = (): void => {
    sendMove(TypeGrantPermissionToGoOut, {})
  }

  const sendMove = <T>(type: string, data: T): void => {
    if (pendingMove.value) {
      console.warn('Move already in progress')
      return
    }
    pendingMove.value = true
    const ws = useWebSocketStore()
    ws.send(type, data)
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  const handleWelcome = (payload: WelcomePayload): void => {
    mySeatIndex.value = payload.seatIndex
    roomCode.value = payload.roomCode
    localStorage.setItem(ROOM_STORAGE_KEY, payload.roomCode)

    pendingJoin?.resolve()
    pendingJoin = null
  }

  const handleState = (payload: StateMessage): void => {
    const previousHand = gameState.value?.handNumber
    const wasGameOver = gameState.value?.gameOver ?? false

    gameState.value = payload
    pendingMove.value = false

    if (previousHand !== undefined && payload.handNumber !== previousHand) {
      addNotification(`Hand ${payload.handNumber} started!`)
    }
    if (!wasGameOver && payload.gameOver) {
      addNotification(payload.winner === 'tie' ? "It's a tie!" : `Game over! ${payload.winner} wins!`)
    }
  }

  const handlePlayersLobby = (payload: PlayersLobbyPayload): void => {
    lobbySeats.value = payload.seats
  }

  const handlePlayerStatus = (payload: PlayerStatusPayload): void => {
    const seat = lobbySeats.value.find((s) => s.seatIndex === payload.seatIndex)
    addNotification(`${seat?.name ?? 'A player'} is ${payload.status}`)
  }

  const handleServerError = (payload: ErrorPayload): void => {
    addError(payload.message)
  }

  // handleJoinFailure is called by the websocket store when a connection
  // is rejected before ever completing (see connect()'s didOpen check).
  const handleJoinFailure = (message: string): void => {
    if (pendingJoin) {
      pendingJoin.reject(message)
      pendingJoin = null
    } else {
      addError(message)
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const addError = (message: string): void => {
    errors.value.push(message)
    setTimeout(() => {
      const index = errors.value.indexOf(message)
      if (index > -1) errors.value.splice(index, 1)
    }, 5000)
  }

  const addNotification = (message: string): void => {
    notifications.value.push(message)
    setTimeout(() => {
      const index = notifications.value.indexOf(message)
      if (index > -1) notifications.value.splice(index, 1)
    }, 3000)
  }

  const clearGameState = (): void => {
    roomCode.value = null
    mySeatIndex.value = null
    lobbySeats.value = []
    gameState.value = null

    localStorage.removeItem(ROOM_STORAGE_KEY)
  }

  return {
    // State
    playerName,
    roomCode,
    mySeatIndex,
    lobbySeats,
    gameState,
    errors,
    notifications,
    pendingMove,

    // Computed
    isInLobby,
    isPlaying,
    isGameOver,
    winner,
    isMyTurn,
    currentPhase,
    myHand,
    myTeamScore,
    opponentScore,
    myTeamMelds,
    myTeamCanastas,
    canDraw,
    canPlay,
    canGoOut,
    discardTopCard,
    deckCount,

    // Actions - Lobby
    createRoom,
    joinRoom,

    // Actions - Gameplay
    drawFromDeck,
    pickUpDiscardPile,
    newMeld,
    addToMeld,
    burnCards,
    goDown,
    discard,
    pickUpFoot,
    playRedThree,
    grantPermissionToGoOut,

    // Handlers
    handleWelcome,
    handleState,
    handlePlayersLobby,
    handlePlayerStatus,
    handleServerError,
    handleJoinFailure,

    // Utilities
    addError,
    addNotification,
    clearGameState,
  }
})
