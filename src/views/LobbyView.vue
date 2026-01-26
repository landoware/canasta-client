<script setup lang="ts">
import { useGameStore } from '@/stores/game';
import { useRouter } from 'vue-router';
import LobbyPlayerCard from '@/components/LobbyPlayerCard.vue';
import Button from '@/components/Button.vue';

const router = useRouter()
const gameStore = useGameStore()

function ready() {
  gameStore.setReady(!gameStore.mySlot?.ready.valueOf())
}

function leave() {
  gameStore.leaveGame()
  router.push('/')
}

</script>

<template>
  <div class="max-h-screen flex flex-col items-center justify-center text-center">
    <div class=" text-center text-card-white font-quill text-[clamp(2.5rem,14vw,6rem)] text-shadow-lg">
      Pick your Partners
    </div>
    <div class="grid grid-cols-2 justify-center items-center gap-10">
      <div>
        <LobbyPlayerCard :playerName="gameStore.lobbyState?.players[0]?.username"
          :ready="gameStore.lobbyState?.players[0]?.ready" :team="true" />
      </div>
      <div>
        <LobbyPlayerCard :playerName="gameStore.lobbyState?.players[1]?.username"
          :ready="gameStore.lobbyState?.players[1]?.ready" />
      </div>
      <div>
        <LobbyPlayerCard :playerName="gameStore.lobbyState?.players[2]?.username"
          :ready="gameStore.lobbyState?.players[2]?.ready" :team="true" />
      </div>
      <div>
        <LobbyPlayerCard :playerName="gameStore.lobbyState?.players[3]?.username"
          :ready="gameStore.lobbyState?.players[3]?.ready" :team="false" />
      </div>
    </div>
    <Button @click="ready()" label="Ready" class="m-5" />
    <Button @click="leave()" label="Leave" />

  </div>

</template>
