<script setup lang="ts">
// Store-aware wrapper, following GameStateDump.vue's pattern: takes the
// store instance as a prop rather than calling useGameStore() itself, so
// it works against the real single-player instance or any of /demo's seats.
import { computed } from 'vue'
import type { GameStore } from '@/stores/game'
import DeckPile from './DeckPile.vue'
import DiscardPile from './DiscardPile.vue'

// selectedCardId is the one hand card GameView currently has selected, or
// null when zero or more than one is selected — discarding only ever
// targets a single card.
const props = defineProps<{ gameStore: GameStore; selectedCardId: number | null }>()
const emit = defineEmits<{ discarded: [] }>()

function onDraw(): void {
  props.gameStore.drawFromDeck()
}

const canDiscard = computed(() => props.gameStore.canPlay && props.selectedCardId !== null)

function onDiscardPileClick(): void {
  if (!canDiscard.value) return
  props.gameStore.discard(props.selectedCardId!)
  emit('discarded')
}
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center pointer-events-none">
    <div class="flex items-center justify-center gap-[clamp(1.5rem,5vw,4rem)] pointer-events-auto">
      <DeckPile :count="gameStore.deckCount" :disabled="!gameStore.canDraw" @draw="onDraw" />
      <DiscardPile
        :top-card="gameStore.discardTopCard"
        :count="gameStore.discardCount"
        :disabled="!canDiscard"
        @click="onDiscardPileClick"
      />
    </div>
  </div>
</template>
