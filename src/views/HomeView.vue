<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import Button from '@/components/Button.vue'
import FormCard from '@/components/FormCard.vue'

const router = useRouter()
const wsStore = useWebSocketStore()
const gameStore = useGameStore()

const initialState: Ref<boolean> = ref(true)
const creatingGame: Ref<boolean> = ref(false)
const joiningGame: Ref<boolean> = ref(false)
const pendingCreate: Ref<boolean> = ref(false)
const pendingJoin: Ref<boolean> = ref(false)
const pendingJoinRoomCode: Ref<string | null> = ref(null)
const createTokenSnapshot: Ref<string | null> = ref(null)
const createRoomSnapshot: Ref<string | null> = ref(null)
const joinTokenSnapshot: Ref<string | null> = ref(null)

const roomCode: Ref<string> = ref('')
const playerName: Ref<string> = ref('')

onMounted(() => {
  wsStore.connect()

  if (gameStore.token && gameStore.roomCode) {
    void router.push(`/join/${gameStore.roomCode}`)
  }
})

watch(
  () => [pendingCreate.value, gameStore.token, gameStore.roomCode] as const,
  ([pending, token, roomCodeValue]) => {
    if (!pending || !token || !roomCodeValue) return

    const tokenChanged = token !== createTokenSnapshot.value
    const roomCodeChanged = roomCodeValue !== createRoomSnapshot.value

    if (!tokenChanged && !roomCodeChanged) return

    pendingCreate.value = false
    createTokenSnapshot.value = null
    createRoomSnapshot.value = null
    void router.push(`/join/${roomCodeValue}`)
  },
)

watch(
  () => [pendingJoin.value, gameStore.token] as const,
  ([pending, token]) => {
    if (!pending || !token || !pendingJoinRoomCode.value) return
    if (token === joinTokenSnapshot.value) return

    const targetRoomCode = pendingJoinRoomCode.value
    pendingJoin.value = false
    pendingJoinRoomCode.value = null
    joinTokenSnapshot.value = null
    void router.push(`/join/${targetRoomCode}`)
  },
)

function createGame(): void {
  if (!playerName.value) {
    gameStore.addError('Please enter a username')
    return
  }

  createTokenSnapshot.value = gameStore.token
  createRoomSnapshot.value = gameStore.roomCode
  pendingCreate.value = true
  gameStore.createGame(playerName.value)
}

function joinLobby(): void {
  if (!roomCode.value && !playerName.value) {
    gameStore.addError('Please enter a room code and your name')
    return
  }

  if (!playerName.value) {
    gameStore.addError('Please enter your name')
    return
  }

  if (!roomCode.value) {
    gameStore.addError('Please enter a room code')
    return
  }

  console.log('Don\'t let Amy pick up the pile')
  const normalizedRoomCode = roomCode.value.toUpperCase()
  pendingJoinRoomCode.value = normalizedRoomCode
  joinTokenSnapshot.value = gameStore.token
  pendingJoin.value = true
  gameStore.joinGame(normalizedRoomCode, playerName.value)
}

function cancel(): void {
  initialState.value = true
  creatingGame.value = false
  joiningGame.value = false
  pendingCreate.value = false
  pendingJoin.value = false
  pendingJoinRoomCode.value = null
  createTokenSnapshot.value = null
  createRoomSnapshot.value = null
  joinTokenSnapshot.value = null
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
          <input v-model.trim="roomCode" type="text" :maxlength="4"
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

  <div v-if="!wsStore.connected" class="connecting">
    <p class="font-rs">Connecting to server...</p>
  </div>

</template>
