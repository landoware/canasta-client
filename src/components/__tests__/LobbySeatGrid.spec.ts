import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LobbySeatGrid from '../LobbySeatGrid.vue'
import type { LobbySeat } from '@/types/protocol'

const alice: LobbySeat = { seatIndex: 0, name: 'Alice', connected: true, ready: false, isHost: true }
const bob: LobbySeat = { seatIndex: 1, name: 'Bob', connected: true, ready: false, isHost: false }
const carol: LobbySeat = { seatIndex: 2, name: 'Carol', connected: true, ready: false, isHost: false }
const dave: LobbySeat = { seatIndex: 3, name: 'Dave', connected: true, ready: false, isHost: false }

const seats = [alice, bob, carol, dave]

// @vue/test-utils' trigger() can't carry PointerEvent-only fields like
// clientX/clientY/pointerId through jsdom without hitting a getter-only
// TypeError, so drag gestures are dispatched by hand — same approach as
// PlayerHand.spec.ts.
async function firePointer(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: { pointerId: number; clientX: number; clientY: number },
): Promise<void> {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'pointerId', { value: init.pointerId })
  Object.defineProperty(event, 'clientX', { value: init.clientX })
  Object.defineProperty(event, 'clientY', { value: init.clientY })
  el.dispatchEvent(event)
  await nextTick()
}

// jsdom doesn't implement elementFromPoint at all (not even a stub), so it
// can't be vi.spyOn'd — it has to be assigned directly, standing in for
// "whichever slot is currently under the pointer" that a real browser
// would report.
function mockElementFromPoint(el: Element): void {
  document.elementFromPoint = vi.fn().mockReturnValue(el)
}

describe('LobbySeatGrid', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders one slot per seat', () => {
    const wrapper = mount(LobbySeatGrid, { props: { seats, draggable: true } })
    expect(wrapper.findAll('[data-seat-position]')).toHaveLength(4)
  })

  it('does not start a drag when draggable is false', async () => {
    const wrapper = mount(LobbySeatGrid, { props: { seats, draggable: false } })
    const slots = wrapper.findAll('[data-seat-position]')
    mockElementFromPoint(slots[1]!.element as Element)

    await firePointer(slots[0]!.element, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    await firePointer(slots[0]!.element, 'pointermove', { pointerId: 1, clientX: 100, clientY: 0 })
    await firePointer(slots[0]!.element, 'pointerup', { pointerId: 1, clientX: 100, clientY: 0 })

    expect(wrapper.emitted('reorder')).toBeUndefined()
  })

  it('does not emit reorder when movement stays under the drag threshold', async () => {
    const wrapper = mount(LobbySeatGrid, { props: { seats, draggable: true } })
    const slots = wrapper.findAll('[data-seat-position]')
    mockElementFromPoint(slots[1]!.element as Element)

    await firePointer(slots[0]!.element, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    await firePointer(slots[0]!.element, 'pointermove', { pointerId: 1, clientX: 2, clientY: 0 })
    await firePointer(slots[0]!.element, 'pointerup', { pointerId: 1, clientX: 2, clientY: 0 })

    expect(wrapper.emitted('reorder')).toBeUndefined()
  })

  it('emits reorder with the new seat order once the drag threshold is passed and dropped on another slot', async () => {
    const wrapper = mount(LobbySeatGrid, { props: { seats, draggable: true } })
    const slots = wrapper.findAll('[data-seat-position]')
    // Alice (position 0) is dragged onto Bob's slot (position 1).
    mockElementFromPoint(slots[1]!.element as Element)

    await firePointer(slots[0]!.element, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    await firePointer(slots[0]!.element, 'pointermove', { pointerId: 1, clientX: 20, clientY: 0 })
    await firePointer(slots[0]!.element, 'pointerup', { pointerId: 1, clientX: 20, clientY: 0 })

    expect(wrapper.emitted('reorder')).toEqual([
      [[bob.seatIndex, alice.seatIndex, carol.seatIndex, dave.seatIndex]],
    ])
  })

  it('ignores pointer events for a different, concurrent pointer id', async () => {
    const wrapper = mount(LobbySeatGrid, { props: { seats, draggable: true } })
    const slots = wrapper.findAll('[data-seat-position]')
    mockElementFromPoint(slots[1]!.element as Element)

    await firePointer(slots[0]!.element, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 })
    await firePointer(slots[0]!.element, 'pointermove', { pointerId: 2, clientX: 100, clientY: 0 })
    await firePointer(slots[0]!.element, 'pointerup', { pointerId: 1, clientX: 0, clientY: 0 })

    expect(wrapper.emitted('reorder')).toBeUndefined()
  })
})
