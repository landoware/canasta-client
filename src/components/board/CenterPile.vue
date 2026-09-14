<script setup lang="ts">
// Store-aware wrapper, following GameStateDump.vue's pattern: takes the
// store instance as a prop rather than calling useGameStore() itself, so
// it works against the real single-player instance or any of /demo's seats.
import { computed } from 'vue'
import type { GameStore } from '@/stores/game'
import { isRedThree, isValidPileMatch } from '@/utils/cardHelpers'
import DeckPile from './DeckPile.vue'
import DiscardPile from './DiscardPile.vue'

// selectedCardId is the one hand card GameView currently has selected, or
// null when zero or more than one is selected — discarding only ever
// targets a single card. selectedCardIds is the full selection, needed
// for picking up the pile (2+ cards) — see selectedCards below.
const props = defineProps<{
  gameStore: GameStore
  selectedCardId: number | null
  selectedCardIds: Set<number>
}>()
const emit = defineEmits<{ played: [] }>()

function onDraw(): void {
  props.gameStore.drawFromDeck()
}

// A red three is never discardable (see Discard in moves.go, which now
// rejects it too) — it's always played via the red-threes affordance in
// TeamMelds.vue instead.
const canDiscard = computed(() => {
  if (!props.gameStore.canPlay || props.selectedCardId === null) return false
  const card = props.gameStore.myHand.find((c) => c.id === props.selectedCardId)
  return card !== undefined && !isRedThree(card)
})

const selectedCards = computed(() =>
  props.gameStore.myHand.filter((card) => props.selectedCardIds.has(card.id)),
)

// Picking up the pile is only ever available during the draw phase (see
// PickUpDiscardPile in moves.go, which flips the phase to playing once
// it succeeds) — canDraw already encodes isMyTurn/phase/pendingMove, so
// this doesn't need to re-derive any of that.
const canPickUpPile = computed(() => {
  const topCard = props.gameStore.discardTopCard
  return props.gameStore.canDraw && topCard !== undefined && isValidPileMatch(topCard, selectedCards.value)
})

function onDiscardPileClick(): void {
  if (canPickUpPile.value) {
    props.gameStore.pickUpDiscardPile([...props.selectedCardIds])
    emit('played')
    return
  }
  if (!canDiscard.value) return
  props.gameStore.discard(props.selectedCardId!)
  emit('played')
}
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center pointer-events-none">
    <div class="flex items-center justify-center gap-[clamp(1.5rem,5vw,4rem)] pointer-events-auto">
      <DeckPile :count="gameStore.deckCount" :disabled="!gameStore.canDraw" @draw="onDraw" />
      <DiscardPile
        :top-card="gameStore.discardTopCard"
        :count="gameStore.discardCount"
        :disabled="!canDiscard && !canPickUpPile"
        @click="onDiscardPileClick"
      />
    </div>
  </div>
</template>
