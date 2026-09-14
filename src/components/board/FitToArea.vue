<script setup lang="ts">
// Shrinks (never grows past 1x) its slot content to fit within
// maxWidth x maxHeight, by giving the content a fixed CSS width (so its
// own flex-wrap wraps exactly as it would in any normal container —
// wrapping itself is untouched) and applying a runtime-computed
// transform: scale() for height, since flex-wrap can't see a transform
// (it doesn't reflow). Used to keep TeamMelds/OpponentMelds's MeldRow
// rows from overlapping neighboring fixed-positioned board UI once a
// team accumulates enough melds/canastas.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  maxWidth: string
  maxHeight: string
}>()

const contentRef = ref<HTMLElement | null>(null)
const probeRef = ref<HTMLElement | null>(null)

const naturalHeightPx = ref(0)
const maxHeightPx = ref(0)

// 1 (no shrink) both before the first real measurement and whenever
// ResizeObserver isn't available (e.g. jsdom in tests that don't stub
// it) — never allowed to exceed 1, i.e. this only ever shrinks content,
// never grows it past its natural (--card-scale-driven) size.
const fitScale = computed(() => {
  if (!naturalHeightPx.value || !maxHeightPx.value) return 1
  return Math.min(1, maxHeightPx.value / naturalHeightPx.value)
})
const compact = computed(() => fitScale.value < 1)

let contentObserver: ResizeObserver | undefined
let probeObserver: ResizeObserver | undefined

onMounted(() => {
  if (typeof ResizeObserver === 'undefined') return // stays at fitScale 1

  // contentRect reflects the un-transformed layout box, so observing
  // the very element we also apply transform: scale() to below doesn't
  // create a feedback loop the way getBoundingClientRect() would.
  contentObserver = new ResizeObserver(([entry]) => {
    naturalHeightPx.value = entry?.contentRect.height ?? 0
  })
  // An invisible probe sized to maxWidth/maxHeight, purely so the
  // browser resolves vw/vh/clamp()/etc. to real px for us instead of
  // reimplementing CSS unit math in JS.
  probeObserver = new ResizeObserver(([entry]) => {
    maxHeightPx.value = entry?.contentRect.height ?? 0
  })
  if (contentRef.value) contentObserver.observe(contentRef.value)
  if (probeRef.value) probeObserver.observe(probeRef.value)
})

onBeforeUnmount(() => {
  contentObserver?.disconnect()
  probeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="probeRef"
    aria-hidden="true"
    class="pointer-events-none invisible fixed left-0 top-0"
    :style="{ width: maxWidth, height: maxHeight }"
  />
  <div
    ref="contentRef"
    :style="{ width: maxWidth, transform: `scale(${fitScale})`, transformOrigin: 'center' }"
  >
    <slot :fit-scale="fitScale" :compact="compact" />
  </div>
</template>
