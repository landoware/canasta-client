import { ref, watch, type Ref } from 'vue'
import type { Card } from '@/types/canasta'
import { sortHand, type SortMethod } from '@/utils/handSort'

// Keeps the hand's on-screen order stable across incidental state updates
// (a draw, a discard) instead of snapping to gameStore.myHand's arbitrary
// id-derived order every time — newly-appeared cards are appended at the
// end, cards that left the hand drop out, and everything else stays where
// the player left it until they press Sort again.
export function useSortableHand(cards: Ref<Card[]>) {
  const orderedCards = ref<Card[]>([...cards.value]) as Ref<Card[]>

  watch(cards, (newCards) => {
    const byId = new Map(newCards.map((card) => [card.id, card]))
    const kept = orderedCards.value.filter((card) => byId.has(card.id))
    const keptIds = new Set(kept.map((card) => card.id))
    const added = newCards.filter((card) => !keptIds.has(card.id))
    orderedCards.value = [...kept, ...added]
  })

  function sort(method: SortMethod): void {
    orderedCards.value = sortHand(orderedCards.value, method)
  }

  return { orderedCards, sort }
}
