<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  useSettingsStore,
  MIN_CARD_SCALE,
  MAX_CARD_SCALE,
  MeldsPositionBottom,
  MeldsPositionTop,
} from "@/stores/settings";
import { useGameStore } from "@/stores/game";
import { useWebSocketStore } from "@/stores/websocket";
import { SORT_METHOD_OPTIONS } from "@/utils/handSort";
import Button from "@/components/Button.vue";

const settings = useSettingsStore();
const isOpen = ref(false);

const route = useRoute();
const router = useRouter();
const gameStore = useGameStore();
const wsStore = useWebSocketStore();

// Shown on the real game board (/game/:roomCode) and the demo (/demo,
// which reuses GameView itself) — /join/:roomCode (LobbyView) already has
// its own Leave button and doesn't need this one.
const isInGame = computed(() => route.path.startsWith("/game/") || route.path === "/demo");

function leaveGame(): void {
  // Mirrors LobbyView.vue's leave() exactly: there's no server-side
  // "vacate seat" — leaving just closes the connection, and the seat stays
  // reserved for this name if the room is reopened (see
  // internal/room.Room's disconnect handling), so the game continues
  // uninterrupted for the other 3 seats and this player can rejoin with
  // the same room code + name later.
  wsStore.disconnect();
  gameStore.clearGameState();
  isOpen.value = false;
  void router.push("/");
}
</script>

<template>
  <button type="button"
    class="fixed top-4 left-4 z-50 flex flex-col gap-1.5 rounded-md bg-black/40 p-3 hover:bg-black/60"
    aria-label="Open settings" @click="isOpen = true">
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
        <input v-model.number="settings.cardScale" type="range" :min="MIN_CARD_SCALE" :max="MAX_CARD_SCALE"
          step="0.05" />
      </label>

      <label class="flex flex-col gap-2">
        <span>Sorting method</span>
        <select v-model="settings.sortMethod" class="rounded-md p-2">
          <option v-for="option in SORT_METHOD_OPTIONS" :key="option.value" :value="option.value" class="text-black">
            {{ option.label }}
          </option>
        </select>
      </label>

      <label class="flex flex-col gap-2">
        <span>In-progress melds position</span>
        <select v-model="settings.meldsPosition" class="rounded-md p-2">
          <option :value="MeldsPositionBottom" class="text-black">Bottom (near your hand)</option>
          <option :value="MeldsPositionTop" class="text-black">Top (near partner's hand)</option>
        </select>
      </label>

      <!-- Wrapped in a plain (non-flex) div so Button's own flex-1 doesn't
           grow it to fill the panel's remaining height — mt-auto on this
           wrapper still pushes it to the bottom of the flex-col panel. -->
      <div v-if="isInGame" class="mt-auto">
        <Button label="Leave Game" class="w-full" @click="leaveGame()" />
      </div>
    </div>

    <button type="button" class="flex-1 bg-black/40" aria-label="Close settings" @click="isOpen = false"></button>
  </div>
</template>
