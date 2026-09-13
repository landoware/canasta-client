<script setup lang="ts">
import type { Card } from '@/types/canasta'
import PlayingCard from './PlayingCard.vue'

defineProps<{
  topCard?: Card
  count: number
}>()
</script>

<template>
  <div class="relative aspect-769/1065 w-[calc(var(--card-base-width)*var(--card-scale,1))]">
    <PlayingCard v-if="topCard" :card="topCard" />
    <div
      v-else
      class="absolute inset-0 rounded-2xl border-2 border-dashed border-card-white/40"
    />
    <span class="absolute -bottom-6 left-1/2 -translate-x-1/2 font-rs-bold text-card-white">{{
      count
    }}</span>
  </div>
</template>
