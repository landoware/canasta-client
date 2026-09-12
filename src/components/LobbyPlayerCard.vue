<script setup>
const props = defineProps({
  playerName: String,
  connected: Boolean,
  team: Boolean,
})
</script>

<template>
  <div
    class="font-rs-bold border-2 rounded-xl p-3 min-w-15"
    :class="[connected ? 'border-green-500' : 'border-card-white', team ? 'bg-card-blue' : 'bg-card-red']"
  >
    {{ playerName ? playerName : "-" }}
  </div>
</template>
