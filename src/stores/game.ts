import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import type {
  WelcomePayload,
  StateMessage,
  PlayersLobbyPayload,
  LobbySeat,
  PlayerStatusPayload,
  GoOutRequestedPayload,
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
  TypeAskToGoOut,
} from '@/types/protocol'
import type { Card, Meld, Canasta } from '@/types/canasta'
import { PhaseDrawing, PhasePlaying } from '@/types/canasta'
import { meetsGoOutRequirements } from '@/utils/cardHelpers'
import { useWebSocketStore } from './websocket'
import { MAIN_INSTANCE_ID } from './instanceId'

const NAME_STORAGE_KEY = 'canasta_name'
const ROOM_STORAGE_KEY = 'canasta_room'

// gameStoreCache holds one store definition per instanceId — see
// useGameStore below for why this needs to be a factory rather than a bare
// defineStore(...) call.
const gameStoreCache = new Map<string, ReturnType<typeof defineGameStore>>()

function defineGameStore(instanceId: string) {
  // Only the default (single-player) instance persists to localStorage —
  // /demo's 4 concurrent instances can't share the one canasta_name/
  // canasta_room key pair, and resuming a stale demo session on reload
  // isn't useful anyway.
  const persist = instanceId === MAIN_INSTANCE_ID

  return defineStore(`game-${instanceId}`, () => {
  // ============================================================================
  // STATE
  // ============================================================================

  // There's no server credential anymore (see internal/room.Room.Join) —
  // name + roomCode are only persisted so the join form can pre-fill and a
  // dropped connection can be resumed with the same identity.
  const playerName: Ref<string | null> = ref(persist ? localStorage.getItem(NAME_STORAGE_KEY) : null)
  const roomCode: Ref<string | null> = ref(persist ? localStorage.getItem(ROOM_STORAGE_KEY) : null)
  const mySeatIndex: Ref<number | null> = ref(null)

  const lobbySeats: Ref<LobbySeat[]> = ref([])
  const gameState: Ref<StateMessage | null> = ref(null)

  const errors: Ref<string[]> = ref([])
  const notifications: Ref<string[]> = ref([])

  const pendingMove: Ref<boolean> = ref(false)

  // Set when this seat's partner asks to go out (see handleGoOutRequested)
  // — GoOutRequestDialog.vue renders its Yes/No prompt whenever this is
  // non-null, and respondToGoOutRequest clears it either way.
  const goOutRequest: Ref<{ askerName: string } | null> = ref(null)

  // Card ids currently in hand that arrived via pickUpFoot() rather than
  // the initial deal or a stock draw — see pickUpFoot/handleState below
  // for how this gets populated/pruned. TeamMelds.vue uses this to send
  // the correct fromFoot flag when playing red threes (foot-origin red
  // threes don't earn a replacement draw — see PlayRedThree in the
  // server's moves.go).
  const footOriginCardIds: Ref<Set<number>> = ref(new Set())

  // Snapshot of hand card ids taken right before a pickUpFoot() call goes
  // out — diffed against the hand in the next handleState to see exactly
  // which ids the foot pickup added. Cleared on that same state (or on a
  // rejection, see handleServerError) so it never lingers to mis-tag a
  // later, unrelated hand change.
  let pendingFootPickupSnapshot: Set<number> | null = null

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

  const myRedThrees: ComputedRef<Card[]> = computed(() => gameState.value?.ourRedThrees ?? [])

  const opponentMelds: ComputedRef<Meld[]> = computed(() => gameState.value?.otherMelds ?? [])

  const opponentCanastas: ComputedRef<Canasta[]> = computed(
    () => gameState.value?.otherCanastas ?? [],
  )

  const opponentRedThrees: ComputedRef<Card[]> = computed(
    () => gameState.value?.otherRedThrees ?? [],
  )

  // Whether myTeamMelds are the team's official melds (true) or this
  // player's own not-yet-committed staging melds (false) — see
  // internal/canasta/presentation.go's ClientState.GoneDown. It's an
  // all-or-nothing flag: myTeamMelds is never a mix of the two.
  const hasGoneDown: ComputedRef<boolean> = computed(() => gameState.value?.goneDown ?? false)

  const myHasFoot: ComputedRef<boolean> = computed(() => gameState.value?.hasFoot ?? false)

  // Whether this player has completed their own first canasta — see
  // PickUpFoot in moves.go, whose sole eligibility check this mirrors.
  // Per-player, not per-team, unlike hasGoneDown above.
  const myMadeCanasta: ComputedRef<boolean> = computed(() => gameState.value?.madeCanasta ?? false)

  // True from the moment this player completes their *first* canasta
  // until they discard on that same turn — PickUpFoot rejects a
  // pick-up attempt while this is true (see moves.go), so foot pickup
  // only becomes available starting their next turn.
  const myCanastaMadeThisTurn: ComputedRef<boolean> = computed(
    () => gameState.value?.canastaMadeThisTurn ?? false,
  )

  const canDraw: ComputedRef<boolean> = computed(
    () => isMyTurn.value && currentPhase.value === PhaseDrawing && !pendingMove.value,
  )

  const canPlay: ComputedRef<boolean> = computed(
    () => isMyTurn.value && currentPhase.value === PhasePlaying && !pendingMove.value,
  )

  // Whether MY team currently has permission to go out — granted by my
  // partner via grantPermissionToGoOut(), typically after an
  // askToGoOut()/goOutRequest round trip (see below), though a partner
  // can grant it unprompted too.
  const canGoOut: ComputedRef<boolean> = computed(() => gameState.value?.canGoOut ?? false)

  // Whether it's worth showing the "Ask to go out" affordance for MY
  // team: gone down, not already granted, and holding all four required
  // canasta types — see Team.MeetsGoOutRequirements in canasta.go, which
  // askToGoOut's server-side handler re-validates authoritatively.
  const canAskToGoOut: ComputedRef<boolean> = computed(
    () => hasGoneDown.value && !canGoOut.value && meetsGoOutRequirements(myTeamCanastas.value),
  )

  const discardTopCard: ComputedRef<Card | undefined> = computed(
    () => gameState.value?.discardTopCard,
  )

  const deckCount: ComputedRef<number> = computed(() => gameState.value?.deckCount ?? 0)

  const discardCount: ComputedRef<number> = computed(() => gameState.value?.discardCount ?? 0)

  const handNumber: ComputedRef<number> = computed(() => gameState.value?.handNumber ?? 1)

  // ============================================================================
  // ACTIONS - Lobby
  // ============================================================================

  // createRoom creates a new room over HTTP, then joins the first seat.
  // Resolves once the server accepts the join (a `welcome` message
  // arrives); rejects if the connection is refused.
  const createRoom = async (name: string): Promise<string> => {
    const ws = useWebSocketStore(instanceId)
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
    if (persist) localStorage.setItem(NAME_STORAGE_KEY, name)

    return new Promise((resolve, reject) => {
      pendingJoin = { resolve, reject }
      const ws = useWebSocketStore(instanceId)
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
    pendingFootPickupSnapshot = new Set(myHand.value.map((card) => card.id))
    sendMove(TypePickUpFoot, {})
  }

  const playRedThree = (cardIds: number[], fromFoot: boolean = false): void => {
    sendMove(TypePlayRedThree, { cardIds, fromFoot })
  }

  // grantPermissionToGoOut lets my partner authorize me to go out. Sent by
  // the partner, not the current player — typically in response to a
  // goOutRequest (see below), but nothing stops a partner from granting
  // it unprompted based on the visible board.
  const grantPermissionToGoOut = (): void => {
    sendMove(TypeGrantPermissionToGoOut, {})
  }

  // askToGoOut notifies my partner (via the server's targeted
  // go_out_requested message — see handleGoOutRequested) that I'd like
  // to go out. Not turn-scoped: see canAskToGoOut above and
  // applyAskToGoOut in dispatch.go, which allows this from either seat
  // on an eligible team at any time.
  const askToGoOut = (): void => {
    sendMove(TypeAskToGoOut, {})
  }

  // respondToGoOutRequest answers an incoming goOutRequest. A "yes"
  // sends the real grant; a "no" is purely local — there's no server
  // round trip for a denial, so the asker's button just stays available
  // to ask again.
  const respondToGoOutRequest = (allow: boolean): void => {
    if (allow) grantPermissionToGoOut()
    goOutRequest.value = null
  }

  const sendMove = <T>(type: string, data: T): void => {
    if (pendingMove.value) {
      console.warn('Move already in progress')
      return
    }
    pendingMove.value = true
    const ws = useWebSocketStore(instanceId)
    ws.send(type, data)
  }

  // ============================================================================
  // MESSAGE HANDLERS
  // ============================================================================

  const handleWelcome = (payload: WelcomePayload): void => {
    mySeatIndex.value = payload.seatIndex
    roomCode.value = payload.roomCode
    if (persist) localStorage.setItem(ROOM_STORAGE_KEY, payload.roomCode)

    pendingJoin?.resolve()
    pendingJoin = null
  }

  const handleState = (payload: StateMessage): void => {
    const previousHand = gameState.value?.handNumber
    const wasGameOver = gameState.value?.gameOver ?? false

    gameState.value = payload
    pendingMove.value = false

    const newHandIds = new Set(Object.keys(payload.hand ?? {}).map(Number))
    if (pendingFootPickupSnapshot) {
      for (const id of newHandIds) {
        if (!pendingFootPickupSnapshot.has(id)) footOriginCardIds.value.add(id)
      }
      pendingFootPickupSnapshot = null
    }
    // Prune ids that left the hand (played, melded, discarded) — this
    // also transparently clears everything on a new hand deal, since none
    // of the old ids will appear in the fresh hand.
    for (const id of footOriginCardIds.value) {
      if (!newHandIds.has(id)) footOriginCardIds.value.delete(id)
    }

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

  const handleGoOutRequested = (payload: GoOutRequestedPayload): void => {
    goOutRequest.value = { askerName: payload.askerName }
  }

  const handleServerError = (payload: ErrorPayload): void => {
    // A rejected move never gets a matching state broadcast to clear
    // pendingMove (see handleState) — without this, every move after the
    // first rejected one would silently no-op forever (canDraw/canPlay
    // are also gated on !pendingMove).
    pendingMove.value = false
    pendingFootPickupSnapshot = null
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

    if (persist) localStorage.removeItem(ROOM_STORAGE_KEY)
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
    goOutRequest,
    footOriginCardIds,

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
    myRedThrees,
    opponentMelds,
    opponentCanastas,
    opponentRedThrees,
    hasGoneDown,
    myHasFoot,
    myMadeCanasta,
    myCanastaMadeThisTurn,
    canDraw,
    canPlay,
    canGoOut,
    canAskToGoOut,
    discardTopCard,
    deckCount,
    discardCount,
    handNumber,

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
    askToGoOut,
    respondToGoOutRequest,

    // Handlers
    handleWelcome,
    handleState,
    handlePlayersLobby,
    handlePlayerStatus,
    handleGoOutRequested,
    handleServerError,
    handleJoinFailure,

    // Utilities
    addError,
    addNotification,
    clearGameState,
  }
  })
}

// useGameStore returns the game store for instanceId, creating its
// definition on first use. Real single-player play always uses the default
// (MAIN_INSTANCE_ID) instance; the /demo page creates one instance per seat
// so 4 concurrent seats don't share state.
export function useGameStore(instanceId: string = MAIN_INSTANCE_ID) {
  if (!gameStoreCache.has(instanceId)) {
    gameStoreCache.set(instanceId, defineGameStore(instanceId))
  }
  return gameStoreCache.get(instanceId)!()
}

export type GameStore = ReturnType<typeof useGameStore>
