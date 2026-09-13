import { describe, it, expect } from 'vitest'
import { cardPointValue } from '../cardHelpers'
import { Hearts, Diamonds, Clubs, Spades, Four, Eight, Ace, Two, Joker, Three } from '@/types/canasta'

describe('cardPointValue', () => {
  it('matches internal/canasta/cards.go pointValues for plain ranks', () => {
    expect(cardPointValue({ id: 1, suit: Hearts, rank: Four })).toBe(5)
    expect(cardPointValue({ id: 2, suit: Hearts, rank: Eight })).toBe(10)
    expect(cardPointValue({ id: 3, suit: Hearts, rank: Ace })).toBe(20)
    expect(cardPointValue({ id: 4, suit: Hearts, rank: Two })).toBe(20)
    expect(cardPointValue({ id: 5, suit: Hearts, rank: Joker })).toBe(50)
  })

  it('scores a red three as +100', () => {
    expect(cardPointValue({ id: 6, suit: Hearts, rank: Three })).toBe(100)
    expect(cardPointValue({ id: 7, suit: Diamonds, rank: Three })).toBe(100)
  })

  it('scores a black three as -100, mirroring the server\'s custom rule', () => {
    expect(cardPointValue({ id: 8, suit: Clubs, rank: Three })).toBe(-100)
    expect(cardPointValue({ id: 9, suit: Spades, rank: Three })).toBe(-100)
  })
})
