<script setup lang="ts">
import { computed } from "vue";
import PlayingCard from "./PlayingCard.vue";

interface Props {
  count: number;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), { disabled: false });
const emit = defineEmits<{ draw: [] }>();

const isInteractive = computed(() => !props.disabled && props.count > 0);
const stackDepth = computed(() => Math.min(4, props.count));

function handleClick(): void {
  if (isInteractive.value) emit("draw");
}
</script>

<template>
  <button type="button"
    class="relative aspect-769/1065 w-[calc(var(--card-base-width)*var(--card-scale,1)*0.75)] transition-transform disabled:opacity-50 disabled:cursor-not-allowed enabled:cursor-pointer enabled:hover:-translate-y-1"
    :disabled="!isInteractive" :aria-label="`Draw pile, ${count} cards`" @click="handleClick">
    <PlayingCard v-for="n in stackDepth" :key="n" back="blue" class="!absolute !inset-0"
      :style="{ transform: `translate(${(n - 1) * 2}px, ${-(n - 1) * 2}px)` }" />
    <div v-if="count === 0" class="absolute inset-0 rounded-2xl border-2 border-dashed border-card-white/40" />
    <span class="absolute -bottom-6 left-1/2 -translate-x-1/2 font-rs-bold text-card-white">{{
      count
      }}</span>
  </button>
</template>
