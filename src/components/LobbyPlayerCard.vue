<script setup>
const props = defineProps({
  playerName: String,
  ready: Boolean,
})
</script>

<template>
  <div class="font-rs-bold bg-gray-800 border-2 border-card-white rounded-xl p-3 min-w-15"
    :class="{ ready: 'border-card-green' }">
    {{ playerName ? playerName : "-" }}
  </div>
</template>
