<script setup lang="ts">
// One in-flight card's actual FLIP mechanics: mounts pinned exactly at
// `from`, then transitions to `to` via a transform (translate + scale, so it
// also handles flying between differently-scaled cards, e.g. an opponent's
// 0.75x hand up to a full-size discard pile). Everything else (queuing,
// removal) is CardFlightLayer's job — this component only knows how to fly
// once.
import { computed, onMounted, ref } from 'vue'
import type { Card } from '@/types/canasta'
import type { FlightRect } from '@/composables/useCardFlight'
import PlayingCard from './PlayingCard.vue'

const props = withDefaults(
  defineProps<{
    card?: Card
    back?: 'red' | 'blue'
    from: FlightRect
    to: FlightRect
    duration: number
    // Degrees the real card was resting at (e.g. an opponent seated
    // left/right) — the ghost starts here and animates to upright (0) as it
    // flies, instead of popping upright the instant it appears.
    rotate?: number
  }>(),
  { rotate: 0 },
)
const emit = defineEmits<{ arrived: [] }>()

// false until the double-rAF flip below fires: the ghost renders pinned at
// `from` with no transition for one paint, so the browser has something real
// to animate *from* before the transform (and its transition) kick in.
const playing = ref(false)
let settled = false

function settle(): void {
  if (settled) return
  settled = true
  emit('arrived')
}

onMounted(() => {
  // Two rAFs, not one: the first just guarantees we're past the paint that
  // shows the ghost at its start position — starting the transition inside
  // that same frame risks the browser coalescing it away.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      playing.value = true
    })
  })
  // Fallback in case transitionend never fires (e.g. the element is
  // display:none'd by an ancestor mid-flight) — settle() is idempotent.
  setTimeout(settle, props.duration + 100)
})

function onTransitionEnd(event: TransitionEvent): void {
  if (event.propertyName === 'transform') settle()
}

const pinStyle = computed(() => ({
  left: `${props.from.left}px`,
  top: `${props.from.top}px`,
  width: `${props.from.width}px`,
  height: `${props.from.height}px`,
}))

// Both branches share the same translate()/scale()/rotate() function order
// so the transition interpolates each component cleanly rather than jumping
// (mismatched transform lists don't animate predictably across browsers).
const transformStyle = computed(() => {
  if (!playing.value) {
    return { transform: `translate(0px, 0px) scale(1, 1) rotate(${props.rotate}deg)` }
  }
  const dx = props.to.left + props.to.width / 2 - (props.from.left + props.from.width / 2)
  const dy = props.to.top + props.to.height / 2 - (props.from.top + props.from.height / 2)
  const sx = props.to.width / props.from.width
  const sy = props.to.height / props.from.height
  return {
    transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotate(0deg)`,
    transitionDuration: `${props.duration}ms`,
  }
})
</script>

<template>
  <div
    class="fixed pointer-events-none transition-transform ease-out"
    :style="[pinStyle, transformStyle]"
    @transitionend="onTransitionEnd"
  >
    <PlayingCard :card="card" :back="back" />
  </div>
</template>
