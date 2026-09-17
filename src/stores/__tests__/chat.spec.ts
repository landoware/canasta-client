import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useChatStore } from '@/stores/chat'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import { TypeChatMessage } from '@/types/protocol'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

describe('chat store', () => {
  let send: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()

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

  it('sendChatMessage optimistically echoes locally and sends over the socket', () => {
    const gameStore = useGameStore()
    gameStore.handleWelcome({ seatIndex: 1, roomCode: 'ABC123', roomState: 'lobby' })
    gameStore.playerName = 'Alice'

    const chatStore = useChatStore()
    chatStore.sendChatMessage('hi there')

    expect(chatStore.messages).toHaveLength(1)
    expect(chatStore.messages[0]).toMatchObject({
      seatIndex: 1,
      name: 'Alice',
      text: 'hi there',
      self: true,
    })
    expect(send).toHaveBeenCalledWith(TypeChatMessage, { text: 'hi there' })
  })

  it('sendChatMessage trims whitespace and no-ops on a blank message', () => {
    const chatStore = useChatStore()
    chatStore.sendChatMessage('   ')

    expect(chatStore.messages).toHaveLength(0)
    expect(send).not.toHaveBeenCalled()
  })

  it('handleChatMessage increments unreadCount only while the panel is closed', () => {
    const chatStore = useChatStore()

    chatStore.handleChatMessage({ seatIndex: 2, name: 'Bob', text: 'hello' })
    expect(chatStore.messages).toHaveLength(1)
    expect(chatStore.messages[0]).toMatchObject({ self: false, name: 'Bob', text: 'hello' })
    expect(chatStore.unreadCount).toBe(1)

    chatStore.openPanel()
    expect(chatStore.unreadCount).toBe(0)

    chatStore.handleChatMessage({ seatIndex: 2, name: 'Bob', text: 'still here?' })
    expect(chatStore.unreadCount).toBe(0)
  })

  it('reset clears messages, unread count, and open state', () => {
    const chatStore = useChatStore()
    chatStore.handleChatMessage({ seatIndex: 2, name: 'Bob', text: 'hello' })
    chatStore.openPanel()

    chatStore.reset()

    expect(chatStore.messages).toHaveLength(0)
    expect(chatStore.unreadCount).toBe(0)
    expect(chatStore.isOpen).toBe(false)
  })
})
