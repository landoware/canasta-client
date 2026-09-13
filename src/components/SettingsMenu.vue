<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore, MIN_CARD_SCALE, MAX_CARD_SCALE } from '@/stores/settings'

const settings = useSettingsStore()
const isOpen = ref(false)
</script>

<template>
  <button
    type="button"
    class="fixed top-4 left-4 z-50 flex flex-col gap-1.5 rounded-md bg-black/40 p-3 hover:bg-black/60"
    aria-label="Open settings"
    @click="isOpen = true"
  >
    <span class="block h-0.5 w-6 bg-card-white"></span>
    <span class="block h-0.5 w-6 bg-card-white"></span>
    <span class="block h-0.5 w-6 bg-card-white"></span>
  </button>

  <div v-if="isOpen" class="fixed inset-0 z-50 flex font-rs text-card-white">
    <div class="flex h-full w-72 flex-col gap-4 bg-card-table p-6 shadow-xl">
      <div class="flex items-center justify-between">
        <h2 class="font-rs-bold text-lg">Settings</h2>
        <button type="button" aria-label="Close settings" @click="isOpen = false">✕</button>
      </div>

      <label class="flex flex-col gap-2">
        <span>Card size ({{ settings.cardScale.toFixed(2) }}x)</span>
        <input
          v-model.number="settings.cardScale"
          type="range"
          :min="MIN_CARD_SCALE"
          :max="MAX_CARD_SCALE"
          step="0.05"
        />
      </label>
    </div>

    <button
      type="button"
      class="flex-1 bg-black/40"
      aria-label="Close settings"
      @click="isOpen = false"
    ></button>
  </div>
</template>
