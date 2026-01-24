<script setup>
const props = defineProps({
  playerName: String,
})
</script>

<template>
  <div class="font-rs-bold bg-gray-800 border-2 border-card-white rounded-xl p-3 min-w-15">
    {{ playerName ? playerName : "-" }}
  </div>
</template>
