import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  CreateGameResponse,
  JoinGameResponse,
  ReconnectResponse,
  LobbyState,
  LobbyPlayer,
  GameStateMessage,
  MoveRequest,
  MoveResultResponse,
  HandEndedNotification,
  GameEndedNotification,
  GameStartedNotification,
  PermissionRequestNotification,
  PermissionResponseNotification,
  PlayerStatusNotification,
  GamePausedNotification,
  GameResumedNotification,
  ErrorMessage,
} from '@/types/api_types'
import type { Card, Meld, Canasta, ClientState } from '@/types/game'
import { useWebSocketStore } from './websocket'

export const useGameStore = defineStore('game', () => {
  // ============================================================================
  // STATE
  // ============================================================================

  const token: Ref<string | null> = ref(localStorage.getItem('canasta_token'))
  const roomCode: Ref<string | null> = ref(localStorage.getItem('canasta_room'))
  const playerId: Ref<number | null> = ref(
    localStorage.getItem('canasta_player_id')
      ? parseInt(localStorage.getItem('canasta_player_id')!)
      : null,
  )

  const lobbyState: Ref<LobbyState | null> = ref(null)
  const gameState: Ref<GameStateMessage | null> = ref(null)

  const errors: Ref<string[]> = ref([])
  const notifications: Ref<string[]> = ref([])

  const pendingMove: Ref<boolean> = ref(false)
  const lastMoveResult: Ref<MoveResultResponse | null> = ref(null)

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const isInLobby: ComputedRef<boolean> = computed(() => lobbyState.value?.status === 'lobby')

  const isPlaying: ComputedRef<boolean> = computed(() => lobbyState.value?.status === 'playing')

  const isPaused: ComputedRef<boolean> = computed(() => lobbyState.value?.status === 'paused')

  const isMyTurn: ComputedRef<boolean> = computed(
    () => gameState.value?.currentPlayer === playerId.value,
  )

  const currentPhase: ComputedRef<string | undefined> = computed(() => gameState.value?.phase)

  const clientState: ComputedRef<ClientState | undefined> = computed(
    () => gameState.value?.state as ClientState | undefined,
  )

  const myHand: ComputedRef<Card[]> = computed(() => {
    const state = clientState.value
    if (!state?.hand) return []
    return Object.values(state.hand)
  })

  const myTeamScore: ComputedRef<number> = computed(() => clientState.value?.ourScore ?? 0)

  const opponentScore: ComputedRef<number> = computed(() => clientState.value?.otherScore ?? 0)

  const myTeamMelds: ComputedRef<Meld[]> = computed(() => clientState.value?.ourMelds ?? [])

  const myTeamCanastas: ComputedRef<Canasta[]> = computed(
    () => clientState.value?.ourCanastas ?? [],
  )

  const canDraw: ComputedRef<boolean> = computed(
    () => isMyTurn.value && currentPhase.value === 'drawing' && !pendingMove.value,
  )

  const canPlay: ComputedRef<boolean> = computed(
    () => isMyTurn.value && currentPhase.value === 'playing' && !pendingMove.value,
  )

  const discardTopCard: ComputedRef<Card | null> = computed(
    () => clientState.value?.discardTopCard ?? null,
  )

  const deckCount: ComputedRef<number> = computed(() => clientState.value?.deckCount ?? 0)

  const mySlot: ComputedRef<LobbyPlayer | undefined> = computed(() =>
    lobbyState.value?.players.find((p) => p.isYou),
  )

  const allPlayersReady: ComputedRef<boolean> = computed(() => lobbyState.value?.allReady ?? false)

  // ============================================================================
  // ACTIONS - Lobby
  // ============================================================================

  const createGame = (username: string, randomTeamOrder: boolean = false): void => {
    const ws = useWebSocketStore()
    ws.send('create_game', { username, randomTeamOrder })
  }

  const joinGame = (code: string, username: string): void => {
    const ws = useWebSocketStore()
    ws.send('join_game', { roomCode: code, username })
  }

  const reconnect = (): void => {
    if (!token.value) {
      console.error('No token available for reconnection')
      return
    }
    const ws = useWebSocketStore()
    ws.send('reconnect', { token: token.value })
  }

  const setReady = (ready: boolean): void => {
    const ws = useWebSocketStore()
    ws.send('set_ready', { ready })
  }

  const updateTeamOrder = (playerOrder: [string, string, string, string]): void => {
    const ws = useWebSocketStore()
    ws.send('update_team_order', { playerOrder })
  }

  const leaveGame = (): void => {
    const ws = useWebSocketStore()
    ws.send('leave_game', {})
    clearGameState()
  }

  // ============================================================================
  // ACTIONS - Gameplay
  // ============================================================================

  const executeMove = (move: MoveRequest): void => {
    if (pendingMove.value) {
      console.warn('Move already in progress')
      return
    }

    pendingMove.value = true
    lastMoveResult.value = null

    const ws = useWebSocketStore()
    ws.send('execute_move', move)
  }

  const drawFromDeck = (): void => {
    executeMove({ type: 'draw_from_deck' })
  }

  const pickupDiscardPile = (cardIds: number[]): void => {
    executeMove({ type: 'pickup_discard_pile', ids: cardIds })
  }

  const createMeld = (cardIds: number[]): void => {
    executeMove({ type: 'create_meld', ids: cardIds })
  }

  const addToMeld = (meldId: number, cardIds: number[]): void => {
    executeMove({ type: 'add_to_meld', id: meldId, ids: cardIds })
  }

  const burnCard = (meldId: number, cardIds: number[]): void => {
    executeMove({ type: 'burn_card', id: meldId, ids: cardIds })
  }

  const goDown = (): void => {
    executeMove({ type: 'go_down' })
  }

  const discard = (cardId: number): void => {
    executeMove({ type: 'discard', id: cardId })
  }

  const pickupFoot = (): void => {
    executeMove({ type: 'pickup_foot' })
  }

  const askToGoOut = (): void => {
    executeMove({ type: 'ask_to_go_out' })
  }

  const respondGoOut = (approved: boolean): void => {
    executeMove({ type: 'respond_go_out', id: approved ? 1 : 0 })
  }

  const playRedThree = (cardIds: number[], fromFoot: boolean = false): void => {
    executeMove({ type: 'play_red_three', ids: cardIds, fromFoot })
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  const handleGameCreated = (payload: CreateGameResponse): void => {
    token.value = payload.token
    roomCode.value = payload.roomCode
    playerId.value = payload.playerId

    localStorage.setItem('canasta_token', payload.token)
    localStorage.setItem('canasta_room', payload.roomCode)
    localStorage.setItem('canasta_player_id', payload.playerId.toString())

    addNotification(`Game created! Room code: ${payload.roomCode}`)
  }

  const handleGameJoined = (payload: JoinGameResponse): void => {
    if (payload.success) {
      token.value = payload.token
      playerId.value = payload.playerId

      localStorage.setItem('canasta_token', payload.token)
      localStorage.setItem('canasta_player_id', payload.playerId.toString())

      addNotification('Successfully joined game!')
    } else {
      addError(payload.message || 'Failed to join game')
    }
  }

  const handleReconnected = (payload: ReconnectResponse): void => {
    if (payload.success) {
      roomCode.value = payload.roomCode || roomCode.value
      playerId.value = payload.playerId ?? playerId.value

      if (payload.roomCode) {
        localStorage.setItem('canasta_room', payload.roomCode)
      }

      addNotification('Reconnected successfully!')
    } else {
      addError(payload.message || 'Reconnection failed')
      clearGameState()
    }
  }

  const handleLobbyUpdate = (payload: LobbyState): void => {
    lobbyState.value = payload
  }

  const handleGameStarted = (payload: GameStartedNotification): void => {
    addNotification(payload.message)
  }

  const handleGameState = (payload: GameStateMessage): void => {
    gameState.value = payload
    pendingMove.value = false
  }

  const handleMoveResult = (payload: MoveResultResponse): void => {
    lastMoveResult.value = payload
    pendingMove.value = false

    if (!payload.success) {
      addError(payload.message || 'Move failed')
    }
  }

  const handleHandEnded = (payload: HandEndedNotification): void => {
    addNotification(
      `Hand ${payload.handNumber} ended! Score: ${payload.teamAScore} - ${payload.teamBScore}`,
    )
  }

  const handleGameEnded = (payload: GameEndedNotification): void => {
    addNotification(
      `Game Over! Winner: ${payload.winnerTeam} (${payload.teamAScore} - ${payload.teamBScore})`,
    )
  }

  const handlePermissionRequested = (payload: PermissionRequestNotification): void => {
    addNotification(`${payload.requestingName} wants to go out. Do you approve?`)
  }

  const handlePermissionResponse = (payload: PermissionResponseNotification): void => {
    addNotification(payload.approved ? 'Partner approved going out!' : 'Partner denied going out')
  }

  const handlePlayerStatus = (payload: PlayerStatusNotification): void => {
    const status = payload.connected ? 'connected' : 'disconnected'
    addNotification(`${payload.username} ${status}`)
  }

  const handleGamePaused = (payload: GamePausedNotification): void => {
    addNotification(payload.message)
  }

  const handleGameResumed = (payload: GameResumedNotification): void => {
    addNotification(payload.message)
  }

  const handleError = (payload: ErrorMessage): void => {
    const message = payload.message.includes(':')
      ? payload.message.split(': ')[1] || payload.message
      : payload.message
    addError(message)
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
    token.value = null
    roomCode.value = null
    playerId.value = null
    lobbyState.value = null
    gameState.value = null

    localStorage.removeItem('canasta_token')
    localStorage.removeItem('canasta_room')
    localStorage.removeItem('canasta_player_id')
  }

  return {
    // State
    token,
    roomCode,
    playerId,
    lobbyState,
    gameState,
    errors,
    notifications,
    pendingMove,
    lastMoveResult,

    // Computed
    isInLobby,
    isPlaying,
    isPaused,
    isMyTurn,
    currentPhase,
    clientState,
    myHand,
    myTeamScore,
    opponentScore,
    myTeamMelds,
    myTeamCanastas,
    canDraw,
    canPlay,
    discardTopCard,
    deckCount,
    mySlot,
    allPlayersReady,

    // Actions - Lobby
    createGame,
    joinGame,
    reconnect,
    setReady,
    updateTeamOrder,
    leaveGame,

    // Actions - Gameplay
    executeMove,
    drawFromDeck,
    pickupDiscardPile,
    createMeld,
    addToMeld,
    burnCard,
    goDown,
    discard,
    pickupFoot,
    askToGoOut,
    respondGoOut,
    playRedThree,

    // Handlers
    handleGameCreated,
    handleGameJoined,
    handleReconnected,
    handleLobbyUpdate,
    handleGameStarted,
    handleGameState,
    handleMoveResult,
    handleHandEnded,
    handleGameEnded,
    handlePermissionRequested,
    handlePermissionResponse,
    handlePlayerStatus,
    handleGamePaused,
    handleGameResumed,
    handleError,

    // Utilities
    addError,
    addNotification,
    clearGameState,
  }
})
