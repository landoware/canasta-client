<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useSettingsStore } from '@/stores/settings'
import { useSortableHand } from '@/composables/useSortableHand'
import { useMeldFlightWatcher } from '@/composables/useMeldFlightWatcher'
import { useDrawFlightWatcher } from '@/composables/useDrawFlightWatcher'
import { handHalfWidthExpr } from '@/utils/handLayout'
import CenterPile from '@/components/board/CenterPile.vue'
import PlayerHand from '@/components/board/PlayerHand.vue'
import OtherPlayers from '@/components/board/OtherPlayers.vue'
import OpponentMelds from '@/components/board/OpponentMelds.vue'
import TeamMelds from '@/components/board/TeamMelds.vue'
import MyFoot from '@/components/board/MyFoot.vue'
import GoOutRequestDialog from '@/components/board/GoOutRequestDialog.vue'
import Button from '@/components/Button.vue'

// instanceId defaults to the main (single-player) store instance when
// unset, which is how vue-router mounts this for the real /game/:roomCode
// route. DemoView passes a specific seat's instanceId to reuse this same
// component for each of its 4 seats.
//
// allowSeatSwitch is also demo-only: left false (its default) for the real
// /game/:roomCode route, so a player's own name never renders as
// clickable there — DemoView is the only caller that ever sets it, to
// let clicking another player's name switch which seat you're playing.
const props = defineProps<{ instanceId?: string; allowSeatSwitch?: boolean }>()
const emit = defineEmits<{ 'select-seat': [seatIndex: number] }>()
const gameStore = useGameStore(props.instanceId)
const settings = useSettingsStore()

// Shared by TeamMelds (my team's melds/canastas) and OpponentMelds (the
// other team's) — owned here, one watcher per GameView instance, same
// reasoning as selectedCardIds below.
const { displayMyTeamMelds, displayMyTeamCanastas, displayOpponentMelds, displayOpponentCanastas } =
  useMeldFlightWatcher(gameStore)

// Owned here too, same reasoning — TeamMelds/OpponentMelds both need its
// red-threes output, and the hand fan needs displayMyHand instead of the
// live gameStore.myHand so a drawn card doesn't reveal its face before its
// face-down ghost lands.
const { displayMyHand, displayMyRedThrees, displayOpponentRedThrees } = useDrawFlightWatcher(gameStore)

// Hand order is local UI state, not derived fresh from gameStore.myHand
// every render — see useSortableHand for why (keeps the arrangement
// stable across draws/discards instead of resorting to id order).
const { orderedCards: handCards, sort: sortHandNow, moveCard } = useSortableHand(displayMyHand)

function onSortClick(): void {
  sortHandNow(settings.sortMethod)
}

// Sits just right of the hand's own right edge — see MyFoot.vue's
// mirror-image left-edge placement for the reasoning (hand is
// horizontally centered at 50vw; this tracks its half-width so it moves
// in/out as cards are drawn/discarded rather than sitting fixed).
const sortButtonLeftOffset = computed(
  () => `calc(50vw + ${handHalfWidthExpr(handCards.value.length)} + 1rem)`,
)

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
    :selected-card-ids="selectedCardIds"
    @played="clearSelection"
  />
  <OtherPlayers
    :game-store="gameStore"
    :clickable-names="allowSeatSwitch"
    @select-seat="emit('select-seat', $event)"
  />
  <OpponentMelds
    :game-store="gameStore"
    :display-melds="displayOpponentMelds"
    :display-canastas="displayOpponentCanastas"
    :display-red-threes="displayOpponentRedThrees"
  />
  <TeamMelds
    :game-store="gameStore"
    :selected-card-ids="selectedCardIds"
    :display-melds="displayMyTeamMelds"
    :display-canastas="displayMyTeamCanastas"
    :display-red-threes="displayMyRedThrees"
    @melded="clearSelection"
  />
  <PlayerHand
    :cards="handCards"
    :selected-ids="selectedCardIds"
    @toggle="toggleCardSelection"
    @reorder="moveCard"
  />
  <MyFoot :game-store="gameStore" />
  <GoOutRequestDialog :game-store="gameStore" />
  <div class="fixed bottom-4" :style="{ left: sortButtonLeftOffset }">
    <Button label="Sort" @click="onSortClick" />
  </div>
</template>
