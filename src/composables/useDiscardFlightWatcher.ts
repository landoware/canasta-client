// Detects a discard purely from state diffs (works identically for the
// mover's own discard and for watching another seat discard, since both
// arrive the same way: a wholesale gameState replacement) and drives a
// flight for it. Exposes displayTopCard, which CenterPile.vue should render
// instead of the store's raw discardTopCard — it freezes to the *old* top
// card for the duration of the flight, so the pile only visibly changes
// once the ghost lands, instead of popping to the new card while a
// duplicate ghost is still flying toward it.
import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Card } from '@/types/canasta'
import type { StateMessage } from '@/types/protocol'
import type { GameStore } from '@/stores/game'
import { otherSeatIndices, OTHER_HAND_ROTATE_DEG } from '@/utils/seatLayout'
import { useCardFlight } from '@/composables/useCardFlight'
import type { FlightRect } from '@/composables/useCardFlight'

// CSS transforms (rotate, scale, translate) never affect offsetWidth/Height —
// those stay the element's true, unrotated layout size — and a rotation
// pivots around the element's own center by default, so the bounding box's
// center point is still the right visual anchor. Building the rect from
// those two pieces (rather than the bounding box's own width/height
// directly) means this works correctly even for a rotated opponent card,
// where getBoundingClientRect() would otherwise report a swapped, unrotated
// footprint that doesn't match the card's real (portrait) shape.
function rectOf(el: Element | null | undefined): FlightRect | null {
  if (!(el instanceof HTMLElement)) return null
  const box = el.getBoundingClientRect()
  const width = el.offsetWidth
  const height = el.offsetHeight
  return {
    left: box.left + box.width / 2 - width / 2,
    top: box.top + box.height / 2 - height / 2,
    width,
    height,
  }
}

export function useDiscardFlightWatcher(gameStore: GameStore): {
  displayTopCard: ComputedRef<Card | undefined>
} {
  const { flyCard } = useCardFlight()

  // Freeze state: a plain FIFO queue (not reactive) tracks which card each
  // still-in-flight ghost will reveal on arrival, so two discards within
  // one flight's duration reveal in the right order instead of the second
  // arrival racing the first's completion.
  const frozenTopCard = ref<Card | undefined>()
  const frozen = ref(false)
  const revealQueue: Card[] = []

  function resolveOrigin(
    oldState: StateMessage,
    newTop: Card,
  ): { rect: FlightRect; rotate: number } | null {
    if (oldState.hand[newTop.id]) {
      const rect = rectOf(document.querySelector(`[data-card-id="${newTop.id}"]`))
      return rect ? { rect, rotate: 0 } : null
    }

    const seats = otherSeatIndices(gameStore.mySeatIndex ?? 0)
    const entry = (Object.entries(seats) as Array<[keyof typeof seats, number]>).find(
      ([, seatIndex]) => seatIndex === oldState.currentPlayer,
    )
    if (!entry) return null
    const position = entry[0] === 'partner' ? 'top' : entry[0]

    const container = document.querySelector(`[data-seat-hand="${position}"]`)
    const rect = rectOf(container?.lastElementChild)
    return rect ? { rect, rotate: OTHER_HAND_ROTATE_DEG[position] } : null
  }

  function resolveDestination(): FlightRect | null {
    return rectOf(document.querySelector('[data-discard-pile]'))
  }

  watch(
    () => gameStore.gameState,
    (newState, oldState) => {
      if (!oldState || !newState) return

      const oldTop = oldState.discardTopCard
      const newTop = newState.discardTopCard
      if (!newTop || newTop.id === oldTop?.id) return

      const origin = resolveOrigin(oldState, newTop)
      const to = resolveDestination()
      if (!origin || !to) return

      if (!frozen.value) {
        frozenTopCard.value = oldTop
        frozen.value = true
      }
      revealQueue.push(newTop)

      flyCard({ card: newTop, from: origin.rect, to, rotate: origin.rotate }).then(() => {
        frozenTopCard.value = revealQueue.shift()
        if (revealQueue.length === 0) frozen.value = false
      })
    },
    { flush: 'sync' },
  )

  const displayTopCard = computed(() =>
    frozen.value ? frozenTopCard.value : gameStore.discardTopCard,
  )

  return { displayTopCard }
}
