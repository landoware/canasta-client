<script setup lang="ts">
// The lobby's 2x2 seat grid. Dragging is gated to the host (draggable
// prop) — reuses the pointer-events drag pattern from PlayerHand.vue, but
// unlike that 1D fan, this is a discrete 2x2 grid, so "which slot is under
// the pointer" is a hit-test against each slot's data-seat-position
// attribute rather than an offset formula.
import { ref, computed } from 'vue'
import type { LobbySeat } from '@/types/protocol'
import { useSortableSeats } from '@/composables/useSortableSeats'
import LobbyPlayerCard from './LobbyPlayerCard.vue'

const props = defineProps<{ seats: LobbySeat[]; draggable: boolean }>()
const emit = defineEmits<{ reorder: [order: number[]] }>()

const seatsRef = computed(() => props.seats)
const { orderedSeats, moveSeat } = useSortableSeats(seatsRef)

// How far the pointer has to move before a press counts as a drag rather
// than a click — same rationale as PlayerHand.vue's DRAG_THRESHOLD_PX.
const DRAG_THRESHOLD_PX = 6

type DragState = {
  seatIndex: number
  pointerId: number
  startClientX: number
  startClientY: number
  dragging: boolean
}
const dragState = ref<DragState | null>(null)

function onPointerDown(event: PointerEvent, seatIndex: number): void {
  if (!props.draggable) return
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  dragState.value = {
    seatIndex,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    dragging: false,
  }
}

function positionUnderPointer(event: PointerEvent): number | null {
  const el = document.elementFromPoint(event.clientX, event.clientY)
  const slot = el?.closest<HTMLElement>('[data-seat-position]')
  if (!slot) return null
  return Number(slot.dataset.seatPosition)
}

function onPointerMove(event: PointerEvent): void {
  const drag = dragState.value
  if (!drag || event.pointerId !== drag.pointerId) return

  const dx = event.clientX - drag.startClientX
  const dy = event.clientY - drag.startClientY
  if (!drag.dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
  dragState.value = { ...drag, dragging: true }

  const toPosition = positionUnderPointer(event)
  if (toPosition !== null) moveSeat(drag.seatIndex, toPosition)
}

function onPointerUp(event: PointerEvent): void {
  const drag = dragState.value
  if (!drag || event.pointerId !== drag.pointerId) return
  if (drag.dragging) {
    emit(
      'reorder',
      orderedSeats.value.map((s) => s.seatIndex),
    )
  }
  dragState.value = null
}

function onPointerCancel(event: PointerEvent): void {
  if (dragState.value?.pointerId !== event.pointerId) return
  dragState.value = null
}
</script>

<template>
  <div class="grid grid-cols-2 justify-center items-center gap-10">
    <div
      v-for="(seat, position) in orderedSeats"
      :key="seat.seatIndex"
      :data-seat-position="position"
      class="touch-none"
      :class="draggable ? 'cursor-grab' : ''"
      @pointerdown="onPointerDown($event, seat.seatIndex)"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >
      <LobbyPlayerCard
        :playerName="seat.name"
        :connected="seat.connected"
        :team="position % 2 === 0"
        :ready="seat.ready"
        :isHost="seat.isHost"
      />
    </div>
  </div>
</template>
