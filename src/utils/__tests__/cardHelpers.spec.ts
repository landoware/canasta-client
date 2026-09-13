import { describe, it, expect } from 'vitest'
import {
  cardPointValue,
  isValidNewMeld,
  meldsPointTotal,
  meetsGoDownRequirement,
} from '../cardHelpers'
import {
  Hearts,
  Diamonds,
  Clubs,
  Spades,
  Four,
  Seven,
  Eight,
  Ace,
  Two,
  Joker,
  Three,
} from '@/types/canasta'

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

describe('isValidNewMeld', () => {
  it('rejects fewer than 3 cards', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Four },
      { id: 2, suit: Diamonds, rank: Four },
    ]
    expect(isValidNewMeld(cards)).toBe(false)
  })

  it('accepts 3 same-rank cards', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Four },
      { id: 2, suit: Diamonds, rank: Four },
      { id: 3, suit: Clubs, rank: Four },
    ]
    expect(isValidNewMeld(cards)).toBe(true)
  })

  it('rejects any selection containing a three', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Three },
      { id: 2, suit: Diamonds, rank: Three },
      { id: 3, suit: Clubs, rank: Three },
    ]
    expect(isValidNewMeld(cards)).toBe(false)
  })

  it('rejects mismatched non-wild ranks', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Four },
      { id: 2, suit: Diamonds, rank: Four },
      { id: 3, suit: Clubs, rank: Eight },
    ]
    expect(isValidNewMeld(cards)).toBe(false)
  })

  it('rejects any wildcard in a sevens meld', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Seven },
      { id: 2, suit: Diamonds, rank: Seven },
      { id: 3, suit: Clubs, rank: Two },
    ]
    expect(isValidNewMeld(cards)).toBe(false)
  })

  it('accepts a sevens meld with no wildcards', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Seven },
      { id: 2, suit: Diamonds, rank: Seven },
      { id: 3, suit: Clubs, rank: Seven },
    ]
    expect(isValidNewMeld(cards)).toBe(true)
  })

  it('allows up to 3 wildcards in a normal meld', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Four },
      { id: 2, suit: Diamonds, rank: Two },
      { id: 3, suit: Clubs, rank: Two },
      { id: 4, suit: Spades, rank: Joker },
    ]
    expect(isValidNewMeld(cards)).toBe(true)
  })

  it('rejects more than 3 wildcards in a non-all-wild meld', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Four },
      { id: 2, suit: Diamonds, rank: Two },
      { id: 3, suit: Clubs, rank: Two },
      { id: 4, suit: Spades, rank: Joker },
      { id: 5, suit: Hearts, rank: Joker },
    ]
    expect(isValidNewMeld(cards)).toBe(false)
  })

  it('allows an all-wild meld with no cap', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Two },
      { id: 2, suit: Diamonds, rank: Joker },
      { id: 3, suit: Clubs, rank: Two },
      { id: 4, suit: Spades, rank: Joker },
      { id: 5, suit: Hearts, rank: Two },
    ]
    expect(isValidNewMeld(cards)).toBe(true)
  })
})

describe('meldsPointTotal', () => {
  it('sums every card across every meld with no canasta bonus', () => {
    const melds = [
      {
        cards: [
          { id: 1, suit: Hearts, rank: Four }, // 5
          { id: 2, suit: Diamonds, rank: Four }, // 5
        ],
      },
      {
        cards: [
          { id: 3, suit: Hearts, rank: Ace }, // 20
          { id: 4, suit: Clubs, rank: Three }, // -100 (black three)
        ],
      },
    ]
    expect(meldsPointTotal(melds)).toBe(5 + 5 + 20 - 100)
  })

  it('returns 0 for no melds', () => {
    expect(meldsPointTotal([])).toBe(0)
  })
})

describe('meetsGoDownRequirement', () => {
  it('matches internal/canasta/canasta.go meldRequirements per hand', () => {
    const fifty = [{ cards: Array.from({ length: 10 }, (_, i) => ({ id: i, suit: Hearts, rank: Four })) }]
    // 10 x 5pts = 50
    expect(meetsGoDownRequirement(fifty, 1)).toBe(true)
    expect(meetsGoDownRequirement(fifty, 2)).toBe(false) // hand 2 requires 90
  })

  it('rejects a total just below the threshold', () => {
    const fortyFive = [
      { cards: Array.from({ length: 9 }, (_, i) => ({ id: i, suit: Hearts, rank: Four })) },
    ]
    expect(meetsGoDownRequirement(fortyFive, 1)).toBe(false)
  })
})
