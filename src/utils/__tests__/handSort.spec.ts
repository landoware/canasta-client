import { describe, it, expect } from 'vitest'
import {
  sortHand,
  SortRankAscending,
  SortRankDescending,
  SortPointValueAscending,
  SortPointValueDescending,
} from '../handSort'
import { Hearts, Clubs, Four, Eight, Ace, Joker, Three } from '@/types/canasta'

// Four=5pts, Eight=10pts, Ace=20pts, Joker=50pts, black Three=-100pts.
const four = { id: 1, suit: Hearts, rank: Four }
const eight = { id: 2, suit: Hearts, rank: Eight }
const ace = { id: 3, suit: Hearts, rank: Ace }
const joker = { id: 4, suit: Hearts, rank: Joker }
const blackThree = { id: 5, suit: Clubs, rank: Three }

const hand = [joker, four, blackThree, ace, eight]

describe('sortHand', () => {
  it('sorts by rank ascending using the raw rank enum order', () => {
    // Rank enum order: Four < ... < Ace < Two < Joker < Three
    expect(sortHand(hand, SortRankAscending)).toEqual([four, eight, ace, joker, blackThree])
  })

  it('sorts by rank descending', () => {
    expect(sortHand(hand, SortRankDescending)).toEqual([blackThree, joker, ace, eight, four])
  })

  it('sorts by point value ascending, including the negative black-three case', () => {
    expect(sortHand(hand, SortPointValueAscending)).toEqual([blackThree, four, eight, ace, joker])
  })

  it('sorts by point value descending', () => {
    expect(sortHand(hand, SortPointValueDescending)).toEqual([joker, ace, eight, four, blackThree])
  })

  it('does not mutate the input array', () => {
    const original = [...hand]
    sortHand(hand, SortRankAscending)
    expect(hand).toEqual(original)
  })
})
