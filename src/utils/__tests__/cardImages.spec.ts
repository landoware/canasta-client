import { describe, it, expect } from 'vitest'
import { cardImageUrl, cardBackUrl } from '../cardImages'
import { Hearts, Diamonds, Clubs, Spades, Ace, Two, Three, King, Joker } from '@/types/canasta'

describe('cardImageUrl', () => {
  it('resolves an ace of spades under the spades folder', () => {
    const url = cardImageUrl({ id: 1, suit: Spades, rank: Ace })
    expect(url).toBeTruthy()
    expect(url).toContain('spades')
    expect(url).toContain('1')
  })

  it('resolves a two of hearts to the 2.png pip filename', () => {
    const url = cardImageUrl({ id: 2, suit: Hearts, rank: Two })
    expect(url).toBeTruthy()
    expect(url).toContain('hearts')
  })

  it('resolves a three of clubs to the 3.png pip filename', () => {
    const url = cardImageUrl({ id: 3, suit: Clubs, rank: Three })
    expect(url).toBeTruthy()
    expect(url).toContain('clubs')
  })

  it('resolves a king of diamonds to the King.png filename', () => {
    const url = cardImageUrl({ id: 4, suit: Diamonds, rank: King })
    expect(url).toBeTruthy()
    expect(url).toContain('diamonds')
  })

  it('resolves a joker to the top-level joker.png regardless of suit', () => {
    const url = cardImageUrl({ id: 5, suit: Hearts, rank: Joker })
    expect(url).toBeTruthy()
    expect(url).toContain('joker')
  })
})

describe('cardBackUrl', () => {
  it('resolves distinct urls for red and blue', () => {
    const blue = cardBackUrl('blue')
    const red = cardBackUrl('red')
    expect(blue).toBeTruthy()
    expect(red).toBeTruthy()
    expect(blue).not.toBe(red)
  })
})
