<script setup lang="ts">
import type { Card } from '@/types/canasta'
import PlayingCard from './PlayingCard.vue'

interface Props {
  topCard?: Card
  count: number
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), { disabled: false })
const emit = defineEmits<{ click: [] }>()

function handleClick(): void {
  if (!props.disabled) emit('click')
}
</script>

<template>
  <button
    type="button"
    class="relative aspect-769/1065 w-[calc(var(--card-base-width)*var(--card-scale,1)*0.75)] transition-transform disabled:opacity-50 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:-translate-y-1"
    :disabled="disabled"
    data-discard-pile
    :aria-label="`Discard pile, ${count} cards`"
    @click="handleClick"
  >
    <PlayingCard v-if="topCard" :card="topCard" />
    <div v-else class="absolute inset-0 rounded-2xl border-2 border-dashed border-card-white/40" />
    <span class="absolute -bottom-6 left-1/2 -translate-x-1/2 font-rs-bold text-card-white">{{
      count
    }}</span>
  </button>
</template>
