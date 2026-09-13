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
    const wrapper = mount(PlayerHand, { props: { cards } })
    expect(wrapper.findAll('button')).toHaveLength(3)
  })

  it('selects a card on click and deselects it on a second click', async () => {
    const wrapper = mount(PlayerHand, { props: { cards } })
    const [first] = wrapper.findAll('button')

    expect(first!.attributes('data-selected')).toBe('false')

    await first!.trigger('click')
    expect(first!.attributes('data-selected')).toBe('true')

    await first!.trigger('click')
    expect(first!.attributes('data-selected')).toBe('false')
  })

  it('supports selecting multiple cards independently', async () => {
    const wrapper = mount(PlayerHand, { props: { cards } })
    const buttons = wrapper.findAll('button')

    await buttons[0]!.trigger('click')
    await buttons[2]!.trigger('click')

    expect(buttons[0]!.attributes('data-selected')).toBe('true')
    expect(buttons[1]!.attributes('data-selected')).toBe('false')
    expect(buttons[2]!.attributes('data-selected')).toBe('true')
  })

  it('lifts a selected card by 20% and a hovered card by 10%, additively when both', async () => {
    const wrapper = mount(PlayerHand, { props: { cards } })
    const [first] = wrapper.findAll('button')

    expect(first!.attributes('style')).toContain('-0%)')

    await first!.trigger('click')
    expect(first!.attributes('style')).toContain('-20%)')

    await first!.trigger('mouseenter')
    expect(first!.attributes('style')).toContain('-30%)')

    await first!.trigger('mouseleave')
    expect(first!.attributes('style')).toContain('-20%)')
  })

  it('never raises a card above its own fan index, so it stays under its right-hand neighbor', async () => {
    const wrapper = mount(PlayerHand, { props: { cards } })
    const buttons = wrapper.findAll('button')

    await buttons[0]!.trigger('click')
    await buttons[0]!.trigger('mouseenter')

    expect(buttons[0]!.attributes('style')).toContain('z-index: 0')
  })
})
