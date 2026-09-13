import { describe, it, expect } from 'vitest'
import { otherSeatIndices, otherPlayerAtSeat } from '../seatLayout'

describe('otherSeatIndices', () => {
  it('places left/partner/right at +1/+2/+3 seats mod 4', () => {
    expect(otherSeatIndices(0)).toEqual({ left: 1, partner: 2, right: 3 })
    expect(otherSeatIndices(1)).toEqual({ left: 2, partner: 3, right: 0 })
    expect(otherSeatIndices(2)).toEqual({ left: 3, partner: 0, right: 1 })
    expect(otherSeatIndices(3)).toEqual({ left: 0, partner: 1, right: 2 })
  })
})

describe('otherPlayerAtSeat', () => {
  // Mirrors internal/canasta/presentation.go's GetClientState: `players`
  // lists the other 3 seats in ascending absolute seat order, self skipped.
  it('maps array slots to seats for every viewing seat', () => {
    const seatNames = ['Seat0', 'Seat1', 'Seat2', 'Seat3']

    for (let mySeat = 0; mySeat < 4; mySeat++) {
      const otherSeats = [0, 1, 2, 3].filter((s) => s !== mySeat)
      const players = otherSeats.map((s) => seatNames[s])

      for (const seat of otherSeats) {
        expect(otherPlayerAtSeat(players, mySeat, seat)).toBe(seatNames[seat])
      }
    }
  })

  it('returns undefined for the viewer\'s own seat', () => {
    const players = ['Seat1', 'Seat2', 'Seat3']
    expect(otherPlayerAtSeat(players, 0, 0)).toBeUndefined()
  })
})
