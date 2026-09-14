<script setup lang="ts">
// Store-aware wrapper, following MyFoot.vue/CenterPile.vue's pattern.
// Renders a blocking Yes/No confirmation whenever this seat's partner
// has asked to go out (see gameStore.goOutRequest, set by
// handleGoOutRequested) — the first dialog of its kind in this app, so
// this follows SettingsMenu.vue's overlay + backdrop-button pattern
// rather than introducing a generic reusable Dialog component nothing
// else needs yet.
import type { GameStore } from '@/stores/game'

const props = defineProps<{ gameStore: GameStore }>()

// A backdrop click never silently grants — it's treated the same as an
// explicit No.
function respond(allow: boolean): void {
  props.gameStore.respondToGoOutRequest(allow)
}
</script>

<template>
  <div v-if="gameStore.goOutRequest" class="fixed inset-0 z-50 flex items-center justify-center font-rs text-card-white">
    <button
      type="button"
      class="absolute inset-0 bg-black/40"
      aria-label="Dismiss"
      @click="respond(false)"
    ></button>

    <div class="relative z-10 flex flex-col gap-4 rounded-md bg-card-table p-6 shadow-xl">
      <p class="text-lg">{{ gameStore.goOutRequest.askerName }} wants to go out. Allow?</p>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          class="rounded-md border-2 p-2 px-4 font-rs-bold uppercase hover:bg-white/10"
          @click="respond(false)"
        >
          No
        </button>
        <button
          type="button"
          class="rounded-md border-2 bg-card-red p-2 px-4 font-rs-bold uppercase hover:bg-red-800"
          @click="respond(true)"
        >
          Yes
        </button>
      </div>
    </div>
  </div>
</template>
