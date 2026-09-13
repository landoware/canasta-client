import type { Card } from '@/types/canasta'
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

export const formatCard = (card: Card): string => {
  const rankNames = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'Joker', '3']
  const suitSymbols = ['♥', '♦', '♣', '♠']

  const rankName = rankNames[card.rank] || '?'
  const suitSymbol = card.rank !== Joker ? suitSymbols[card.suit] : ''

  return `${rankName}${suitSymbol}`
}
