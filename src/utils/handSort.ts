import type { Card } from '@/types/canasta'
import { cardPointValue } from './cardHelpers'

export const SortRankAscending = 'rank-asc'
export const SortRankDescending = 'rank-desc'
export const SortPointValueAscending = 'points-asc'
export const SortPointValueDescending = 'points-desc'

export type SortMethod =
  | typeof SortRankAscending
  | typeof SortRankDescending
  | typeof SortPointValueAscending
  | typeof SortPointValueDescending

export const SORT_METHOD_OPTIONS: { value: SortMethod; label: string }[] = [
  { value: SortRankAscending, label: 'Rank (ascending)' },
  { value: SortRankDescending, label: 'Rank (descending)' },
  { value: SortPointValueAscending, label: 'Point value (ascending)' },
  { value: SortPointValueDescending, label: 'Point value (descending)' },
]

// Ties are broken by suit (rank sorts) or rank (point-value sorts, since
// several ranks share a point value) so repeated sorts are deterministic.
export function sortHand(cards: Card[], method: SortMethod): Card[] {
  const sorted = [...cards]
  switch (method) {
    case SortRankAscending:
      sorted.sort((a, b) => a.rank - b.rank || a.suit - b.suit)
      break
    case SortRankDescending:
      sorted.sort((a, b) => b.rank - a.rank || a.suit - b.suit)
      break
    case SortPointValueAscending:
      sorted.sort((a, b) => cardPointValue(a) - cardPointValue(b) || a.rank - b.rank)
      break
    case SortPointValueDescending:
      sorted.sort((a, b) => cardPointValue(b) - cardPointValue(a) || a.rank - b.rank)
      break
  }
  return sorted
}
