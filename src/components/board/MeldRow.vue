<script setup lang="ts">
// A horizontal row of melds/canastas — each group renders as a tight
// face-up stack of its own cards (matching DeckPile's small-offset
// stacking, not a wide fan), sized the same as the deck/discard piles,
// with its card count shown underneath (same treatment as DiscardPile).
// Optionally appends a dashed "create meld here" tile, and/or makes
// individual groups clickable "add selected cards here" targets (melds
// row only — see TeamMelds.vue for both).
import type { Card } from '@/types/canasta'
import PlayingCard from './PlayingCard.vue'

const props = defineProps<{
  groups: { id: number; cards: Card[] }[]
  showCreateAffordance?: boolean
  // True while groups are this player's own not-yet-committed staging
  // melds rather than the team's official melds (see game.ts's
  // hasGoneDown) — dims the stacks so staging melds read as provisional.
  dimmed?: boolean
  // Group ids that currently accept the player's selected cards (via
  // add-to-meld) — rendered as a highlighted, clickable tile; every
  // other group stays a plain, inert display.
  clickableGroupIds?: Set<number>
}>()
const emit = defineEmits<{ create: []; 'select-group': [id: number] }>()

const STEP_PX = 2
const TILE_SIZE_CLASS =
  'w-[calc(var(--card-base-width)*var(--card-scale,1)*0.75)] h-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*1065/769)]'

function isClickable(id: number): boolean {
  return props.clickableGroupIds?.has(id) ?? false
}
</script>

<template>
  <div class="flex flex-wrap items-start justify-center gap-4">
    <button
      v-for="group in groups"
      :key="group.id"
      type="button"
      class="relative pointer-events-auto disabled:cursor-default"
      :class="[
        TILE_SIZE_CLASS,
        dimmed ? 'opacity-50' : '',
        isClickable(group.id)
          ? 'cursor-pointer [filter:drop-shadow(0_0_6px_var(--color-card-blue))_drop-shadow(0_0_14px_var(--color-card-blue))]'
          : '',
      ]"
      :disabled="!isClickable(group.id)"
      @click="emit('select-group', group.id)"
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
    </button>
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
