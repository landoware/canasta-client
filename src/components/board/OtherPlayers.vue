<script setup lang="ts">
// Store-aware wrapper, following CenterPile.vue's pattern: takes the store
// instance as a prop and translates it into props for the three dumb
// OtherPlayerHand instances (top/left/right).
import { computed } from 'vue'
import type { GameStore } from '@/stores/game'
import OtherPlayerHand from './OtherPlayerHand.vue'
import Button from '@/components/Button.vue'
import { otherSeatIndices, otherPlayerAtSeat } from '@/utils/seatLayout'
import { otherHandHalfWidthExpr } from '@/utils/handLayout'

const props = defineProps<{
  gameStore: GameStore
  // Demo-only: see GameView.vue's allowSeatSwitch, which is the only
  // place this is ever passed true.
  clickableNames?: boolean
}>()
const emit = defineEmits<{ 'select-seat': [seatIndex: number] }>()

const seats = computed(() => otherSeatIndices(props.gameStore.mySeatIndex ?? 0))

const players = computed(() => props.gameStore.gameState?.players ?? [])
const currentPlayer = computed(() => props.gameStore.gameState?.currentPlayer ?? -1)
const mySeatIndex = computed(() => props.gameStore.mySeatIndex ?? 0)

function playerAt(seatIndex: number) {
  const state = otherPlayerAtSeat(players.value, mySeatIndex.value, seatIndex)
  return {
    name: state?.name ?? '',
    handLength: state?.handLength ?? 0,
    hasFoot: state?.hasFoot ?? false,
    isCurrentTurn: currentPlayer.value === seatIndex,
  }
}

const partner = computed(() => playerAt(seats.value.partner))
const left = computed(() => playerAt(seats.value.left))
const right = computed(() => playerAt(seats.value.right))

// Sits just right of the partner's own hand edge — the top-seat analogue
// of GameView.vue's Sort button, which hugs the player's own hand the
// same way (50vw ± the hand's dynamic half-width).
const askToGoOutRightOffset = computed(
  () => `calc(50vw + ${otherHandHalfWidthExpr(partner.value.handLength)} + 1rem)`,
)
</script>

<template>
  <OtherPlayerHand
    position="top"
    :name="partner.name"
    :hand-length="partner.handLength"
    :has-foot="partner.hasFoot"
    :is-current-turn="partner.isCurrentTurn"
    :clickable="clickableNames"
    @select="emit('select-seat', seats.partner)"
  />
  <div v-if="gameStore.canAskToGoOut" class="fixed top-4" :style="{ right: askToGoOutRightOffset }">
    <Button label="Ask to go out" @click="gameStore.askToGoOut()" />
  </div>
  <OtherPlayerHand
    position="left"
    :name="left.name"
    :hand-length="left.handLength"
    :has-foot="left.hasFoot"
    :is-current-turn="left.isCurrentTurn"
    :clickable="clickableNames"
    @select="emit('select-seat', seats.left)"
  />
  <OtherPlayerHand
    position="right"
    :name="right.name"
    :hand-length="right.handLength"
    :has-foot="right.hasFoot"
    :is-current-turn="right.isCurrentTurn"
    :clickable="clickableNames"
    @select="emit('select-seat', seats.right)"
  />
</template>
