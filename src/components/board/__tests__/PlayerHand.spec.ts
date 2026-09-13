import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayerHand from '../PlayerHand.vue'
import { Hearts, Diamonds, Clubs, Four, Five, Six } from '@/types/canasta'

const cards = [
  { id: 1, suit: Hearts, rank: Four },
  { id: 2, suit: Diamonds, rank: Five },
  { id: 3, suit: Clubs, rank: Six },
]

describe('PlayerHand', () => {
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
})
