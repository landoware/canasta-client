import { describe, it, expect } from 'vitest'
import { ref, nextTick } from 'vue'
import { useSortableHand } from '../useSortableHand'
import { SortRankAscending } from '@/utils/handSort'
import { Hearts, Clubs, Four, Eight, Ace } from '@/types/canasta'

const four = { id: 1, suit: Hearts, rank: Four }
const eight = { id: 2, suit: Hearts, rank: Eight }
const ace = { id: 3, suit: Clubs, rank: Ace }

describe('useSortableHand', () => {
  it('starts with the given order', () => {
    const cards = ref([eight, four, ace])
    const { orderedCards } = useSortableHand(cards)
    expect(orderedCards.value).toEqual([eight, four, ace])
  })

  it('sort() reorders in place using the given method', () => {
    const cards = ref([eight, four, ace])
    const { orderedCards, sort } = useSortableHand(cards)

    sort(SortRankAscending)

    expect(orderedCards.value).toEqual([four, eight, ace])
  })

  it('appends newly-added cards at the end and keeps the existing arrangement', async () => {
    const cards = ref([eight, four])
    const { orderedCards, sort } = useSortableHand(cards)
    sort(SortRankAscending) // -> [four, eight]

    cards.value = [eight, four, ace] // simulates a draw adding `ace`
    await nextTick()

    expect(orderedCards.value).toEqual([four, eight, ace])
  })

  it('drops cards that are no longer present without disturbing the rest', async () => {
    const cards = ref([eight, four, ace])
    const { orderedCards, sort } = useSortableHand(cards)
    sort(SortRankAscending) // -> [four, eight, ace]

    cards.value = [four, ace] // simulates discarding `eight`
    await nextTick()

    expect(orderedCards.value).toEqual([four, ace])
  })

  describe('moveCard', () => {
    it('moves a card from the middle to the front', () => {
      const cards = ref([four, eight, ace])
      const { orderedCards, moveCard } = useSortableHand(cards)

      moveCard(eight.id, 0)

      expect(orderedCards.value).toEqual([eight, four, ace])
    })

    it('moves a card from the front to the end', () => {
      const cards = ref([four, eight, ace])
      const { orderedCards, moveCard } = useSortableHand(cards)

      moveCard(four.id, 2)

      expect(orderedCards.value).toEqual([eight, ace, four])
    })

    it('clamps an out-of-range target index to the end', () => {
      const cards = ref([four, eight, ace])
      const { orderedCards, moveCard } = useSortableHand(cards)

      moveCard(four.id, 99)

      expect(orderedCards.value).toEqual([eight, ace, four])
    })

    it('does nothing for a card id that is not in the hand', () => {
      const cards = ref([four, eight, ace])
      const { orderedCards, moveCard } = useSortableHand(cards)

      moveCard(999, 0)

      expect(orderedCards.value).toEqual([four, eight, ace])
    })
  })
})
