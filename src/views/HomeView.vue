<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import Button from '@/components/Button.vue'
import FormCard from '@/components/FormCard.vue'

const router = useRouter()
const gameStore = useGameStore()

const initialState: Ref<boolean> = ref(true)
const creatingGame: Ref<boolean> = ref(false)
const joiningGame: Ref<boolean> = ref(false)
const submitting: Ref<boolean> = ref(false)

const roomCode: Ref<string> = ref('')
const playerName: Ref<string> = ref('')

onMounted(() => {
  // Pre-fill the name field from a previous visit — a pure convenience,
  // there's no credential to restore (see internal/room.Room.Join).
  if (gameStore.playerName) {
    playerName.value = gameStore.playerName
  }
})

async function createGame(): Promise<void> {
  if (!playerName.value) {
    gameStore.addError('Please enter a username')
    return
  }

  submitting.value = true
  try {
    const code = await gameStore.createRoom(playerName.value)
    void router.push(`/join/${code}`)
  } catch {
    gameStore.addError('Could not create a room right now. Please try again.')
  } finally {
    submitting.value = false
  }
}

async function joinLobby(): Promise<void> {
  if (!playerName.value) {
    gameStore.addError('Please enter your name')
    return
  }

  if (!roomCode.value) {
    gameStore.addError('Please enter a room code')
    return
  }

  const normalizedRoomCode = roomCode.value.toUpperCase()
  submitting.value = true
  try {
    await gameStore.joinRoom(normalizedRoomCode, playerName.value)
    void router.push(`/join/${normalizedRoomCode}`)
  } catch (err) {
    gameStore.addError(err instanceof Error ? err.message : 'Could not join that room.')
  } finally {
    submitting.value = false
  }
}

function cancel(): void {
  initialState.value = true
  creatingGame.value = false
  joiningGame.value = false
}
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center text-center">
    <p class="text-card-white font-quill text-[clamp(2.5rem,14vw,6rem)] leading-none text-shadow-lg mb-10">
      Canasta
    </p>
    <FormCard>
      <div v-if="initialState" class="flex flex-col gap-5">
        <Button @click="creatingGame = true; initialState = false" label="New Game" />
        <Button @click="joiningGame = true; initialState = false" label="Join Game" />
      </div>

      <form v-if="creatingGame" @submit.prevent="createGame()">
        <div class="flex flex-col gap-5">
          <input v-if="!initialState" v-model.trim="playerName" type="text"
            class="font-rs-bold text-black bg-white border border-card-blue rounded-md text-center" placeholder="Name">

          <Button type="submit" label="New Game" />
          <Button @click="cancel()" label="Back" class="bg-card-red" />
        </div>
      </form>

      <form v-if="joiningGame" @submit.prevent="joinLobby()">
        <div class="flex flex-col gap-5">
          <input v-model.trim="roomCode" type="text" :maxlength="6"
            class="font-rs-bold text-black uppercase bg-white border border-card-blue rounded-md text-center"
            placeholder="CODE">

          <input v-model.trim="playerName" type="text"
            class="font-rs-bold text-black bg-white border border-card-blue rounded-md text-center" placeholder="Name">

          <Button type="submit" label="Join Game" />
          <Button @click="cancel()" label="Back" class="bg-card-red" />
        </div>
      </form>
    </FormCard>
  </div>

  <div v-if="submitting" class="connecting">
    <p class="font-rs">Connecting...</p>
  </div>
</template>
