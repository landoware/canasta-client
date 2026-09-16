import { ref, watch, type Ref } from 'vue'
import type { LobbySeat } from '@/types/protocol'

// Same "stable local order, splice on move" pattern as useSortableHand,
// simplified since the lobby is always exactly 4 slots and every
// players_lobby broadcast is a full replace — no add/remove bookkeeping
// needed, just re-sync to the latest snapshot.
export function useSortableSeats(seats: Ref<LobbySeat[]>) {
  const orderedSeats = ref<LobbySeat[]>([...seats.value]) as Ref<LobbySeat[]>

  watch(seats, (newSeats) => {
    orderedSeats.value = [...newSeats]
  })

  // Drag-to-reorder: moves one seat to an arbitrary table position, leaving
  // everything else in place.
  function moveSeat(seatIndex: number, toPosition: number): void {
    const current = orderedSeats.value
    const fromIndex = current.findIndex((s) => s.seatIndex === seatIndex)
    if (fromIndex === -1) return

    const next = [...current]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(Math.max(0, Math.min(toPosition, next.length)), 0, moved!)
    orderedSeats.value = next
  }

  return { orderedSeats, moveSeat }
}
