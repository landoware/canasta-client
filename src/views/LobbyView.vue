<script setup lang="ts">
import { watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import LobbyPlayerCard from '@/components/LobbyPlayerCard.vue'
import Button from '@/components/Button.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const wsStore = useWebSocketStore()

// The room auto-starts the instant the 4th seat is named (no ready step —
// see internal/room.Room.startGame), so the only signal we need is the
// first `state` broadcast arriving.
watch(
  () => gameStore.isPlaying,
  (playing) => {
    if (playing) {
      void router.push(`/game/${route.params.roomCode}`)
    }
  },
)

function leave(): void {
  // There's no server-side "vacate seat" — leaving just closes the
  // connection; the seat stays reserved for this name if anyone reopens
  // the room. See internal/room.Room's disconnect handling.
  wsStore.disconnect()
  gameStore.clearGameState()
  void router.push('/')
}
</script>

<template>
  <div class="max-h-screen flex flex-col items-center justify-center text-center">
    <div class="text-card-white text-[clamp(2.5rem,14vw,6rem)] text-shadow-lg">
      <span class="font-quill">Room </span>
      <span class="font-rs-bold text-rs-yellow">{{ route.params.roomCode }}</span>
    </div>
    <div class="text-card-white font-quill text-[clamp(2.5rem,14vw,6rem)] text-shadow-lg">
      Waiting for players...
    </div>
    <div class="grid grid-cols-2 justify-center items-center gap-10">
      <div v-for="seatIndex in [0, 1, 2, 3]" :key="seatIndex">
        <LobbyPlayerCard
          :playerName="gameStore.lobbySeats.find((s) => s.seatIndex === seatIndex)?.name"
          :connected="gameStore.lobbySeats.find((s) => s.seatIndex === seatIndex)?.connected"
          :team="seatIndex % 2 === 0"
        />
      </div>
    </div>
    <Button @click="leave()" label="Leave" class="m-5" />
  </div>
</template>
