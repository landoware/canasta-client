import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import PlayerHand from '../PlayerHand.vue'
import { Hearts, Diamonds, Clubs, Four, Five, Six } from '@/types/canasta'

const cards = [
  { id: 1, suit: Hearts, rank: Four },
  { id: 2, suit: Diamonds, rank: Five },
  { id: 3, suit: Clubs, rank: Six },
]

// @vue/test-utils' trigger() can't carry PointerEvent-only fields like
// clientX/pointerId through jsdom without hitting a getter-only-property
// TypeError, so drag gestures are dispatched by hand instead.
async function firePointer(
  el: Element,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: { pointerId: number; clientX: number },
): Promise<void> {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'pointerId', { value: init.pointerId })
  Object.defineProperty(event, 'clientX', { value: init.clientX })
  el.dispatchEvent(event)
  await nextTick()
}

describe('PlayerHand', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders one button per card', () => {
    const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set<number>() } })
    expect(wrapper.findAll('button')).toHaveLength(3)
  })

  it('reflects the selectedIds prop rather than owning selection itself', () => {
    const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set([2]) } })
    const buttons = wrapper.findAll('button')

    expect(buttons[0]!.attributes('data-selected')).toBe('false')
    expect(buttons[1]!.attributes('data-selected')).toBe('true')
    expect(buttons[2]!.attributes('data-selected')).toBe('false')
  })

  it('emits toggle with the clicked card id instead of mutating state itself', async () => {
    const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set<number>() } })
    const [first] = wrapper.findAll('button')

    await first!.trigger('click')

    expect(wrapper.emitted('toggle')).toEqual([[1]])
    // Selection is controlled — clicking alone shouldn't change the
    // rendered state until the parent feeds a new selectedIds prop back in.
    expect(first!.attributes('data-selected')).toBe('false')
  })

  it('lifts a selected card by 20% and a hovered card by 10%, additively when both', async () => {
    const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set([1]) } })
    const [first] = wrapper.findAll('button')

    expect(first!.attributes('style')).toContain('-20%)')

    await first!.trigger('mouseenter')
    expect(first!.attributes('style')).toContain('-30%)')

    await first!.trigger('mouseleave')
    expect(first!.attributes('style')).toContain('-20%)')
  })

  it('never raises a card above its own fan index, so it stays under its right-hand neighbor', async () => {
    const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set([1]) } })
    const [first] = wrapper.findAll('button')

    await first!.trigger('mouseenter')

    expect(first!.attributes('style')).toContain('z-index: 0')
  })

  describe('drag to reorder', () => {
    const CARD_SPACING_PX = 30

    // A real browser always finishes a mouse (or keyboard) press with a
    // native `click` after pointerup — these tests fire one explicitly,
    // just like the browser would, rather than only the pointer events.

    it('emits toggle instead of reorder when the pointer never moves', async () => {
      const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set<number>() } })
      const [first] = wrapper.findAll('button')

      await firePointer(first!.element, 'pointerdown', { pointerId: 1, clientX: 100 })
      await firePointer(first!.element, 'pointerup', { pointerId: 1, clientX: 100 })
      await first!.trigger('click')

      expect(wrapper.emitted('toggle')).toEqual([[1]])
      expect(wrapper.emitted('reorder')).toBeUndefined()
    })

    it('emits toggle, not reorder, when movement stays under the drag threshold', async () => {
      const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set<number>() } })
      const [first] = wrapper.findAll('button')

      await firePointer(first!.element, 'pointerdown', { pointerId: 1, clientX: 100 })
      await firePointer(first!.element, 'pointermove', { pointerId: 1, clientX: 102 })
      await firePointer(first!.element, 'pointerup', { pointerId: 1, clientX: 102 })
      await first!.trigger('click')

      expect(wrapper.emitted('toggle')).toEqual([[1]])
      expect(wrapper.emitted('reorder')).toBeUndefined()
    })

    it('a second, unrelated click still toggles normally after an earlier plain click', async () => {
      // Regression check: selection must keep working click after click,
      // not just once — a stale "was that a drag?" flag left set after
      // the first click would silently eat every click after it.
      const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set<number>() } })
      const [first, second] = wrapper.findAll('button')

      await firePointer(first!.element, 'pointerdown', { pointerId: 1, clientX: 100 })
      await firePointer(first!.element, 'pointerup', { pointerId: 1, clientX: 100 })
      await first!.trigger('click')

      await firePointer(second!.element, 'pointerdown', { pointerId: 2, clientX: 200 })
      await firePointer(second!.element, 'pointerup', { pointerId: 2, clientX: 200 })
      await second!.trigger('click')

      expect(wrapper.emitted('toggle')).toEqual([[1], [2]])
    })

    it('emits reorder with the target slot once the drag threshold is passed, and the trailing click does not also toggle', async () => {
      const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set<number>() } })
      const [first] = wrapper.findAll('button')

      await firePointer(first!.element, 'pointerdown', { pointerId: 1, clientX: 100 })
      // Card 0 dragged right by more than one card-width -> lands on slot 1.
      await firePointer(first!.element, 'pointermove', {
        pointerId: 1,
        clientX: 100 + CARD_SPACING_PX + 5,
      })
      await firePointer(first!.element, 'pointerup', {
        pointerId: 1,
        clientX: 100 + CARD_SPACING_PX + 5,
      })
      // The browser fires this regardless of the drag — must not toggle.
      await first!.trigger('click')

      expect(wrapper.emitted('reorder')).toEqual([[1, 1]])
      expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    it('does not reorder or toggle when the drop slot is the same as the start slot', async () => {
      const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set<number>() } })
      const [first] = wrapper.findAll('button')

      await firePointer(first!.element, 'pointerdown', { pointerId: 1, clientX: 100 })
      // Passes the drag threshold but not far enough to change slots.
      await firePointer(first!.element, 'pointermove', { pointerId: 1, clientX: 100 + 10 })
      await firePointer(first!.element, 'pointerup', { pointerId: 1, clientX: 100 + 10 })
      await first!.trigger('click')

      expect(wrapper.emitted('reorder')).toBeUndefined()
      expect(wrapper.emitted('toggle')).toBeUndefined()
    })

    it('previews the new order live, keeping the dragged card tucked under cards to its right', async () => {
      const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set<number>() } })
      const [first] = wrapper.findAll('button')

      await firePointer(first!.element, 'pointerdown', { pointerId: 1, clientX: 100 })
      // Dragged past card 2's slot -> preview order becomes [2, 1, 3].
      await firePointer(first!.element, 'pointermove', {
        pointerId: 1,
        clientX: 100 + CARD_SPACING_PX + 5,
      })

      const buttons = wrapper.findAll('button')
      // Card 2 (id 2) previewed into the vacated first slot.
      expect(buttons[0]!.attributes('style')).toContain('translate(calc(-50% + -30px)')
      expect(buttons[0]!.attributes('style')).toContain('z-index: 0')

      // The dragged card (id 1) itself: still marked as dragging, lifted,
      // but its z-index follows its slot in the preview rather than
      // jumping above everything — so card 3, still to its right, stays
      // stacked on top of it, matching the plain (non-drag) fan rule.
      expect(buttons[1]!.attributes('data-dragging')).toBe('true')
      expect(buttons[1]!.attributes('style')).toContain('z-index: 1')

      expect(buttons[2]!.attributes('style')).toContain('z-index: 2')
    })

    it('ignores pointer events for a different, concurrent pointer id', async () => {
      const wrapper = mount(PlayerHand, { props: { cards, selectedIds: new Set<number>() } })
      const [first] = wrapper.findAll('button')

      await firePointer(first!.element, 'pointerdown', { pointerId: 1, clientX: 100 })
      await firePointer(first!.element, 'pointermove', {
        pointerId: 2,
        clientX: 100 + CARD_SPACING_PX + 5,
      })
      await firePointer(first!.element, 'pointerup', { pointerId: 1, clientX: 100 })
      await first!.trigger('click')

      expect(wrapper.emitted('toggle')).toEqual([[1]])
      expect(wrapper.emitted('reorder')).toBeUndefined()
    })
  })
})
