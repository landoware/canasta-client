<script setup lang="ts">
// Store-aware wrapper, following GameStateDump.vue's pattern: takes the
// store instance as a prop rather than calling useGameStore() itself, so
// it works against the real single-player instance or any of /demo's seats.
import { computed } from 'vue'
import type { GameStore } from '@/stores/game'
import { Wild } from '@/types/canasta'
import type { Rank } from '@/types/canasta'
import {
  isRedThree,
  isValidPileMatch,
  isWildCard,
  wouldStrandHand,
  completesLastCanastaAllowingOneCard,
} from '@/utils/cardHelpers'
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
//
// Its hand-stranding check is different from TeamMelds.vue's: the rest
// of the discard pile (everything but the top card, already covered by
// selectedCards) refills the hand right after the pickup completes, so
// the resulting hand size accounts for discardCount - 1, not just what
// contributing selectedCards alone would leave — mirrors the same
// finalHandSize math in PickUpDiscardPile (moves.go). Its escape hatch
// mirrors completesLastCanastaAllowingOneCard exactly too: still
// allowed when this exact pickup completes the team's last required
// canasta type, leaving exactly one card.
const canPickUpPile = computed(() => {
  const topCard = props.gameStore.discardTopCard
  if (!props.gameStore.canDraw || topCard === undefined) return false
  if (!isValidPileMatch(topCard, selectedCards.value)) return false

  const finalHandSize =
    props.gameStore.myHand.length - selectedCards.value.length + (props.gameStore.discardCount - 1)
  if (!wouldStrandHand(finalHandSize, 0, props.gameStore.canGoOut)) return true

  const meldCards = [...selectedCards.value, topCard]
  const nonWild = meldCards.filter((c) => !isWildCard(c))
  const rank: Rank = nonWild.length > 0 ? nonWild[0]!.rank : Wild
  const natural = nonWild.length === meldCards.length
  const becomesCanasta = props.gameStore.hasGoneDown && meldCards.length >= 7
  return completesLastCanastaAllowingOneCard(
    props.gameStore.myTeamCanastas,
    finalHandSize,
    becomesCanasta,
    rank,
    natural,
  )
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
