<script setup>
import Button from '@/components/Button.vue'
import FormCard from '@/components/FormCard.vue'
import { useGameStore } from '@/stores/game'
import { useWebSocketStore } from '@/stores/websocket'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const wsStore = useWebSocketStore()
const gameStore = useGameStore()

const initialState = ref(true)
const creatingGame = ref(false)
const joiningGame = ref(false)

const roomCode = ref('')
const playerName = ref('')

onMounted(() => {
  wsStore.connect()

  if (gameStore.token && gameStore.roomCode) {
    router.push(`/join/${gameStore.roomCode}`)
  }
})

function createGame() {
  if (!playerName.value) {
    gameStore.addError('Please enter a username')
    return
  }

  gameStore.createGame(playerName.value)

  setTimeout(() => {
    if (gameStore.roomCode && gameStore.lobbyState.status === "lobby") {
      router.push(`/join/${gameStore.roomCode}`)
      console.log('Good luck fam')
    }
  }, 100)
}

function joinLobby() {
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

  console.log("Don't let Amy pick up the pile")
  gameStore.joinGame(roomCode.value.toUpperCase(), playerName.value)

  setTimeout(() => {
    if (gameStore.token) {
      router.push(`/join/${gameStore.roomCode}`)
    }
  }, 100)
}

function cancel() {
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
  <!-- <div class="notifications font-rs-bold"> -->
  <!--   <div v-for="error in gameStore.errors" :key="error" class="error"> -->
  <!--     {{ error }} -->
  <!--   </div> -->
  <!-- </div> -->

  <div v-if="!wsStore.connected" class="connecting">
    <p class="font-rs">Connecting to server...</p>
  </div>

</template>
