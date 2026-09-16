<script setup>
defineProps(['label', 'disabled'])
</script>
<template>
  <button :disabled="disabled"
    class="flex-1 font-rs-bold uppercase md:flex-none border-2 rounded-md p-2 bg-card-red hover:bg-red-800 min-w-30 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card-red">
    {{ label }}
  </button>
</template>
