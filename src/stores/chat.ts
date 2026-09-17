import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Ref } from 'vue'
import type { ChatBroadcastPayload } from '@/types/protocol'
import { TypeChatMessage } from '@/types/protocol'
import { useWebSocketStore } from './websocket'
import { useGameStore } from './game'
import { MAIN_INSTANCE_ID } from './instanceId'

export interface ChatMessage {
  seatIndex: number
  name: string
  text: string
  self: boolean // true for this client's own optimistically-echoed message
}

// chatStoreCache holds one store definition per instanceId — see
// useChatStore below for why this needs to be a factory rather than a bare
// defineStore(...) call.
const chatStoreCache = new Map<string, ReturnType<typeof defineChatStore>>()

function defineChatStore(instanceId: string) {
  return defineStore(`chat-${instanceId}`, () => {
    // ============================================================================
    // STATE
    // ============================================================================

    const messages: Ref<ChatMessage[]> = ref([])
    const unreadCount: Ref<number> = ref(0)
    const isOpen: Ref<boolean> = ref(false)

    // ============================================================================
    // ACTIONS
    // ============================================================================

    const openPanel = (): void => {
      isOpen.value = true
      unreadCount.value = 0
    }

    const closePanel = (): void => {
      isOpen.value = false
    }

    const togglePanel = (): void => {
      if (isOpen.value) {
        closePanel()
      } else {
        openPanel()
      }
    }

    // sendChatMessage optimistically appends the message locally (self:
    // true) rather than waiting for a server echo — the server only
    // broadcasts to *other* seats (see internal/room/chat.go), so there is
    // no round trip for your own message. Bypasses game.ts's sendMove/
    // pendingMove machinery entirely, since chat isn't turn-scoped.
    const sendChatMessage = (text: string): void => {
      const trimmed = text.trim()
      if (!trimmed) return

      const gameStore = useGameStore(instanceId)
      messages.value.push({
        seatIndex: gameStore.mySeatIndex ?? -1,
        name: gameStore.playerName ?? '',
        text: trimmed,
        self: true,
      })
      useWebSocketStore(instanceId).send(TypeChatMessage, { text: trimmed })
    }

    // handleChatMessage is called from websocket.ts's handleMessage switch
    // for an inbound chat broadcast (always from another seat — see
    // sendChatMessage's optimistic local echo above).
    const handleChatMessage = (payload: ChatBroadcastPayload): void => {
      messages.value.push({ ...payload, self: false })
      if (!isOpen.value) unreadCount.value++
    }

    // reset clears the chat log — called alongside gameStore.clearGameState()
    // when leaving a room, so a fresh join doesn't show a stale prior room's
    // messages.
    const reset = (): void => {
      messages.value = []
      unreadCount.value = 0
      isOpen.value = false
    }

    return {
      // State
      messages,
      unreadCount,
      isOpen,

      // Actions
      openPanel,
      closePanel,
      togglePanel,
      sendChatMessage,
      handleChatMessage,
      reset,
    }
  })
}

// useChatStore returns the chat store for instanceId, creating its
// definition on first use. Real single-player play always uses the default
// (MAIN_INSTANCE_ID) instance; the /demo page creates one instance per seat
// so 4 concurrent seats don't share state.
export function useChatStore(instanceId: string = MAIN_INSTANCE_ID) {
  if (!chatStoreCache.has(instanceId)) {
    chatStoreCache.set(instanceId, defineChatStore(instanceId))
  }
  return chatStoreCache.get(instanceId)!()
}
