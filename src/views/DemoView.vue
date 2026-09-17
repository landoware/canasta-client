<script setup lang="ts">
// Dev-only harness: creates one real room and joins all 4 seats as real
// websocket connections (no server-side demo mode — this is exactly what 4
// separate real clients joining would look like), then reuses GameView
// itself so the demo renders identically to the real game. Clicking
// another player's name (GameView's allowSeatSwitch) switches which seat's
// store GameView is mounted against.
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'
import type { GameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import GameView from '@/views/GameView.vue'
import Button from '@/components/Button.vue'

// welcome (which joinRoom resolves on) arrives the instant each seat
// connects — well before the `state` broadcast that actually starts the
// game once all 4 seats are filled (see internal/room.Room.startGame).
// Waiting only on joinRoom would let GameView mount against a store whose
// gameState is still null; this mirrors the same isPlaying gate LobbyView
// uses before it ever navigates to GameView.
function waitUntilPlaying(store: GameStore): Promise<void> {
  if (store.isPlaying) return Promise.resolve()
  return new Promise((resolve) => {
    const stop = watch(
      () => store.isPlaying,
      (playing) => {
        if (playing) {
          stop()
          resolve()
        }
      },
    )
  })
}

// The room no longer auto-starts once all 4 seats are named — each seat
// must set_ready and only the host may start_game (see
// internal/room/lobby.go's applySetReady/applyStartGame). Host is
// whichever seat was claimed first, which races the same way seat
// assignment does, so it's discovered reactively via canStartGame
// (mirrors LobbyView's own gate on that computed) rather than assumed.
function waitForHost(stores: GameStore[]): Promise<GameStore> {
  const alreadyHost = stores.find((store) => store.canStartGame)
  if (alreadyHost) return Promise.resolve(alreadyHost)
  return new Promise((resolve) => {
    const stops = stores.map((store) =>
      watch(
        () => store.canStartGame,
        (canStart) => {
          if (canStart) {
            stops.forEach((stop) => stop())
            resolve(store)
          }
        },
      ),
    )
  })
}

const SEAT_IDS = ['demo-0', 'demo-1', 'demo-2', 'demo-3']
const SEAT_NAMES = ['Player 1', 'Player 2', 'Player 3', 'Player 4']

const gameStores = SEAT_IDS.map((id) => useGameStore(id))
const wsStores = SEAT_IDS.map((id) => useWebSocketStore(id))

// Seat assignment is join order and races (see initDemo below), so this
// starts pointing at whichever instance actually became seat 0 rather than
// assuming SEAT_IDS[0] did.
const activeInstanceId = ref(SEAT_IDS[0]!)

// select-seat carries an absolute seat index (0-3), not an instanceId —
// OtherPlayers/GameView only know seats, not that this is a multi-store
// demo — so it's translated here via each store's own mySeatIndex.
function onSelectSeat(seatIndex: number): void {
  const index = gameStores.findIndex((store) => store.mySeatIndex === seatIndex)
  if (index === -1) return
  activeInstanceId.value = SEAT_IDS[index]!
}

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
    gameStores.forEach((store) => store.setReady(true))
    const host = await waitForHost(gameStores)
    host.startGame()
    await Promise.all(gameStores.map((store) => waitUntilPlaying(store)))
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

  <!-- :key forces a fresh GameView (and its own local UI state — hand
       order, card selection) whenever the active seat switches, rather
       than reusing one instance across different gameStore instanceIds. -->
  <GameView
    v-else
    :key="activeInstanceId"
    :instance-id="activeInstanceId"
    :allow-seat-switch="true"
    @select-seat="onSelectSeat"
  />
</template>
