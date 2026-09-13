import type { Card, Rank } from '@/types/canasta'
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
  Joker,
  Three,
  Wild,
} from '@/types/canasta'

export const isWildCard = (card: Card): boolean => {
  return card.rank === Two || card.rank === Joker
}

export const isRedThree = (card: Card): boolean => {
  return card.rank === Three && (card.suit === Hearts || card.suit === Diamonds)
}

export const isBlackThree = (card: Card): boolean => {
  return card.rank === Three && (card.suit === Clubs || card.suit === Spades)
}

export const isRed = (card: Card): boolean => {
  return card.suit === Hearts || card.suit === Diamonds
}

export const isBlack = (card: Card): boolean => {
  return card.suit === Clubs || card.suit === Spades
}

export const cardsMatchRank = (cards: Card[]): boolean => {
  if (cards.length === 0) return false

  const firstNonWild = cards.find((c) => !isWildCard(c))
  if (!firstNonWild) return true // All wild cards match

  return cards.every((c) => isWildCard(c) || c.rank === firstNonWild.rank)
}

// Mirrors internal/canasta/cards.go's pointValues table and Card.Value() —
// black threes are the one negative case in this ruleset (a deliberate
// deviation from standard Canasta scoring), everything else including red
// threes is a plain positive value.
const POINT_VALUES: Partial<Record<number, number>> = {
  [Four]: 5,
  [Five]: 5,
  [Six]: 5,
  [Seven]: 5,
  [Eight]: 10,
  [Nine]: 10,
  [Ten]: 10,
  [Jack]: 10,
  [Queen]: 10,
  [King]: 10,
  [Ace]: 20,
  [Two]: 20,
  [Joker]: 50,
  [Three]: 100,
}

export const cardPointValue = (card: Card): number => {
  const value = POINT_VALUES[card.rank] ?? 0
  return card.rank === Three && isBlack(card) ? -value : value
}

// Mirrors internal/canasta/moves.go's Player.ValidateMeld — the server
// remains authoritative, this is only used to decide when to show the
// create-meld affordance client-side.
export const isValidNewMeld = (cards: Card[]): boolean => {
  if (cards.length < 3) return false
  if (cards.some((c) => c.rank === Three)) return false

  const nonWild = cards.filter((c) => !isWildCard(c))
  if (nonWild.length === 0) return true // all-wild melds have no wildcard cap

  const rank = nonWild[0]!.rank
  if (!nonWild.every((c) => c.rank === rank)) return false

  const wildCount = cards.length - nonWild.length
  if (rank === Seven && wildCount > 0) return false
  return wildCount <= 3
}

// Mirrors internal/canasta/moves.go's Game.AddToMeld exactly, including
// checking wildcard count cumulatively across the whole batch being added
// (the server increments meld.WildCount once per wild card in the loop
// and bails as soon as it exceeds 3) — except an all-wild meld, which has
// no wildcard cap at all, same as isValidNewMeld's allowance when the
// meld is first created. Works the same whether the meld is one of the
// player's staging melds or one of the team's official melds — the
// server now looks in both (see TeamMelds.vue).
export const isValidAddToMeld = (
  meld: { rank: Rank; wildCount: number },
  cards: Card[],
): boolean => {
  if (cards.length === 0) return false

  let wildCount = meld.wildCount
  for (const card of cards) {
    const wild = isWildCard(card)
    if (card.rank !== meld.rank && !wild) return false
    if (card.rank === Three) return false
    if (meld.rank === Seven && wild) return false
    if (wild) {
      wildCount++
      if (meld.rank !== Wild && wildCount > 3) return false
    }
  }
  return true
}

// Mirrors internal/canasta/canasta.go's meldRequirements — total staged
// meld points needed to go down, keyed by hand number. The game only ever
// runs hands 1-4 (see Game.EndHand); Infinity is a defensive fallback so
// an unexpected hand number hides the go-down button rather than
// wrongly showing it.
const MELD_REQUIREMENTS: Partial<Record<number, number>> = { 1: 50, 2: 90, 3: 120, 4: 150 }

// Mirrors internal/canasta/canasta.go's Meld.Score() — a plain sum of
// every card's point value, no canasta bonuses (those only apply to
// completed canastas, never to in-progress melds).
export const meldsPointTotal = (melds: { cards: Card[] }[]): number =>
  melds.reduce(
    (sum, meld) => sum + meld.cards.reduce((cardSum, card) => cardSum + cardPointValue(card), 0),
    0,
  )

export const meetsGoDownRequirement = (melds: { cards: Card[] }[], handNumber: number): boolean =>
  meldsPointTotal(melds) >= (MELD_REQUIREMENTS[handNumber] ?? Infinity)

export const formatCard = (card: Card): string => {
  const rankNames = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'Joker', '3']
  const suitSymbols = ['♥', '♦', '♣', '♠']

  const rankName = rankNames[card.rank] || '?'
  const suitSymbol = card.rank !== Joker ? suitSymbols[card.suit] : ''

  return `${rankName}${suitSymbol}`
}
