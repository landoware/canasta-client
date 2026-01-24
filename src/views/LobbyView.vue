<script setup lang="ts">
import Button from '@/components/Button.vue';
import FormCard from '@/components/FormCard.vue';
import LobbyPlayerCard from '@/components/LobbyPlayerCard.vue';
import { useGameStore } from '@/stores/game';
import { useRouter } from 'vue-router';

const router = useRouter()
const gameStore = useGameStore()

function leave() {
  gameStore.leaveGame()
  router.push('/')
}

</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center text-center">
    <div class=" text-center text-card-white font-quill text-[clamp(2.5rem,14vw,6rem)] text-shadow-lg">
      Pick your Partners
    </div>
    <div class="flex flex-row justify-center items-center gap-10">
      <div>
        <FormCard color="red" class="md:min-w-55">
          <div v-for="player, index in gameStore.lobbyState?.players" :key="index">
            <LobbyPlayerCard :playerName="player.username" />
          </div>
        </FormCard>
      </div>

      <div>
        <div v-for="(player, index) in gameStore.lobbyState?.players" :key="index">
          <LobbyPlayerCard :playerName="player.username" />
        </div>
      </div>

      <div>
        <FormCard class="md:min-w-55">
        </FormCard>
      </div>
    </div>
    <Button @click="leave()" label="Leave" class="" />
  </div>

</template>
