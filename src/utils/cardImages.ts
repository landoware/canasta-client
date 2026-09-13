import type { Card, Suit, Rank } from '@/types/canasta'
import {
  Hearts,
  Diamonds,
  Clubs,
  Spades,
  Four,
  Five,
  Six,
  Seven,
  Eight,
  Nine,
  Ten,
  Jack,
  Queen,
  King,
  Ace,
  Two,
  Three,
  Joker,
} from '@/types/canasta'

// import.meta.glob is project-root-relative and doesn't understand the '@'
// Vite alias — the leading '/src/...' is required here.
const cardAssets = import.meta.glob('/src/assets/cards/**/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const SUIT_FOLDERS: Record<Suit, string> = {
  [Hearts]: 'hearts',
  [Diamonds]: 'diamonds',
  [Clubs]: 'clubs',
  [Spades]: 'spades',
}

// Wild (14) is intentionally absent — it's never an actual Card.rank, only
// a rules concept (see cardHelpers.ts's isWildCard).
const RANK_FILENAMES: Partial<Record<Rank, string>> = {
  [Four]: '4',
  [Five]: '5',
  [Six]: '6',
  [Seven]: '7',
  [Eight]: '8',
  [Nine]: '9',
  [Ten]: '10',
  [Jack]: 'Jack',
  [Queen]: 'Queen',
  [King]: 'King',
  [Ace]: '1',
  [Two]: '2',
  [Three]: '3',
}

// cardImageUrl returns the face-image URL for card. Joker has no suit, so
// it resolves directly to the top-level joker.png rather than through the
// suit/rank folder lookup.
export function cardImageUrl(card: Card): string | undefined {
  if (card.rank === Joker) {
    return cardAssets['/src/assets/cards/joker.png']
  }
  const folder = SUIT_FOLDERS[card.suit]
  const filename = RANK_FILENAMES[card.rank]
  if (!folder || !filename) return undefined
  return cardAssets[`/src/assets/cards/${folder}/${filename}.png`]
}

export function cardBackUrl(color: 'red' | 'blue'): string {
  return cardAssets[`/src/assets/cards/${color}.png`]!
}
