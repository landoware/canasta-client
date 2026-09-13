<script setup lang="ts">
// A horizontal row of melds/canastas — each group renders as a tight
// face-up stack of its own cards (matching DeckPile's small-offset
// stacking, not a wide fan), sized the same as the deck/discard piles,
// with its card count shown underneath (same treatment as DiscardPile).
// Optionally appends a dashed "create meld here" tile (melds row only —
// see TeamMelds.vue).
import type { Card } from '@/types/canasta'
import PlayingCard from './PlayingCard.vue'

defineProps<{
  groups: { id: number; cards: Card[] }[]
  showCreateAffordance?: boolean
  // True while groups are this player's own not-yet-committed staging
  // melds rather than the team's official melds (see game.ts's
  // hasGoneDown) — dims the stacks so staging melds read as provisional.
  dimmed?: boolean
}>()
const emit = defineEmits<{ create: [] }>()

const STEP_PX = 2
const TILE_SIZE_CLASS =
  'w-[calc(var(--card-base-width)*var(--card-scale,1)*0.75)] h-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*1065/769)]'
</script>

<template>
  <div class="flex flex-wrap items-start justify-center gap-4">
    <div
      v-for="group in groups"
      :key="group.id"
      class="relative"
      :class="[TILE_SIZE_CLASS, dimmed ? 'opacity-50' : '']"
    >
      <PlayingCard
        v-for="(card, i) in group.cards"
        :key="card.id"
        :card="card"
        class="!absolute !left-0 !top-0"
        :style="{ transform: `translate(${i * STEP_PX}px, ${-(i * STEP_PX)}px)`, zIndex: i }"
      />
      <span class="absolute -bottom-6 left-1/2 -translate-x-1/2 font-rs-bold text-card-white">{{
        group.cards.length
      }}</span>
    </div>
    <button
      v-if="showCreateAffordance"
      type="button"
      class="relative flex items-center justify-center rounded-2xl border-2 border-dashed border-card-white/40 pointer-events-auto hover:border-card-white"
      :class="TILE_SIZE_CLASS"
      aria-label="Create meld from selected cards"
      @click="emit('create')"
    >
      <span class="font-rs-bold text-4xl text-card-white">+</span>
    </button>
  </div>
</template>
