<script setup>
defineProps(['label'])
</script>
<template>
  <button class="border-2 rounded-md p-2 bg-card-red">
    {{ label }}
  </button>
</template>
