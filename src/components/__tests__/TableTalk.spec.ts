import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TableTalk from '../TableTalk.vue'
import { useChatStore } from '@/stores/chat'
import { useWebSocketStore } from '@/stores/websocket'
import { TypeChatMessage } from '@/types/protocol'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

describe('TableTalk', () => {
  let send: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
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

  it('is closed until the toggle button is clicked', async () => {
    const wrapper = mount(TableTalk)

    expect(wrapper.find('input[type="text"]').exists()).toBe(false)

    await wrapper.find('button[aria-label="Toggle Table Talk"]').trigger('click')
    expect(wrapper.find('input[type="text"]').exists()).toBe(true)
  })

  it('closes when the close button is clicked', async () => {
    const wrapper = mount(TableTalk)
    await wrapper.find('button[aria-label="Toggle Table Talk"]').trigger('click')

    await wrapper.find('button[aria-label="Close Table Talk"]').trigger('click')
    expect(wrapper.find('input[type="text"]').exists()).toBe(false)
  })

  it('shows an unread badge for incoming messages while closed, and clears it on open', async () => {
    const wrapper = mount(TableTalk)
    const chatStore = useChatStore()

    chatStore.handleChatMessage({ seatIndex: 1, name: 'Bob', text: 'hi' })
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('1')

    await wrapper.find('button[aria-label="Toggle Table Talk"]').trigger('click')
    expect(wrapper.find('.bg-card-red').exists()).toBe(false)
  })

  it('sends the typed message and clears the input', async () => {
    const wrapper = mount(TableTalk)
    await wrapper.find('button[aria-label="Toggle Table Talk"]').trigger('click')

    const input = wrapper.find('input[type="text"]')
    await input.setValue('good game')
    await wrapper.find('form').trigger('submit')

    expect(send).toHaveBeenCalledWith(TypeChatMessage, { text: 'good game' })
    expect((input.element as HTMLInputElement).value).toBe('')
  })

  it('renders the sender name for messages from other seats', async () => {
    const wrapper = mount(TableTalk)
    const chatStore = useChatStore()
    chatStore.handleChatMessage({ seatIndex: 1, name: 'Bob', text: 'hello there' })
    await wrapper.find('button[aria-label="Toggle Table Talk"]').trigger('click')

    expect(wrapper.text()).toContain('Bob')
    expect(wrapper.text()).toContain('hello there')
  })
})
