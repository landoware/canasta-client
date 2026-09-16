<script setup lang="ts">
// Teams aren't named server-side (Team has no `name` field on the wire) —
// team membership is reconstructed from fixed seat parity, the same way
// OtherPlayers.vue resolves partner/left/right names.
import { computed } from 'vue'
import type { GameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'
import { otherSeatIndices, otherPlayerAtSeat } from '@/utils/seatLayout'

const props = defineProps<{ gameStore: GameStore }>()
const settings = useSettingsStore()

const mySeatIndex = computed(() => props.gameStore.mySeatIndex ?? 0)
const seats = computed(() => otherSeatIndices(mySeatIndex.value))
const players = computed(() => props.gameStore.gameState?.players ?? [])

function nameAt(seatIndex: number): string {
  return otherPlayerAtSeat(players.value, mySeatIndex.value, seatIndex)?.name ?? ''
}

const myTeamName = computed(
  () => `${props.gameStore.gameState?.name ?? ''} & ${nameAt(seats.value.partner)}`,
)
const otherTeamName = computed(
  () => `${nameAt(seats.value.left)} & ${nameAt(seats.value.right)}`,
)

function toggle(): void {
  settings.showLiveScore = !settings.showLiveScore
}
</script>

<template>
  <div
    v-if="gameStore.isPlaying"
    class="fixed top-4 right-4 z-50 flex flex-col items-end gap-2 font-rs-bold text-card-white"
  >
    <button
      type="button"
      class="rounded-md bg-black/40 px-3 py-2 hover:bg-black/60"
      :aria-label="settings.showLiveScore ? 'Hide live score' : 'Show live score'"
      @click="toggle"
    >
      Score
    </button>

    <div
      v-if="settings.showLiveScore"
      class="flex flex-col gap-1 rounded-md bg-black/60 px-4 py-3 shadow-xl"
    >
      <div class="flex items-center justify-between gap-4">
        <span>{{ myTeamName }}</span>
        <span>{{ gameStore.myTeamScore }}</span>
      </div>
      <div class="flex items-center justify-between gap-4">
        <span>{{ otherTeamName }}</span>
        <span>{{ gameStore.opponentScore }}</span>
      </div>
    </div>
  </div>
</template>
