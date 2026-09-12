import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from '../App.vue'
import HomeView from '../views/HomeView.vue'
import LobbyView from '../views/LobbyView.vue'
import GameView from '../views/GameView.vue'

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('mounts and renders the home view at /', async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [
        { path: '/', component: HomeView },
        { path: '/join/:roomCode', component: LobbyView },
        { path: '/game/:roomCode', component: GameView },
      ],
    })
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: { plugins: [router] },
    })

    expect(wrapper.text()).toContain('Canasta')
  })
})
