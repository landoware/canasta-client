import type { Card } from '@/types/game'
import { Hearts, Diamonds, Clubs, Spades, Two, Joker, Three } from '@/types/game'

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

export const formatCard = (card: Card): string => {
  const rankNames = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'Joker', '3']
  const suitSymbols = ['♥', '♦', '♣', '♠']

  const rankName = rankNames[card.rank] || '?'
  const suitSymbol = card.rank !== Joker ? suitSymbols[card.suit] : ''

  return `${rankName}${suitSymbol}`
}
