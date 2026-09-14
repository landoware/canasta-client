<script setup lang="ts">
// An opponent/partner's hand: mirrors PlayerHand's fan (same spacing math,
// swapped to whichever axis this position spreads along) but face-down and
// non-interactive. Above 15 cards we switch to a capped stack, like
// DeckPile, rather than fanning an unreadable number of backs; a numeric
// count (below) is always shown regardless, since a stack's depth is
// capped and no longer reflects the real hand size.
import { computed } from 'vue'
import PlayingCard from './PlayingCard.vue'

const props = defineProps<{
  name: string
  handLength: number
  isCurrentTurn: boolean
  position: 'top' | 'left' | 'right'
  // Demo-only: lets a click on this player's name request switching to
  // control them — see OtherPlayers.vue, which is the only place this is
  // ever set true. Left false (the default), the name renders exactly as
  // it always has.
  clickable?: boolean
}>()
const emit = defineEmits<{ select: [] }>()

const FAN_THRESHOLD = 15
const CARD_SPACING_PX = 20
const STACK_DEPTH = 4

// left rotates the opposite way from right so both sides' card shadows
// (and, in the template, the name text) tip toward screen center rather
// than mirroring each other outward off their own edge.
const ROTATE_DEG: Record<'top' | 'left' | 'right', number> = { top: 0, left: -90, right: 90 }

const isFanned = computed(() => props.handLength <= FAN_THRESHOLD)

// Horizontal spread (top) offsets along X; vertical spread (left/right)
// offsets along Y. The perpendicular axis is always 0 — the anchor edge
// (top-0/left-0/right-0) plus the outer 50%-offscreen translate does the
// rest, exactly like PlayerHand's bottom-anchored fan.
const cardLayouts = computed(() => {
  const count = props.handLength
  const center = (count - 1) / 2
  const horizontal = props.position === 'top'

  return Array.from({ length: count }, (_, i) => {
    const offsetPx = (i - center) * CARD_SPACING_PX
    // Left/right hands are rotated 90deg so the cards read as held
    // sideways, matching their vertical fan axis — the sign is mirrored
    // per side (see ROTATE_DEG) so each card's shadow falls toward screen
    // center instead of off the edge it's already hugging.
    const transform = horizontal
      ? `translate(calc(-50% + ${offsetPx}px), 0)`
      : `translate(0, calc(-50% + ${offsetPx}px)) rotate(${ROTATE_DEG[props.position]}deg)`
    return { key: i, style: { transform, zIndex: i } }
  })
})

const stackLayers = computed(() => Math.min(STACK_DEPTH, props.handLength))
</script>

<template>
  <div
    class="fixed flex pointer-events-none"
    :class="{
      'inset-x-0 top-0 justify-center -translate-y-1/2': position === 'top',
      'inset-y-0 left-0 items-center -translate-x-1/2': position === 'left',
      'inset-y-0 right-0 items-center translate-x-1/2': position === 'right',
    }"
  >
    <div
      class="relative"
      :class="
        position === 'top'
          ? 'h-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*1065/769)] w-full max-w-5xl'
          : 'w-[calc(var(--card-base-width)*var(--card-scale,1)*0.75)] h-full max-h-[36rem]'
      "
    >
      <template v-if="isFanned">
        <PlayingCard
          v-for="layout in cardLayouts"
          :key="layout.key"
          back="red"
          class="!absolute !w-[calc(var(--card-base-width)*var(--card-scale,1)*0.75)]"
          :class="{
            '!top-0 !left-1/2': position === 'top',
            '!left-0 !top-1/2': position === 'left',
            '!right-0 !top-1/2': position === 'right',
          }"
          :style="layout.style"
        />
      </template>
      <div
        v-else
        class="absolute aspect-769/1065 w-[calc(var(--card-base-width)*var(--card-scale,1)*0.75)]"
        :class="{
          'top-0 left-1/2 -translate-x-1/2': position === 'top',
          'left-0 top-1/2 -translate-y-1/2': position === 'left',
          'right-0 top-1/2 -translate-y-1/2': position === 'right',
        }"
      >
        <PlayingCard
          v-for="n in stackLayers"
          :key="n"
          back="red"
          class="!absolute !inset-0"
          :style="{
            transform: `translate(${(n - 1) * 2}px, ${-(n - 1) * 2}px) rotate(${ROTATE_DEG[position]}deg)`,
          }"
        />
      </div>
    </div>
  </div>

  <span
    class="fixed pointer-events-none font-rs-bold text-card-white"
    :class="{
      'inset-x-0 text-center': position === 'top',
      'top-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*1065/769*0.5+0.5rem)]':
        position === 'top',
      'top-1/2 -translate-y-1/2': position !== 'top',
      // Unlike the cards and name, this stays upright rather than
      // rotating to match the side — rotated, a 2-digit count reads as
      // a near-illegible vertical stack of digits at this size.
      'left-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*0.5+0.5rem)]':
        position === 'left',
      'right-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*0.5+0.5rem)]':
        position === 'right',
    }"
  >
    {{ handLength }}
  </span>

  <button
    type="button"
    class="fixed appearance-none border-0 bg-transparent p-0 font-rs-bold text-lg disabled:cursor-default"
    :disabled="!clickable"
    :class="[
      clickable ? 'pointer-events-auto cursor-pointer hover:brightness-125' : 'pointer-events-none',
      isCurrentTurn
        ? 'text-rs-yellow [filter:drop-shadow(0_0_6px_var(--color-rs-yellow))]'
        : 'text-card-white',
      {
        // Positioned just past the fan/stack's visible half (see the
        // -translate-y-1/2 etc. above) so the name never sits under the
        // cards — offsets are calc()'d from the same scaled card
        // dimensions rather than a fixed guess, so this holds at any
        // --card-scale.
        'inset-x-0 text-center': position === 'top',
        'top-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*1065/769*0.5+2rem)]':
          position === 'top',
        'top-1/2 -translate-y-1/2': position !== 'top',
        // Rotated so the bottom of the text faces screen center on both
        // sides (mirror-image rotations, like the cards) rather than
        // reading sideways in the same direction on both edges.
        'left-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*0.5+2rem)] -rotate-90':
          position === 'left',
        'right-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*0.5+2rem)] rotate-90':
          position === 'right',
      },
    ]"
    @click="clickable && emit('select')"
  >
    {{ name }}
  </button>
</template>
