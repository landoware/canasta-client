<script setup>
const props = defineProps({
  playerName: String,
  connected: Boolean,
  team: Boolean,
  ready: Boolean,
  isHost: Boolean,
})
</script>

<template>
  <div
    class="relative font-rs-bold border-2 rounded-xl p-3 min-w-15"
    :class="[connected ? 'border-green-500' : 'border-card-white', team ? 'bg-card-blue' : 'bg-card-red']"
  >
    <span v-if="isHost" class="absolute -top-2 -left-2 text-rs-yellow" title="Host">★</span>
    <span v-if="ready" class="absolute -top-2 -right-2 text-green-400" title="Ready">✓</span>
    {{ playerName ? playerName : "-" }}
  </div>
</template>
