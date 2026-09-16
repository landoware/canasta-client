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
import type { GameStore } from '@/stores/game'
import { resolveHandCardOrigin } from '@/utils/handOrigin'
import { useCardFlight, rectOf } from '@/composables/useCardFlight'
import type { FlightRect } from '@/composables/useCardFlight'

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

      const origin = resolveHandCardOrigin(oldState, newTop.id, gameStore.mySeatIndex)
      const to = resolveDestination()
      if (!origin || !to) return

      if (!frozen.value) {
        frozenTopCard.value = oldTop
        frozen.value = true
      }
      revealQueue.push(newTop)

      flyCard({ card: newTop, from: origin.rect, to, rotateFrom: origin.rotate }).then(() => {
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
