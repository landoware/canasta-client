<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import { useChatStore } from '@/stores/chat'
import LobbySeatGrid from '@/components/LobbySeatGrid.vue'
import Button from '@/components/Button.vue'
import FormCard from '@/components/FormCard.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const wsStore = useWebSocketStore()
const chatStore = useChatStore()

const roomCode = computed(() => String(route.params.roomCode).toUpperCase())

// A fresh tab landing on this route directly (e.g. a shared invite link)
// never called joinRoom, so mySeatIndex/roomCode are unset — same gap as
// following a second room's link without a full page reload while still
// connected elsewhere. Either way, show the name prompt below instead of
// the waiting room until joinRoom actually resolves.
const needsToJoin = computed(
  () => gameStore.mySeatIndex === null || gameStore.roomCode?.toUpperCase() !== roomCode.value,
)

const nameInput: Ref<string> = ref(gameStore.playerName ?? '')
const joining: Ref<boolean> = ref(false)

async function joinThisRoom(): Promise<void> {
  if (!nameInput.value) {
    gameStore.addError('Please enter your name')
    return
  }
  joining.value = true
  try {
    await gameStore.joinRoom(roomCode.value, nameInput.value)
  } catch (err) {
    gameStore.addError(err instanceof Error ? err.message : 'Could not join that room.')
  } finally {
    joining.value = false
  }
}

async function copyInviteLink(): Promise<void> {
  const url = `${window.location.origin}/join/${roomCode.value}`
  try {
    await navigator.clipboard.writeText(url)
    gameStore.addNotification('Invite link copied!')
  } catch {
    gameStore.addError('Could not copy link — copy it from the address bar instead.')
  }
}

// The room starts only once the host explicitly presses Start Game (see
// internal/room.Room.applyStartGame), so the only signal we need is the
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
  chatStore.reset()
  void router.push('/')
}
</script>

<template>
  <div
    v-if="needsToJoin"
    class="min-h-screen flex flex-col items-center justify-center text-center"
  >
    <p class="text-card-white font-quill text-[clamp(2.5rem,14vw,6rem)] leading-none text-shadow-lg mb-10">
      Join Room {{ roomCode }}
    </p>
    <FormCard>
      <form @submit.prevent="joinThisRoom()">
        <div class="flex flex-col gap-5">
          <input
            v-model.trim="nameInput"
            type="text"
            class="font-rs-bold text-black bg-white border border-card-blue rounded-md text-center"
            placeholder="Name"
          />
          <Button type="submit" label="Join Game" />
        </div>
      </form>
    </FormCard>
    <div v-if="joining" class="connecting">
      <p class="font-rs">Connecting...</p>
    </div>
  </div>

  <div v-else class="max-h-screen flex flex-col items-center justify-center text-center">
    <div class="text-card-white text-[clamp(2.5rem,14vw,6rem)] text-shadow-lg">
      <span class="font-quill">Room </span>
      <span class="font-rs-bold text-rs-yellow">{{ route.params.roomCode }}</span>
    </div>
    <Button @click="copyInviteLink()" label="Copy Invite Link" class="m-2" />
    <div class="text-card-white font-quill text-[clamp(2.5rem,14vw,6rem)] text-shadow-lg">
      Waiting for players...
    </div>
    <LobbySeatGrid
      :seats="gameStore.lobbySeats"
      :draggable="gameStore.myIsHost"
      @reorder="gameStore.reorderSeats"
    />
    <div class="flex gap-3 m-5">
      <Button
        @click="gameStore.setReady(!gameStore.myIsReady)"
        :label="gameStore.myIsReady ? 'Not Ready' : 'Ready'"
      />
      <Button
        v-if="gameStore.myIsHost"
        @click="gameStore.startGame()"
        :disabled="!gameStore.canStartGame"
        label="Start Game"
      />
      <Button @click="leave()" label="Leave" />
    </div>
  </div>
</template>
