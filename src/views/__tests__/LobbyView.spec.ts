import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import LobbyView from '../LobbyView.vue'
import HomeView from '../HomeView.vue'
import GameView from '../GameView.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'

vi.mock('@/stores/websocket', () => ({
  useWebSocketStore: vi.fn(),
}))

async function mountAt(path: string) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/', component: HomeView },
      { path: '/join/:roomCode', component: LobbyView },
      { path: '/game/:roomCode', component: GameView },
    ],
  })
  await router.push(path)
  await router.isReady()

  return mount(LobbyView, { global: { plugins: [router] } })
}

describe('LobbyView', () => {
  let send: ReturnType<typeof vi.fn>
  let connect: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    send = vi.fn()
    connect = vi.fn()
    vi.mocked(useWebSocketStore).mockReturnValue({
      ws: null,
      connected: false,
      reconnecting: false,
      reconnectAttempts: 0,
      createRoom: vi.fn(),
      connect,
      send,
      disconnect: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it('prompts for a name when landing on the route without having joined (e.g. a shared link)', async () => {
    const wrapper = await mountAt('/join/ROOM01')

    expect(wrapper.find('input').exists()).toBe(true)
    expect(wrapper.text()).toContain('Join Room ROOM01')
  })

  it('submitting the name prompt joins the room by its URL code', async () => {
    const wrapper = await mountAt('/join/room01')

    await wrapper.find('input').setValue('Alice')
    await wrapper.find('form').trigger('submit.prevent')

    expect(connect).toHaveBeenCalledWith('ROOM01', 'Alice')
  })

  it('skips the prompt once already joined (normal create/join flow)', async () => {
    const gameStore = useGameStore()
    const joinPromise = gameStore.joinRoom('ROOM01', 'Alice')
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ROOM01', roomState: 'lobby' })
    await joinPromise

    const wrapper = await mountAt('/join/ROOM01')

    expect(wrapper.find('input').exists()).toBe(false)
    expect(wrapper.text()).toContain('Waiting for players')
  })

  it('copies the invite link and shows a confirmation', async () => {
    const gameStore = useGameStore()
    const joinPromise = gameStore.joinRoom('ROOM01', 'Alice')
    gameStore.handleWelcome({ seatIndex: 0, roomCode: 'ROOM01', roomState: 'lobby' })
    await joinPromise

    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    const wrapper = await mountAt('/join/ROOM01')
    const copyButton = wrapper.findAll('button').find((b) => b.text() === 'Copy Invite Link')
    await copyButton!.trigger('click')
    await vi.waitFor(() => expect(writeText).toHaveBeenCalled())

    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/join/ROOM01`)
    expect(gameStore.notifications).toContainEqual(expect.stringContaining('copied'))
  })
})
