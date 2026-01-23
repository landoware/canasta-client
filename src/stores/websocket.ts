import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type {
  CreateGameResponse,
  JoinGameResponse,
  ReconnectResponse,
  LobbyState,
  GameStartedNotification,
  GameStateMessage,
  MoveResultResponse,
  HandEndedNotification,
  GameEndedNotification,
  PermissionRequestNotification,
  PermissionResponseNotification,
  PlayerStatusNotification,
  GamePausedNotification,
  GameResumedNotification,
  ErrorMessage,
} from '@/types/api_types'
import { useGameStore } from './game'
import { useRateLimiter } from '@/composables/useRateLimiter'

const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAYS = [3000, 6000, 12000] // Exponential backoff: 3s, 6s, 12s

export const useWebSocketStore = defineStore('websocket', () => {
  // ============================================================================
  // STATE
  // ============================================================================

  const ws: Ref<WebSocket | null> = ref(null)
  const connected: Ref<boolean> = ref(false)
  const reconnecting: Ref<boolean> = ref(false)
  const reconnectAttempts: Ref<number> = ref(0)

  const rateLimiter = useRateLimiter()

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const connect = (url?: string): void => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    const wsUrl = url || import.meta.env.VITE_WS_URL || 'wss://canasta-server.fly.dev/websocket'

    console.log(`Connecting to WebSocket: ${wsUrl}`)
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      console.log('WebSocket connected')
      connected.value = true
      reconnecting.value = false
      reconnectAttempts.value = 0

      // Auto-reconnect with stored token if available
      const gameStore = useGameStore()
      if (gameStore.token) {
        console.log('Auto-reconnecting with stored token...')
        send('reconnect', { token: gameStore.token })
      }
    }

    ws.value.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('Received:', message.type, message.payload)
      handleMessage(message)
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.value.onclose = () => {
      console.log('WebSocket disconnected')
      connected.value = false

      // Auto-reconnect with exponential backoff if not manually disconnected
      if (!reconnecting.value && reconnectAttempts.value < MAX_RECONNECT_ATTEMPTS) {
        reconnecting.value = true
        const delay =
          RECONNECT_DELAYS[Math.min(reconnectAttempts.value, RECONNECT_DELAYS.length - 1)]

        console.log(
          `Reconnecting in ${delay}ms (attempt ${reconnectAttempts.value + 1}/${MAX_RECONNECT_ATTEMPTS})...`,
        )

        setTimeout(() => {
          reconnectAttempts.value++
          connect(wsUrl)
        }, delay)
      } else if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached')
        reconnecting.value = false
        const gameStore = useGameStore()
        gameStore.addError('Connection lost. Please refresh the page.')
      }
    }
  }

  const send = <T>(type: string, payload: T): void => {
    // Check rate limiter
    if (!rateLimiter.canSend()) {
      console.error('Rate limit exceeded. Please slow down.')
      const gameStore = useGameStore()
      gameStore.addError('Sending messages too fast. Please slow down.')
      return
    }

    // Warn if approaching rate limit
    if (rateLimiter.isNearLimit.value) {
      console.warn(
        `Approaching rate limit: ${rateLimiter.messageCount.value}/10 messages per second`,
      )
    }

    if (ws.value?.readyState === WebSocket.OPEN) {
      const message = { type, payload }
      console.log('Sending:', type, payload)
      ws.value.send(JSON.stringify(message))
      rateLimiter.recordMessage()
    } else {
      console.error('WebSocket not connected. Cannot send:', type)
      const gameStore = useGameStore()
      gameStore.addError('Not connected to server')
    }
  }

  const handleMessage = (message: { type: string; payload: unknown }): void => {
    const gameStore = useGameStore()

    switch (message.type) {
      case 'pong':
        // Heartbeat response - no action needed
        break
      case 'game_created':
        gameStore.handleGameCreated(message.payload as CreateGameResponse)
        break
      case 'game_joined':
        gameStore.handleGameJoined(message.payload as JoinGameResponse)
        break
      case 'reconnected':
        gameStore.handleReconnected(message.payload as ReconnectResponse)
        break
      case 'lobby_update':
        gameStore.handleLobbyUpdate(message.payload as LobbyState)
        break
      case 'game_started':
        gameStore.handleGameStarted(message.payload as GameStartedNotification)
        break
      case 'game_state':
        gameStore.handleGameState(message.payload as GameStateMessage)
        break
      case 'move_result':
        gameStore.handleMoveResult(message.payload as MoveResultResponse)
        break
      case 'hand_ended':
        gameStore.handleHandEnded(message.payload as HandEndedNotification)
        break
      case 'game_ended':
        gameStore.handleGameEnded(message.payload as GameEndedNotification)
        break
      case 'permission_requested':
        gameStore.handlePermissionRequested(message.payload as PermissionRequestNotification)
        break
      case 'permission_response':
        gameStore.handlePermissionResponse(message.payload as PermissionResponseNotification)
        break
      case 'player_disconnected':
      case 'player_reconnected':
        gameStore.handlePlayerStatus(message.payload as PlayerStatusNotification)
        break
      case 'game_paused':
        gameStore.handleGamePaused(message.payload as GamePausedNotification)
        break
      case 'game_resumed':
        gameStore.handleGameResumed(message.payload as GameResumedNotification)
        break
      case 'error':
        gameStore.handleError(message.payload as ErrorMessage)
        break
      default:
        console.warn('Unhandled message type:', message.type)
    }
  }

  const disconnect = (): void => {
    reconnecting.value = false
    reconnectAttempts.value = MAX_RECONNECT_ATTEMPTS // Prevent auto-reconnect
    ws.value?.close()
    ws.value = null
    connected.value = false
  }

  return {
    ws,
    connected,
    reconnecting,
    reconnectAttempts,
    connect,
    send,
    disconnect,
  }
})
