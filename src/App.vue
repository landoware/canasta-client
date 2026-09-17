<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'
import SettingsMenu from '@/components/SettingsMenu.vue'
import TableTalk from '@/components/TableTalk.vue'
import CardFlightLayer from '@/components/board/CardFlightLayer.vue'

const route = useRoute()

// There's no app-wide connection to open here: a websocket now always
// targets one specific room (/rooms/{code}/ws?name=...), so connecting
// happens when the player actually creates or joins one (see HomeView).
const gameStore = useGameStore()

// --card-scale is bound here, at the root, so it cascades to every
// card-rendering component (deck, discard, hand, ...) without each one
// needing to know about the settings store — see main.css's
// --card-base-width for the other half of the calc().
const settings = useSettingsStore()
</script>

<template>
  <div
    id="app"
    class="h-dvh bg-card-table text-white"
    :style="{ '--card-scale': settings.cardScale }"
  >
    <RouterView />
    <SettingsMenu v-if="route.path !== '/'" />
    <TableTalk v-if="route.path !== '/'" />
    <CardFlightLayer />

    <!-- Global error/notification toasts -->
    <div class="toasts font-rs-bold">
      <div v-for="error in gameStore.errors" :key="error" class="toast error">
        {{ error }}
      </div>
      <div v-for="notif in gameStore.notifications" :key="notif" class="toast info">
        {{ notif }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast {
  padding: 12px 20px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
  min-width: 200px;
  max-width: 400px;
}

.toast.error {
  background: #f44336;
  color: white;
}

.toast.info {
  background: #2196f3;
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
