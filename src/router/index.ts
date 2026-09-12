import HomeView from '@/views/HomeView.vue'
import LobbyView from '@/views/LobbyView.vue'
import GameView from '@/views/GameView.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeView },
    { path: '/join/:roomCode', component: LobbyView },
    { path: '/game/:roomCode', component: GameView },
  ],
})

export default router
