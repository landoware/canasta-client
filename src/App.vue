<script setup lang="ts">
import { onMounted } from 'vue'
import { useWebSocketStore } from '@/stores/websocket'
import { useGameStore } from '@/stores/game'

const wsStore = useWebSocketStore()
const gameStore = useGameStore()

onMounted(() => {
  // Connect to WebSocket when app loads
  wsStore.connect()
})
</script>

<template>
  <div id="app" class="bg-card-green">
    <router-view />

    <!-- Global error/notification toasts -->
    <div class="toasts">
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
