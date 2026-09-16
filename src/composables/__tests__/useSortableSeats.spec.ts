import { describe, it, expect } from 'vitest'
import { ref, nextTick } from 'vue'
import { useSortableSeats } from '../useSortableSeats'
import type { LobbySeat } from '@/types/protocol'

const alice: LobbySeat = { seatIndex: 0, name: 'Alice', connected: true, ready: false, isHost: true }
const bob: LobbySeat = { seatIndex: 1, name: 'Bob', connected: true, ready: false, isHost: false }
const carol: LobbySeat = { seatIndex: 2, name: 'Carol', connected: true, ready: false, isHost: false }

describe('useSortableSeats', () => {
  it('starts with the given order', () => {
    const seats = ref([alice, bob, carol])
    const { orderedSeats } = useSortableSeats(seats)
    expect(orderedSeats.value).toEqual([alice, bob, carol])
  })

  it('re-syncs to a fresh players_lobby snapshot', async () => {
    const seats = ref([alice, bob, carol])
    const { orderedSeats } = useSortableSeats(seats)

    seats.value = [carol, alice, bob]
    await nextTick()

    expect(orderedSeats.value).toEqual([carol, alice, bob])
  })

  describe('moveSeat', () => {
    it('moves a seat from the middle to the front', () => {
      const seats = ref([alice, bob, carol])
      const { orderedSeats, moveSeat } = useSortableSeats(seats)

      moveSeat(bob.seatIndex, 0)

      expect(orderedSeats.value).toEqual([bob, alice, carol])
    })

    it('moves a seat from the front to the end', () => {
      const seats = ref([alice, bob, carol])
      const { orderedSeats, moveSeat } = useSortableSeats(seats)

      moveSeat(alice.seatIndex, 2)

      expect(orderedSeats.value).toEqual([bob, carol, alice])
    })

    it('clamps an out-of-range target position to the end', () => {
      const seats = ref([alice, bob, carol])
      const { orderedSeats, moveSeat } = useSortableSeats(seats)

      moveSeat(alice.seatIndex, 99)

      expect(orderedSeats.value).toEqual([bob, carol, alice])
    })

    it('does nothing for a seatIndex that is not present', () => {
      const seats = ref([alice, bob, carol])
      const { orderedSeats, moveSeat } = useSortableSeats(seats)

      moveSeat(99, 0)

      expect(orderedSeats.value).toEqual([alice, bob, carol])
    })
  })
})
