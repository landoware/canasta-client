<script setup lang="ts">
// Shared primitive every card-rendering component (deck, discard, hand,
// melds) reuses. Renders a card back by default; pass `card` to show its
// face instead.
import { computed } from 'vue'
import type { Card } from '@/types/canasta'
import { Joker } from '@/types/canasta'
import { cardImageUrl, cardBackUrl } from '@/utils/cardImages'
import { formatCard, isRed } from '@/utils/cardHelpers'
import { useSettingsStore } from '@/stores/settings'

interface Props {
  card?: Card
  back?: 'red' | 'blue'
  // Explicit override for compact (non-image) rendering — used by
  // MeldRow to forward FitToArea's shrink-to-fit signal, since raster
  // art blurs once a meld/canasta tile is scaled down, regardless of
  // the global cardScale setting below. ORs with that global check:
  // either trigger is enough to go compact.
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), { back: 'blue' })
const settings = useSettingsStore()

const imageUrl = computed(() =>
  props.card ? cardImageUrl(props.card) : cardBackUrl(props.back),
)

const altText = computed(() =>
  props.card ? formatCard(props.card) : `${props.back} card back`,
)

// The 769x1065px raster faces lose their baked-in index text once scaled
// below 1x, so a non-image face takes over automatically at that point
// (or whenever the explicit compact prop forces it — see above). Backs
// have no such text to lose, so they stay image-based regardless.
const isCompact = computed(() => props.compact === true || settings.cardScale < 1)

// A Joker's `suit` field is a meaningless placeholder (see
// cardImages.ts), so isRed/isBlack can't classify it — keep it the same
// red the old uniform text fallback used for every card.
const cornerColorClass = computed(() => {
  if (!props.card) return ''
  if (props.card.rank === Joker) return 'text-card-red'
  return isRed(props.card) ? 'text-card-red' : 'text-card-black'
})
</script>

<template>
  <div
    class="relative w-full aspect-769/1065 rounded-2xl overflow-hidden shadow-xl"
    role="img"
    :aria-label="altText"
  >
    <template v-if="!card">
      <!-- Backs stay image-based at any scale — there's no baked-in
           index text to lose legibility, just the decorative pattern. -->
      <img :src="imageUrl" :alt="altText" class="absolute inset-0 h-full w-full object-cover" />
    </template>
    <div v-else-if="isCompact" class="absolute inset-0 h-full w-full bg-card-white">
      <span
        class="absolute top-[8%] left-[8%] font-quill-caps leading-none text-[clamp(0.55rem,2vw,1rem)]"
        :class="cornerColorClass"
        >{{ formatCard(card) }}</span
      >
      <span
        class="absolute bottom-[8%] right-[8%] rotate-180 font-quill-caps leading-none text-[clamp(0.55rem,2vw,1rem)]"
        :class="cornerColorClass"
        >{{ formatCard(card) }}</span
      >
      <!-- Large center mark so the card reads at a glance even when
           tiny (e.g. a meld/canasta tile) — the corners alone are for
           a fanned hand, where only the corner peeks out. -->
      <span
        class="absolute inset-0 flex items-center justify-center font-quill-caps leading-none text-[clamp(1.5rem,6vw,3rem)]"
        :class="cornerColorClass"
        >{{ formatCard(card) }}</span
      >
    </div>
    <template v-else>
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="altText"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <div
        v-else
        class="absolute inset-0 h-full w-full bg-card-white flex items-center justify-center text-center p-2 font-quill-caps text-card-red text-[clamp(0.9rem,3vw,1.5rem)]"
      >
        {{ altText }}
      </div>
    </template>
  </div>
</template>
