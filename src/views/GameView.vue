<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'
import { useSortableHand } from '@/composables/useSortableHand'
import CenterPile from '@/components/board/CenterPile.vue'
import PlayerHand from '@/components/board/PlayerHand.vue'
import Button from '@/components/Button.vue'

// instanceId defaults to the main (single-player) store instance when
// unset, which is how vue-router mounts this for the real /game/:roomCode
// route. DemoView passes a specific seat's instanceId to reuse this same
// component for each of its 4 seats.
const props = defineProps<{ instanceId?: string }>()
const gameStore = useGameStore(props.instanceId)
const settings = useSettingsStore()

// Hand order is local UI state, not derived fresh from gameStore.myHand
// every render — see useSortableHand for why (keeps the arrangement
// stable across draws/discards instead of resorting to id order).
const myHand = computed(() => gameStore.myHand)
const { orderedCards: handCards, sort: sortHandNow } = useSortableHand(myHand)

function onSortClick(): void {
  sortHandNow(settings.sortMethod)
}

// The move model is "select card(s) in hand, then click where they go"
// (e.g. the discard pile). Selection lives here, not inside PlayerHand,
// because it has to be visible to whichever destination component is
// listening (CenterPile for discard today, melds later) — it's shared
// in-progress UI intent, not gameplay state itself.
const selectedCardIds = ref<Set<number>>(new Set())

function toggleCardSelection(id: number): void {
  const next = new Set(selectedCardIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedCardIds.value = next
}

// Discarding only ever targets exactly one card — null (rather than an
// arbitrary pick) when zero or several are selected, so CenterPile can't
// discard the "wrong" one of a multi-selection.
const singleSelectedCardId = computed<number | null>(() => {
  if (selectedCardIds.value.size !== 1) return null
  const [id] = selectedCardIds.value
  return id!
})

function clearSelection(): void {
  selectedCardIds.value = new Set()
}
</script>

<template>
  <CenterPile
    :game-store="gameStore"
    :selected-card-id="singleSelectedCardId"
    @discarded="clearSelection"
  />
  <PlayerHand :cards="handCards" :selected-ids="selectedCardIds" @toggle="toggleCardSelection" />
  <div class="fixed bottom-8 right-8">
    <Button label="Sort" @click="onSortClick" />
  </div>
</template>
