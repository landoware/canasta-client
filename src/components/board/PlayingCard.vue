<script setup lang="ts">
// Shared primitive every card-rendering component (deck, discard, hand,
// melds) reuses. Renders a card back by default; pass `card` to show its
// face instead.
import { computed } from 'vue'
import type { Card } from '@/types/canasta'
import { cardImageUrl, cardBackUrl } from '@/utils/cardImages'
import { formatCard } from '@/utils/cardHelpers'

interface Props {
  card?: Card
  back?: 'red' | 'blue'
}

const props = withDefaults(defineProps<Props>(), { back: 'blue' })

const imageUrl = computed(() =>
  props.card ? cardImageUrl(props.card) : cardBackUrl(props.back),
)

const altText = computed(() =>
  props.card ? formatCard(props.card) : `${props.back} card back`,
)
</script>

<template>
  <div
    class="relative w-full aspect-769/1065 rounded-2xl overflow-hidden shadow-xl"
    role="img"
    :aria-label="altText"
  >
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
  </div>
</template>
