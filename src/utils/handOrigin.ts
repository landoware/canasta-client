// Shared origin-resolution for "this card just left somebody's hand" — used
// by both useDiscardFlightWatcher (one card) and useMeldFlightWatcher
// (several cards at once). Works identically whether it's my own hand or an
// opponent/partner's, since every move that removes hand cards arrives the
// same way: a wholesale gameState snapshot replacement, diffed old vs. new.
import type { StateMessage } from '@/types/protocol'
import { otherSeatIndices, OTHER_HAND_ROTATE_DEG } from '@/utils/seatLayout'
import { rectOf } from '@/composables/useCardFlight'
import type { FlightRect } from '@/composables/useCardFlight'

export function resolveHandCardOrigin(
  oldState: StateMessage,
  cardId: number,
  mySeatIndex: number | null,
): { rect: FlightRect; rotate: number } | null {
  if (oldState.hand[cardId]) {
    const rect = rectOf(document.querySelector(`[data-card-id="${cardId}"]`))
    return rect ? { rect, rotate: 0 } : null
  }

  // Otherwise it's whichever seat is currently acting — discard is the only
  // move that ends a turn, so for a meld/add/burn (which never do) this is
  // still the acting seat in both old and new state alike.
  const seats = otherSeatIndices(mySeatIndex ?? 0)
  const entry = (Object.entries(seats) as Array<[keyof typeof seats, number]>).find(
    ([, seatIndex]) => seatIndex === oldState.currentPlayer,
  )
  if (!entry) return null
  const position = entry[0] === 'partner' ? 'top' : entry[0]

  const container = document.querySelector(`[data-seat-hand="${position}"]`)
  const rect = rectOf(container?.lastElementChild)
  return rect ? { rect, rotate: OTHER_HAND_ROTATE_DEG[position] } : null
}
