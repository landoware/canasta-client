<script setup lang="ts">
// The player's own hand, fanned across the bottom of the screen. Selection
// is purely local UI state for now — multiple cards can be toggled on/off
// by clicking; nothing is sent to the server yet (that wiring, e.g. for
// discard/meld, comes once those interactions have a home).
import { ref, computed } from 'vue'
import type { Card } from '@/types/canasta'
import PlayingCard from './PlayingCard.vue'

const props = defineProps<{ cards: Card[] }>()

const selectedIds = ref<Set<number>>(new Set())
const hoveredId = ref<number | null>(null)

function isSelected(id: number): boolean {
  return selectedIds.value.has(id)
}

function toggle(id: number): void {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = next
}

const CARD_SPACING_PX = 30
const SELECTED_LIFT_PERCENT = 20
const HOVERED_LIFT_PERCENT = 10

const cardLayouts = computed(() => {
  const count = props.cards.length
  const center = (count - 1) / 2

  return props.cards.map((card, i) => {
    const offsetPx = (i - center) * CARD_SPACING_PX
    const liftPercent =
      (isSelected(card.id) ? SELECTED_LIFT_PERCENT : 0) +
      (hoveredId.value === card.id ? HOVERED_LIFT_PERCENT : 0)

    return {
      card,
      // z-index tracks fan order only (never bumped for selection/hover),
      // so a raised card still stays tucked under its right-hand neighbor.
      style: {
        transform: `translate(calc(-50% + ${offsetPx}px), -${liftPercent}%)`,
        zIndex: i,
      },
    }
  })
})
</script>

<template>
  <div class="fixed inset-x-0 bottom-0 flex translate-y-1/2 justify-center pointer-events-none">
    <div class="relative h-[clamp(8rem,20vw,14rem)] w-full max-w-5xl">
      <!-- Selected highlight is a drop-shadow, not a ring/border: it
           follows the PNG's actual alpha shape rather than our CSS box —
           the source art has transparent padding and its own corner
           radius that don't line up with a CSS border-radius. -->
      <button
        v-for="layout in cardLayouts"
        :key="layout.card.id"
        type="button"
        class="absolute bottom-0 left-1/2 w-[calc(var(--card-base-width)*var(--card-scale,1))] transition-all duration-150 pointer-events-auto cursor-pointer"
        :class="
          isSelected(layout.card.id)
            ? '[filter:drop-shadow(0_0_6px_var(--color-card-blue))_drop-shadow(0_0_14px_var(--color-card-blue))]'
            : ''
        "
        :style="layout.style"
        :data-selected="isSelected(layout.card.id)"
        @click="toggle(layout.card.id)"
        @mouseenter="hoveredId = layout.card.id"
        @mouseleave="hoveredId = null"
      >
        <PlayingCard :card="layout.card" />
      </button>
    </div>
  </div>
</template>
