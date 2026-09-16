<script setup lang="ts">
// Store-aware wrapper for the opposing team's melds and completed
// canastas — a read-only mirror of TeamMelds.vue. Both non-partner seats
// belong to the single opposing team (see seatLayout.ts), so rather than
// stacking melds and canastas together on both sides, each category gets
// its own side — melds on the left, canastas on the right — the same
// "one category per position" idea TeamMelds uses for top/bottom, just
// along the left/right axis instead. Each band sits halfway between that
// side's opponent and the draw/discard pile, and is rotated to match
// that opponent's own orientation (see OtherPlayerHand's ROTATE_DEG).
import type { GameStore } from '@/stores/game'
import type { Card } from '@/types/canasta'
import MeldRow from './MeldRow.vue'
import FitToArea from './FitToArea.vue'

defineProps<{
  gameStore: GameStore
  // Display-frozen versions of gameStore.opponentMelds/opponentCanastas —
  // see TeamMelds.vue's identical props for why.
  displayMelds: { id: number; cards: Card[] }[]
  displayCanastas: { id: number; cards: Card[] }[]
}>()
</script>

<template>
  <div
    class="fixed inset-y-0 left-1/4 -translate-x-1/2 flex items-center justify-center pointer-events-none"
  >
    <div class="-rotate-90">
      <!-- FitToArea's own maxWidth/maxHeight are in pre-rotation local
           space, so they're swapped relative to the on-screen footprint
           we actually want: maxWidth becomes the on-screen height
           (matches OtherPlayerHand's own max-h-[36rem] for this same
           quadrant), maxHeight becomes the on-screen width. -->
      <FitToArea max-width="36rem" max-height="clamp(7rem, 14vw, 11rem)" v-slot="{ compact }">
        <MeldRow
          data-melds-row="opponent"
          :groups="displayMelds"
          :compact="compact"
          counter-rotate="left"
        />
      </FitToArea>
    </div>
  </div>
  <div
    class="fixed inset-y-0 right-1/4 translate-x-1/2 flex items-center justify-center pointer-events-none"
  >
    <div class="rotate-90">
      <FitToArea max-width="36rem" max-height="clamp(7rem, 14vw, 11rem)" v-slot="{ compact }">
        <MeldRow :groups="displayCanastas" :compact="compact" counter-rotate="right" />
      </FitToArea>
    </div>
  </div>
</template>
