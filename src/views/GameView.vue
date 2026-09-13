<script setup lang="ts">
import { useGameStore } from '@/stores/game'
import CenterPile from '@/components/board/CenterPile.vue'
import PlayerHand from '@/components/board/PlayerHand.vue'

// instanceId defaults to the main (single-player) store instance when
// unset, which is how vue-router mounts this for the real /game/:roomCode
// route. DemoView passes a specific seat's instanceId to reuse this same
// component for each of its 4 seats.
const props = defineProps<{ instanceId?: string }>()
const gameStore = useGameStore(props.instanceId)
</script>

<template>
  <CenterPile :game-store="gameStore" />
  <PlayerHand :cards="gameStore.myHand" />
</template>
