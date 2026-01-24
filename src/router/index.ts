import HomeView from '@/views/HomeView.vue'
import LobbyView from '@/views/LobbyView.vue'
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeView },
    { path: '/join/:roomCode', component: LobbyView },
  ],
})

export default router
