<script setup lang="ts">
// Store-aware wrapper, following GameStateDump.vue's pattern: takes the
// store instance as a prop rather than calling useGameStore() itself, so
// it works against the real single-player instance or any of /demo's seats.
import type { GameStore } from '@/stores/game'
import DeckPile from './DeckPile.vue'
import DiscardPile from './DiscardPile.vue'

const props = defineProps<{ gameStore: GameStore }>()

function onDraw(): void {
  props.gameStore.drawFromDeck()
}
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center pointer-events-none">
    <div class="flex items-center justify-center gap-[clamp(1.5rem,5vw,4rem)] pointer-events-auto">
      <DeckPile :count="gameStore.deckCount" :disabled="!gameStore.canDraw" @draw="onDraw" />
      <DiscardPile :top-card="gameStore.discardTopCard" :count="gameStore.discardCount" />
    </div>
  </div>
</template>
