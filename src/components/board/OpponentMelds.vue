<script setup lang="ts">
// Store-aware wrapper for the opposing team's melds and completed
// canastas — a read-only mirror of TeamMelds.vue. Both non-partner seats
// belong to the single opposing team (see seatLayout.ts), so rather than
// stacking melds and canastas together on both sides, each category gets
// its own side — melds on the left, canastas on the right — the same
// "one category per position" idea TeamMelds uses for top/bottom, just
// along the left/right axis instead. Each band sits halfway between that
// side's opponent and the draw/discard pile.
import type { GameStore } from '@/stores/game'
import MeldRow from './MeldRow.vue'

defineProps<{ gameStore: GameStore }>()
</script>

<template>
  <div
    class="fixed inset-y-0 left-1/4 -translate-x-1/2 flex items-center justify-center pointer-events-none"
  >
    <MeldRow :groups="gameStore.opponentMelds" />
  </div>
  <div
    class="fixed inset-y-0 right-1/4 translate-x-1/2 flex items-center justify-center pointer-events-none"
  >
    <MeldRow :groups="gameStore.opponentCanastas" />
  </div>
</template>
