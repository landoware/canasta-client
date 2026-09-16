// Detects a real stock draw (drawFromDeck) purely from state diffs, distinct
// from the one other move that also touches the deck — a manual
// playRedThree with a hand-origin replacement draw (see the gate below).
// Animates the drawn real card(s) face-down from the deck to the drawing
// seat's hand, and any red three(s) automatically diverted by the server
// (see canasta-server's DrawFromDeck) face-up from the deck straight to the
// drawing team's red-three tile — never through the hand, matching what the
// server actually does.
//
// Exposes displayMyHand (my own hand minus still-in-flight drawn cards, so
// PlayerHand doesn't reveal a card's face before its face-down ghost lands)
// and displayMyRedThrees/displayOpponentRedThrees (frozen the same way melds
// are, until their ghosts land). Deliberately out of scope: animating manual
// playRedThree itself — see the plan for why, and why the gate below must
// not misidentify it as a stock draw.
import { computed, ref, watch } from 'vue'
import type { ComputedRef } from 'vue'
import type { Card } from '@/types/canasta'
import type { GameStore } from '@/stores/game'
import { RED_THREES_GROUP_ID } from '@/utils/cardHelpers'
import { otherPlayerAtSeat, OPPONENT_CANASTAS_ROTATE_DEG } from '@/utils/seatLayout'
import { resolveOtherSeatHandRect } from '@/utils/handOrigin'
import { useCardFlight, rectOf } from '@/composables/useCardFlight'
import type { FlightRect } from '@/composables/useCardFlight'

const STAGGER_MS = 50

function resolveRealCardDestination(
  actingSeat: number,
  mySeatIndex: number,
): { rect: FlightRect; rotate: number } | null {
  if (actingSeat === mySeatIndex) {
    const rect = rectOf(document.querySelector('[data-card-id]'))
    return rect ? { rect, rotate: 0 } : null
  }
  return resolveOtherSeatHandRect(actingSeat, mySeatIndex)
}

function resolveRedThreeDestination(isMine: boolean): { rect: FlightRect; rotate: number } | null {
  const rowSelector = isMine ? '[data-canastas-row="mine"]' : '[data-canastas-row="opponent"]'
  const rotate = isMine ? 0 : OPPONENT_CANASTAS_ROTATE_DEG

  const specific = rectOf(document.querySelector(`${rowSelector} [data-group-id="${RED_THREES_GROUP_ID}"]`))
  if (specific) return { rect: specific, rotate }
  // No red-three tile yet (this team's first one) — fall back to any other
  // sibling tile (a canasta) in the same row, same trick already validated
  // for melds' brand-new-group case. Skips only if the row is also
  // completely empty.
  const sibling = rectOf(document.querySelector(`${rowSelector} [data-group-id]`))
  return sibling ? { rect: sibling, rotate } : null
}

export function useDrawFlightWatcher(gameStore: GameStore): {
  displayMyHand: ComputedRef<Card[]>
  displayMyRedThrees: ComputedRef<Card[]>
  displayOpponentRedThrees: ComputedRef<Card[]>
} {
  const { flyCard } = useCardFlight()

  const frozenHandIds = ref(new Set<number>())

  const frozenMyRedThrees = ref<Card[] | null>(null)
  const frozenOpponentRedThrees = ref<Card[] | null>(null)
  let myRedThreesInFlight = 0
  let opponentRedThreesInFlight = 0

  function hideHandCard(id: number): void {
    const next = new Set(frozenHandIds.value)
    next.add(id)
    frozenHandIds.value = next
  }

  function revealHandCard(id: number): void {
    const next = new Set(frozenHandIds.value)
    next.delete(id)
    frozenHandIds.value = next
  }

  watch(
    () => gameStore.gameState,
    (newState, oldState) => {
      if (!oldState || !newState) return

      const mySeatIndex = gameStore.mySeatIndex ?? 0
      const actingSeat = newState.currentPlayer

      let handPurelyGrew: boolean
      let myGainedCards: Card[] = []
      let otherGainedCount = 0

      if (actingSeat === mySeatIndex) {
        const oldIds = new Set(Object.keys(oldState.hand).map(Number))
        const newIds = new Set(Object.keys(newState.hand).map(Number))
        handPurelyGrew = [...oldIds].every((id) => newIds.has(id))
        myGainedCards = [...newIds].filter((id) => !oldIds.has(id)).map((id) => newState.hand[id]!)
      } else {
        const oldP = otherPlayerAtSeat(oldState.players, mySeatIndex, actingSeat)
        const newP = otherPlayerAtSeat(newState.players, mySeatIndex, actingSeat)
        const delta = (newP?.handLength ?? 0) - (oldP?.handLength ?? 0)
        // Strict > 0, not >= 0: a manual (non-foot) playRedThree by an
        // opponent nets *exactly* zero hand-length change (removes k,
        // redraws k replacements) with a full deck — >= 0 would wrongly
        // admit that as a stock draw. The cost of staying strict is a rare
        // silent miss (deck nearly exhausted, every drawn card diverted to
        // red threes, net change of exactly 0 for a *real* draw too) —
        // that's an acceptable trade: no animation beats a wrong one.
        handPurelyGrew = delta > 0
        otherGainedCount = Math.max(delta, 0)
      }

      if (!(newState.deckCount < oldState.deckCount && handPurelyGrew)) return

      const isMine = actingSeat === mySeatIndex
      const myRedThreesGained = newState.ourRedThrees.slice(oldState.ourRedThrees.length)
      const opponentRedThreesGained = newState.otherRedThrees.slice(oldState.otherRedThrees.length)

      const origin = rectOf(document.querySelector('[data-deck-pile]'))
      if (!origin) return

      let delayIndex = 0

      for (const card of myRedThreesGained) {
        const destination = resolveRedThreeDestination(true)
        if (!destination) continue
        if (!frozenMyRedThrees.value) frozenMyRedThrees.value = oldState.ourRedThrees
        myRedThreesInFlight += 1
        flyCard({
          card,
          from: origin,
          to: destination.rect,
          rotateTo: destination.rotate,
          delay: delayIndex++ * STAGGER_MS,
        }).then(() => {
          myRedThreesInFlight -= 1
          if (myRedThreesInFlight <= 0) frozenMyRedThrees.value = null
        })
      }

      for (const card of opponentRedThreesGained) {
        const destination = resolveRedThreeDestination(false)
        if (!destination) continue
        if (!frozenOpponentRedThrees.value) frozenOpponentRedThrees.value = oldState.otherRedThrees
        opponentRedThreesInFlight += 1
        flyCard({
          card,
          from: origin,
          to: destination.rect,
          rotateTo: destination.rotate,
          delay: delayIndex++ * STAGGER_MS,
        }).then(() => {
          opponentRedThreesInFlight -= 1
          if (opponentRedThreesInFlight <= 0) frozenOpponentRedThrees.value = null
        })
      }

      const realDestination = resolveRealCardDestination(actingSeat, mySeatIndex)
      if (realDestination) {
        if (isMine) {
          myGainedCards.forEach((card) => {
            hideHandCard(card.id)
            flyCard({
              back: 'blue',
              from: origin,
              to: realDestination.rect,
              rotateTo: realDestination.rotate,
              delay: delayIndex++ * STAGGER_MS,
            }).then(() => revealHandCard(card.id))
          })
        } else {
          for (let i = 0; i < otherGainedCount; i++) {
            flyCard({
              back: 'blue',
              from: origin,
              to: realDestination.rect,
              rotateTo: realDestination.rotate,
              delay: delayIndex++ * STAGGER_MS,
            })
          }
        }
      }
    },
    { flush: 'sync' },
  )

  const displayMyHand = computed(() =>
    gameStore.myHand.filter((card) => !frozenHandIds.value.has(card.id)),
  )
  const displayMyRedThrees = computed(() => frozenMyRedThrees.value ?? gameStore.myRedThrees)
  const displayOpponentRedThrees = computed(
    () => frozenOpponentRedThrees.value ?? gameStore.opponentRedThrees,
  )

  return { displayMyHand, displayMyRedThrees, displayOpponentRedThrees }
}
