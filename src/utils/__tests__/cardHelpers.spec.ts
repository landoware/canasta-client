import { describe, it, expect } from 'vitest'
import {
  cardPointValue,
  isValidNewMeld,
  isValidAddToMeld,
  isValidBurn,
  isValidRedThreePlay,
  isPileFrozen,
  isValidPileMatch,
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

describe('isValidAddToMeld', () => {
  it('accepts a card matching the meld rank', () => {
    const meld = { rank: Four, wildCount: 0 }
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Four }])).toBe(true)
  })

  it('rejects a card of a different, non-wild rank', () => {
    const meld = { rank: Four, wildCount: 0 }
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Eight }])).toBe(false)
  })

  it('accepts a wildcard regardless of the meld rank', () => {
    const meld = { rank: Four, wildCount: 0 }
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Two }])).toBe(true)
  })

  it('rejects a three even if the meld rank somehow matched', () => {
    const meld = { rank: Three, wildCount: 0 }
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Three }])).toBe(false)
  })

  it('rejects any wildcard added to a sevens meld', () => {
    const meld = { rank: Seven, wildCount: 0 }
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Two }])).toBe(false)
  })

  it('accepts a seven added to a sevens meld', () => {
    const meld = { rank: Seven, wildCount: 0 }
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Seven }])).toBe(true)
  })

  it('rejects a wildcard that would push the meld past 3 wilds total', () => {
    const meld = { rank: Four, wildCount: 3 }
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Two }])).toBe(false)
  })

  it('allows the 3rd wildcard but not a 4th, counted cumulatively across the batch', () => {
    const meld = { rank: Four, wildCount: 1 }
    const twoWilds = [
      { id: 1, suit: Hearts, rank: Two },
      { id: 2, suit: Diamonds, rank: Joker },
    ]
    expect(isValidAddToMeld(meld, twoWilds)).toBe(true) // 1 + 2 = 3, ok

    const threeWilds = [
      { id: 1, suit: Hearts, rank: Two },
      { id: 2, suit: Diamonds, rank: Joker },
      { id: 3, suit: Clubs, rank: Two },
    ]
    expect(isValidAddToMeld(meld, threeWilds)).toBe(false) // 1 + 3 = 4, over cap
  })

  it('rejects an empty selection', () => {
    const meld = { rank: Four, wildCount: 0 }
    expect(isValidAddToMeld(meld, [])).toBe(false)
  })

  it('an all-wild meld only accepts more wildcards, never a real rank, with no wildcard cap', () => {
    // Mirrors ValidateMeld's own "allWilds" allowance: unlike a normal
    // meld, an all-wild meld has no 3-wildcard ceiling at all.
    const meld = { rank: 14, wildCount: 3 } // Wild, already at what would
    // be the cap for a normal meld
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Two }])).toBe(true)
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Four }])).toBe(false)
  })

  it('an all-wild meld keeps accepting wildcards well past what would be the normal cap', () => {
    const meld = { rank: 14, wildCount: 10 } // Wild
    expect(isValidAddToMeld(meld, [{ id: 1, suit: Hearts, rank: Joker }])).toBe(true)
  })
})

describe('isValidBurn', () => {
  it('accepts a card matching the canasta rank', () => {
    const canasta = { rank: Four, natural: true, cards: [] }
    expect(isValidBurn(canasta, [{ id: 1, suit: Hearts, rank: Four }])).toBe(true)
  })

  it('rejects a card of a different, non-wild rank', () => {
    const canasta = { rank: Four, natural: true, cards: [] }
    expect(isValidBurn(canasta, [{ id: 1, suit: Hearts, rank: Eight }])).toBe(false)
  })

  it('accepts a wildcard onto a non-natural canasta', () => {
    const canasta = { rank: Four, natural: false, cards: [] }
    expect(isValidBurn(canasta, [{ id: 1, suit: Hearts, rank: Two }])).toBe(true)
  })

  it('rejects a wildcard onto a natural canasta', () => {
    const canasta = { rank: Four, natural: true, cards: [] }
    expect(isValidBurn(canasta, [{ id: 1, suit: Hearts, rank: Two }])).toBe(false)
  })

  it('rejects any burn onto a threes canasta', () => {
    const canasta = { rank: Three, natural: true, cards: [] }
    expect(isValidBurn(canasta, [{ id: 1, suit: Hearts, rank: Three }])).toBe(false)
  })

  it('rejects a wildcard onto a sevens canasta', () => {
    const canasta = { rank: Seven, natural: false, cards: [] }
    expect(isValidBurn(canasta, [{ id: 1, suit: Hearts, rank: Two }])).toBe(false)
  })

  it('accepts a seven onto a sevens canasta', () => {
    const canasta = { rank: Seven, natural: true, cards: [] }
    expect(isValidBurn(canasta, [{ id: 1, suit: Hearts, rank: Seven }])).toBe(true)
  })

  it('rejects a wildcard that would push the canasta past 3 wilds total', () => {
    const canasta = {
      rank: Four,
      natural: false,
      cards: [
        { id: 90, suit: Hearts, rank: Two },
        { id: 91, suit: Diamonds, rank: Two },
        { id: 92, suit: Clubs, rank: Joker },
      ],
    }
    expect(isValidBurn(canasta, [{ id: 1, suit: Hearts, rank: Two }])).toBe(false)
  })

  it('allows the 3rd wildcard but not a 4th, counted cumulatively across the batch', () => {
    const canasta = {
      rank: Four,
      natural: false,
      cards: [{ id: 90, suit: Hearts, rank: Two }],
    }
    const twoWilds = [
      { id: 1, suit: Hearts, rank: Two },
      { id: 2, suit: Diamonds, rank: Joker },
    ]
    expect(isValidBurn(canasta, twoWilds)).toBe(true) // 1 + 2 = 3, ok

    const threeWilds = [
      { id: 1, suit: Hearts, rank: Two },
      { id: 2, suit: Diamonds, rank: Joker },
      { id: 3, suit: Clubs, rank: Two },
    ]
    expect(isValidBurn(canasta, threeWilds)).toBe(false) // 1 + 3 = 4, over cap
  })

  it('rejects an empty selection', () => {
    const canasta = { rank: Four, natural: true, cards: [] }
    expect(isValidBurn(canasta, [])).toBe(false)
  })
})

describe('isPileFrozen', () => {
  it('is frozen when the top card is a three, red or black', () => {
    expect(isPileFrozen({ id: 1, suit: Hearts, rank: Three })).toBe(true)
    expect(isPileFrozen({ id: 2, suit: Clubs, rank: Three })).toBe(true)
  })

  it('is not frozen for any other rank', () => {
    expect(isPileFrozen({ id: 3, suit: Hearts, rank: Four })).toBe(false)
  })
})

describe('isValidPileMatch', () => {
  const topCard = { id: 1, suit: Hearts, rank: Four }

  it('requires at least 2 selected cards', () => {
    expect(isValidPileMatch(topCard, [{ id: 2, suit: Clubs, rank: Four }])).toBe(false)
  })

  it('matches when every selected card is the same rank as the top card', () => {
    expect(
      isValidPileMatch(topCard, [
        { id: 2, suit: Clubs, rank: Four },
        { id: 3, suit: Diamonds, rank: Four },
      ]),
    ).toBe(true)
  })

  it('rejects a rank mismatch', () => {
    expect(
      isValidPileMatch(topCard, [
        { id: 2, suit: Clubs, rank: Four },
        { id: 3, suit: Diamonds, rank: Eight },
      ]),
    ).toBe(false)
  })

  it('allows wild cards to fill in alongside matching-rank cards', () => {
    expect(
      isValidPileMatch(topCard, [
        { id: 2, suit: Clubs, rank: Four },
        { id: 3, suit: Hearts, rank: Two },
      ]),
    ).toBe(true)
  })

  it('is always frozen (rejected) when the top card is a three', () => {
    const frozenTop = { id: 1, suit: Clubs, rank: Three }
    expect(
      isValidPileMatch(frozenTop, [
        { id: 2, suit: Clubs, rank: Three },
        { id: 3, suit: Spades, rank: Three },
      ]),
    ).toBe(false)
  })

  it('requires an all-wild selection when the top card itself is wild', () => {
    const wildTop = { id: 1, suit: Hearts, rank: Two }
    expect(
      isValidPileMatch(wildTop, [
        { id: 2, suit: Clubs, rank: Two },
        { id: 3, suit: Hearts, rank: Joker },
      ]),
    ).toBe(true)
    expect(
      isValidPileMatch(wildTop, [
        { id: 2, suit: Clubs, rank: Two },
        { id: 3, suit: Hearts, rank: Four },
      ]),
    ).toBe(false)
  })
})

describe('isValidRedThreePlay', () => {
  it('accepts a single red three', () => {
    expect(isValidRedThreePlay([{ id: 1, suit: Hearts, rank: Three }])).toBe(true)
    expect(isValidRedThreePlay([{ id: 1, suit: Diamonds, rank: Three }])).toBe(true)
  })

  it('accepts multiple red threes at once', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Three },
      { id: 2, suit: Diamonds, rank: Three },
    ]
    expect(isValidRedThreePlay(cards)).toBe(true)
  })

  it('rejects a black three', () => {
    expect(isValidRedThreePlay([{ id: 1, suit: Clubs, rank: Three }])).toBe(false)
    expect(isValidRedThreePlay([{ id: 1, suit: Spades, rank: Three }])).toBe(false)
  })

  it('rejects any selection mixing a black three in with red ones', () => {
    const cards = [
      { id: 1, suit: Hearts, rank: Three },
      { id: 2, suit: Clubs, rank: Three },
    ]
    expect(isValidRedThreePlay(cards)).toBe(false)
  })

  it('rejects a non-three card', () => {
    expect(isValidRedThreePlay([{ id: 1, suit: Hearts, rank: Four }])).toBe(false)
  })

  it('rejects an empty selection', () => {
    expect(isValidRedThreePlay([])).toBe(false)
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
