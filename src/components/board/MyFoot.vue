<script setup lang="ts">
// Store-aware wrapper for the local player's own foot, following
// TeamMelds.vue's pattern. Positioned just left of the hand's own left
// edge — this player's own seated "left" — tracking the hand's actual
// current width (see handHalfWidthExpr) so it moves in/out as cards are
// drawn/discarded/picked up, rather than sitting at a fixed screen spot.
import { computed } from 'vue'
import type { GameStore } from '@/stores/game'
import { handHalfWidthExpr, footRotationOvershootExpr } from '@/utils/handLayout'
import FootPile from './FootPile.vue'

const props = defineProps<{ gameStore: GameStore }>()

const GAP = '1rem'

// FootPile itself is rotated 90deg (see :rotate-deg below) to sit
// perpendicular to the hand — footRotationOvershootExpr accounts for its
// visual (post-rotation) width being wider than the layout box `right`
// below actually positions, so the gap clears its true rotated
// footprint rather than its narrower, un-rotated portrait box (which
// would let it visually overlap the hand).
//
// The hand is horizontally centered on the viewport (see PlayerHand.vue),
// so its left edge sits at 50vw minus its own half-width — this pile's
// right edge sits one GAP (plus the rotation overshoot) further left
// still, expressed as a `right` offset from the viewport's own right edge.
const rightOffset = computed(
  () =>
    `calc(50vw + ${handHalfWidthExpr(props.gameStore.myHand.length)} + ${footRotationOvershootExpr()} + ${GAP})`,
)

// Re-checked here rather than trusting FootPile's own dimmed styling,
// since dimming (myMadeCanasta alone) deliberately doesn't track
// canPlay — it shouldn't flicker grey/ungrey as turns pass once earned,
// but an actual pick-up attempt still needs it to be this player's turn
// to play (the server enforces the same — see PickUpFoot/dispatch.go).
function onPickUp(): void {
  if (props.gameStore.myMadeCanasta && props.gameStore.canPlay) {
    props.gameStore.pickUpFoot()
  }
}
</script>

<template>
  <div class="fixed bottom-4 pointer-events-none" :style="{ right: rightOffset }">
    <FootPile
      :visible="gameStore.myHasFoot"
      :dimmed="!gameStore.myMadeCanasta"
      :clickable="true"
      :rotate-deg="90"
      back="blue"
      @pick-up="onPickUp"
    />
  </div>
</template>
