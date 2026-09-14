import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { ClientMessage, ServerMessage } from '@/types/protocol'
import {
  TypeWelcome,
  TypeState,
  TypePlayersLobby,
  TypePlayerDisconnected,
  TypePlayerReconnected,
  TypePlayerStatus,
  TypeGoOutRequested,
  TypeError,
} from '@/types/protocol'
import type {
  WelcomePayload,
  StateMessage,
  PlayersLobbyPayload,
  PlayerStatusPayload,
  GoOutRequestedPayload,
  ErrorPayload,
  CreateRoomResponse,
} from '@/types/protocol'
import type { MessageType } from '@/types/protocol'
import { useGameStore } from './game'
import { useRateLimiter } from '@/composables/useRateLimiter'
import { MAIN_INSTANCE_ID } from './instanceId'

const MAX_RECONNECT_ATTEMPTS = 3
const RECONNECT_DELAYS = [3000, 6000, 12000] // Exponential backoff: 3s, 6s, 12s

// httpBase returns the server's HTTP(S) origin, e.g.
// "https://canasta-api.landanfagan.com". Falls back to the Go server's local
// dev default (see internal/server/server.go's NewHTTPServer) so `bun dev`
// works against `go run ./cmd/api` with no env setup; staging/production
// set VITE_SERVER_URL at build time (see the docker-publish workflows).
const httpBase = (): string =>
  (import.meta.env.VITE_SERVER_URL || 'http://localhost:8080').replace(/\/$/, '')

// wsUrlFor derives the room's websocket URL from the same origin used for
// HTTP, swapping the scheme (http->ws, https->wss).
const wsUrlFor = (roomCode: string, name: string): string => {
  const wsBase = httpBase().replace(/^http/, 'ws')
  return `${wsBase}/rooms/${encodeURIComponent(roomCode)}/ws?name=${encodeURIComponent(name)}`
}

// wsStoreCache holds one store definition per instanceId — see
// useWebSocketStore below for why this needs to be a factory rather than a
// bare defineStore(...) call.
const wsStoreCache = new Map<string, ReturnType<typeof defineWebSocketStore>>()

function defineWebSocketStore(instanceId: string) {
  return defineStore(`websocket-${instanceId}`, () => {
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

  // createRoom asks the server to create a new room and returns its code.
  // This is the one piece of server communication that isn't a websocket
  // message — see internal/server/rooms_handler.go.
  const createRoom = async (): Promise<string> => {
    const response = await fetch(`${httpBase()}/rooms`, { method: 'POST' })
    if (!response.ok) {
      throw new Error(`Failed to create a room (HTTP ${response.status})`)
    }
    const body = (await response.json()) as CreateRoomResponse
    return body.roomCode
  }

  // connect opens the websocket for roomCode, identifying as name. The
  // server resolves name to a seat (existing seat if it matches, otherwise
  // the next open one) before ever upgrading the connection, so a rejected
  // join (blank name, full room, unknown room code) never reaches onopen —
  // see the didOpen check in onclose below.
  const connect = (roomCode: string, name: string): void => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    const url = wsUrlFor(roomCode, name)
    console.log(`Connecting to WebSocket: ${url}`)
    ws.value = new WebSocket(url)

    let didOpen = false

    ws.value.onopen = () => {
      didOpen = true
      console.log('WebSocket connected')
      connected.value = true
      reconnecting.value = false
      reconnectAttempts.value = 0
    }

    ws.value.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage
      console.log('Received:', message.type, message.data)
      handleMessage(message)
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    ws.value.onclose = () => {
      console.log('WebSocket disconnected')
      connected.value = false

      const gameStore = useGameStore(instanceId)

      if (!didOpen) {
        // The server rejected the join before the handshake ever
        // completed (browsers don't expose the HTTP status/body for a
        // failed upgrade, so this is necessarily a generic failure).
        gameStore.handleJoinFailure('Could not join room — check the code and try again.')
        return
      }

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
          connect(roomCode, name)
        }, delay)
      } else if (reconnectAttempts.value >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached')
        reconnecting.value = false
        gameStore.addError('Connection lost. Please refresh the page.')
      }
    }
  }

  const send = <T>(type: MessageType, data: T): void => {
    // Check rate limiter
    if (!rateLimiter.canSend()) {
      console.error('Rate limit exceeded. Please slow down.')
      const gameStore = useGameStore(instanceId)
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
      const message: ClientMessage = { type, data }
      console.log('Sending:', type, data)
      ws.value.send(JSON.stringify(message))
      rateLimiter.recordMessage()
    } else {
      console.error('WebSocket not connected. Cannot send:', type)
      const gameStore = useGameStore(instanceId)
      gameStore.addError('Not connected to server')
    }
  }

  const handleMessage = (message: ServerMessage): void => {
    const gameStore = useGameStore(instanceId)

    switch (message.type) {
      case TypeWelcome:
        gameStore.handleWelcome(message.data as WelcomePayload)
        break
      case TypeState:
        gameStore.handleState(message.data as StateMessage)
        break
      case TypePlayersLobby:
        gameStore.handlePlayersLobby(message.data as PlayersLobbyPayload)
        break
      case TypePlayerDisconnected:
      case TypePlayerReconnected:
      case TypePlayerStatus:
        gameStore.handlePlayerStatus(message.data as PlayerStatusPayload)
        break
      case TypeGoOutRequested:
        gameStore.handleGoOutRequested(message.data as GoOutRequestedPayload)
        break
      case TypeError:
        gameStore.handleServerError(message.data as ErrorPayload)
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
    createRoom,
    connect,
    send,
    disconnect,
  }
  })
}

// useWebSocketStore returns the websocket store for instanceId, creating its
// definition on first use. Real single-player play always uses the default
// (MAIN_INSTANCE_ID) instance; the /demo page creates one instance per seat
// so 4 concurrent connections don't share state.
export function useWebSocketStore(instanceId: string = MAIN_INSTANCE_ID) {
  if (!wsStoreCache.has(instanceId)) {
    wsStoreCache.set(instanceId, defineWebSocketStore(instanceId))
  }
  return wsStoreCache.get(instanceId)!()
}
