// Detects newMeld/addToMeld/burnCards purely from state diffs (mirrors
// useDiscardFlightWatcher's approach, generalized to several simultaneous
// cards landing on a meld/canasta tile instead of one card landing on the
// discard pile). Exposes four display-frozen lists — displayMyTeamMelds,
// displayMyTeamCanastas, displayOpponentMelds, displayOpponentCanastas —
// which TeamMelds.vue/OpponentMelds.vue render instead of the store's raw
// values, so a tile doesn't pop to its final card count before its cards'
// flights land.
//
// Deliberately out of scope (see the plan): playRedThree (hand/foot origin
// ambiguity, no opponent red-threes UI to land on) and pickUpDiscardPile (a
// compound hand+pile+meld move). goDown never moves cards out of a hand, so
// it never produces a diff here at all.
import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Card, Meld, Canasta } from '@/types/canasta'
import type { StateMessage } from '@/types/protocol'
import type { GameStore } from '@/stores/game'
import { resolveHandCardOrigin } from '@/utils/handOrigin'
import { useCardFlight, rectOf } from '@/composables/useCardFlight'
import type { FlightRect } from '@/composables/useCardFlight'

type Group = { id: number; cards: Card[] }
type Category = 'meld' | 'canasta'

interface Batch {
  groupId: number
  newCards: Card[]
  // undefined = this group id didn't exist before at all (a brand new
  // meld — a canasta is never brand new, it's always promoted from an
  // existing meld id, so this is only ever undefined for category 'meld').
  oldCards: Card[] | undefined
  isMine: boolean
  category: Category
}

const STAGGER_MS = 50

// OpponentMelds.vue rotates its two bands independently of any specific
// seat (melds always on the left at -90deg, canastas always on the right
// at +90deg — see its own comment), unlike an opponent's *hand*, which
// rotates per seat position. TeamMelds.vue's own bands are never rotated.
const OPPONENT_MELDS_ROTATE_DEG = -90
const OPPONENT_CANASTAS_ROTATE_DEG = 90

function idsOf(cards: Card[]): Set<number> {
  return new Set(cards.map((c) => c.id))
}

// A meld's id is carried unchanged through addToMeld and through promotion
// to a canasta (via goDown or via addToMeld crossing 7 cards) — see
// moves.go's NewCanasta, which explicitly carries the id forward. Looking
// an id up across BOTH old arrays (not just the matching category) is what
// lets a promoted meld's already-resident cards be recognized as "already
// here" instead of the whole canasta reading as newly arrived.
function oldCardsById(oldMelds: Group[], oldCanastas: Group[]): Map<number, Card[]> {
  const map = new Map<number, Card[]>()
  for (const g of oldMelds) map.set(g.id, g.cards)
  for (const g of oldCanastas) map.set(g.id, g.cards)
  return map
}

function diffCategory(
  oldMelds: Group[],
  oldCanastas: Group[],
  groups: Group[],
  category: Category,
  isMine: boolean,
): Batch[] {
  const oldById = oldCardsById(oldMelds, oldCanastas)
  const batches: Batch[] = []
  for (const group of groups) {
    const oldCards = oldById.get(group.id)
    const oldIds = oldCards ? idsOf(oldCards) : new Set<number>()
    const newCards = group.cards.filter((c) => !oldIds.has(c.id))
    if (newCards.length > 0) {
      batches.push({ groupId: group.id, newCards, oldCards, isMine, category })
    }
  }
  return batches
}

function resolveDestination(batch: Batch): { rect: FlightRect; rotate: number } | null {
  const rotate = batch.isMine
    ? 0
    : batch.category === 'meld'
      ? OPPONENT_MELDS_ROTATE_DEG
      : OPPONENT_CANASTAS_ROTATE_DEG

  if (batch.oldCards !== undefined) {
    const rect = rectOf(document.querySelector(`[data-group-id="${batch.groupId}"]`))
    return rect ? { rect, rotate } : null
  }
  // No tile exists yet for a brand-new meld. The row container itself is
  // NOT a usable stand-in — it's a plain block-level flex-wrap div, so its
  // rect is however wide FitToArea allotted it regardless of how few tiles
  // are actually inside (this previously produced a ghost stretched into a
  // huge horizontal bar). Anchor to an existing sibling tile in the same
  // row instead — correctly card-shaped, and already reflects that row's
  // real rotation/FitToArea scale via the same rectOf() used for the
  // existing-group case above. A team's very first meld of a hand, with no
  // sibling tile to anchor to, is the one case this can't measure — that
  // batch is simply skipped, same as any other missing-element case; every
  // meld after the first animates normally.
  const rowSelector = batch.isMine ? '[data-melds-row="mine"]' : '[data-melds-row="opponent"]'
  const rect = rectOf(document.querySelector(`${rowSelector} [data-group-id]`))
  return rect ? { rect, rotate } : null
}

export function useMeldFlightWatcher(gameStore: GameStore): {
  displayMyTeamMelds: ComputedRef<Meld[]>
  displayMyTeamCanastas: ComputedRef<Canasta[]>
  displayOpponentMelds: ComputedRef<Meld[]>
  displayOpponentCanastas: ComputedRef<Canasta[]>
} {
  const { flyCard } = useCardFlight()

  // null override = "this group doesn't exist yet, omit it"; an array
  // override = "show these (old) cards instead of the live ones". Cleared
  // once every ghost for that group id has landed — unlike discard's
  // reveal queue, there's nothing specific to remember to reveal, just "is
  // it safe to stop overriding yet", since the live gameStore value is
  // always correct once every in-flight card for that id has arrived.
  const groupOverrides = ref(new Map<number, Card[] | null>())
  const inFlightCounts = new Map<number, number>()

  function startBatch(batch: Batch, oldState: StateMessage): void {
    const destination = resolveDestination(batch)
    if (!destination) return

    const resolved = batch.newCards
      .map((card) => ({ card, origin: resolveHandCardOrigin(oldState, card.id, gameStore.mySeatIndex) }))
      .filter((f): f is { card: Card; origin: { rect: FlightRect; rotate: number } } => f.origin !== null)
    if (resolved.length === 0) return

    if (!groupOverrides.value.has(batch.groupId)) {
      const next = new Map(groupOverrides.value)
      next.set(batch.groupId, batch.oldCards ?? null)
      groupOverrides.value = next
    }
    inFlightCounts.set(batch.groupId, (inFlightCounts.get(batch.groupId) ?? 0) + resolved.length)

    resolved.forEach(({ card, origin }, index) => {
      flyCard({
        card,
        from: origin.rect,
        to: destination.rect,
        rotateFrom: origin.rotate,
        rotateTo: destination.rotate,
        delay: index * STAGGER_MS,
      }).then(() => {
        const remaining = (inFlightCounts.get(batch.groupId) ?? 1) - 1
        if (remaining <= 0) {
          inFlightCounts.delete(batch.groupId)
          const next = new Map(groupOverrides.value)
          next.delete(batch.groupId)
          groupOverrides.value = next
        } else {
          inFlightCounts.set(batch.groupId, remaining)
        }
      })
    })
  }

  watch(
    () => gameStore.gameState,
    (newState, oldState) => {
      if (!oldState || !newState) return

      const batches: Batch[] = [
        ...diffCategory(oldState.ourMelds, oldState.ourCanastas, newState.ourMelds, 'meld', true),
        ...diffCategory(oldState.ourMelds, oldState.ourCanastas, newState.ourCanastas, 'canasta', true),
        ...diffCategory(oldState.otherMelds, oldState.otherCanastas, newState.otherMelds, 'meld', false),
        ...diffCategory(oldState.otherMelds, oldState.otherCanastas, newState.otherCanastas, 'canasta', false),
      ]

      for (const batch of batches) startBatch(batch, oldState)
    },
    { flush: 'sync' },
  )

  function applyOverrides<T extends Group>(groups: T[]): T[] {
    const overrides = groupOverrides.value
    const result: T[] = []
    for (const group of groups) {
      if (!overrides.has(group.id)) {
        result.push(group)
        continue
      }
      const override = overrides.get(group.id)
      if (override !== null) result.push({ ...group, cards: override! })
    }
    return result
  }

  const displayMyTeamMelds = computed(() => applyOverrides(gameStore.myTeamMelds))
  const displayMyTeamCanastas = computed(() => applyOverrides(gameStore.myTeamCanastas))
  const displayOpponentMelds = computed(() => applyOverrides(gameStore.opponentMelds))
  const displayOpponentCanastas = computed(() => applyOverrides(gameStore.opponentCanastas))

  return { displayMyTeamMelds, displayMyTeamCanastas, displayOpponentMelds, displayOpponentCanastas }
}
