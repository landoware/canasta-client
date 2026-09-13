<script setup lang="ts">
// Dev-only harness: creates one real room and joins all 4 seats as real
// websocket connections (no server-side demo mode — this is exactly what 4
// separate real clients joining would look like), then reuses GameView
// itself so the demo renders identically to the real game. Seat switching
// and other demo-specific controls come later.
import { ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import GameView from '@/views/GameView.vue'
import Button from '@/components/Button.vue'

const SEAT_IDS = ['demo-0', 'demo-1', 'demo-2', 'demo-3']
const SEAT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4']

const gameStores = SEAT_IDS.map((id) => useGameStore(id))
const wsStores = SEAT_IDS.map((id) => useWebSocketStore(id))

const initializing = ref(true)
const initError = ref<string | null>(null)

const initDemo = async (): Promise<void> => {
  initializing.value = true
  initError.value = null
  try {
    // Seat assignment is join order, but joins race here (4 concurrent
    // connections, same as 4 independent real clients) — never assume
    // SEAT_IDS[i] ends up seated at index i.
    const roomCode = await wsStores[0]!.createRoom()
    await Promise.all(
      SEAT_IDS.map((_, i) => gameStores[i]!.joinRoom(roomCode, SEAT_NAMES[i]!)),
    )
  } catch (err) {
    initError.value = err instanceof Error ? err.message : 'Failed to start demo game'
  } finally {
    initializing.value = false
  }
}

onMounted(initDemo)

onUnmounted(() => {
  SEAT_IDS.forEach((_, i) => {
    wsStores[i]!.disconnect()
    gameStores[i]!.$dispose()
    wsStores[i]!.$dispose()
  })
})
</script>

<template>
  <div v-if="initializing" class="font-rs text-card-white p-8">Starting a game...</div>

  <div v-else-if="initError" class="flex flex-col items-center gap-2 font-rs text-card-white p-8">
    <p>{{ initError }}</p>
    <Button label="Retry" @click="initDemo" />
  </div>

  <GameView v-else :instance-id="SEAT_IDS[0]" />
</template>
