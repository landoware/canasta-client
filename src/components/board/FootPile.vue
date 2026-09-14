<script setup lang="ts">
// A player's foot — an 11-card reserve dealt alongside the hand, kept
// face-down until earned (see moves.go's PickUpFoot). Same capped-depth
// offset stack look as DeckPile, since the server never tells the
// client the foot's actual remaining count (only whether it's still
// down at all) — renders nothing once picked up.
import PlayingCard from './PlayingCard.vue'

interface Props {
  visible: boolean
  rotateDeg: number
  // Only ever true for the local player's own pile, before they've
  // made their first canasta — opponents' piles are never dimmed,
  // since the server doesn't expose their eligibility (by design, see
  // FootPile's callers).
  dimmed?: boolean
  // Only the local player's own pile is clickable; opponents' are a
  // plain, non-interactive display.
  clickable?: boolean
}

const props = withDefaults(defineProps<Props>(), { dimmed: false, clickable: false })
const emit = defineEmits<{ 'pick-up': [] }>()

const STACK_DEPTH = 4

function handleClick(): void {
  if (props.clickable) emit('pick-up')
}
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    v-if="visible"
    :type="clickable ? 'button' : undefined"
    class="relative aspect-769/1065 w-[calc(var(--card-base-width)*var(--card-scale,1)*0.75)]"
    :class="[
      clickable ? 'pointer-events-auto cursor-pointer hover:-translate-y-1' : 'pointer-events-none',
      dimmed ? 'opacity-50' : '',
    ]"
    :style="{ transform: `rotate(${rotateDeg}deg)` }"
    :aria-label="clickable ? 'Foot, pick up' : 'Foot'"
    @click="handleClick"
  >
    <PlayingCard
      v-for="n in STACK_DEPTH"
      :key="n"
      back="red"
      class="!absolute !inset-0"
      :style="{ transform: `translate(${(n - 1) * 2}px, ${-(n - 1) * 2}px)` }"
    />
  </component>
</template>
