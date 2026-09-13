import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiscardPile from '../DiscardPile.vue'
import PlayingCard from '../PlayingCard.vue'
import { Hearts, Seven } from '@/types/canasta'

describe('DiscardPile', () => {
  it('renders the top card and count when present', () => {
    const topCard = { id: 1, suit: Hearts, rank: Seven }
    const wrapper = mount(DiscardPile, { props: { topCard, count: 5 } })

    const cards = wrapper.findAllComponents(PlayingCard)
    expect(cards).toHaveLength(1)
    expect(cards[0]!.props('card')).toEqual(topCard)
    expect(wrapper.text()).toContain('5')
  })

  it('renders an empty placeholder when there is no top card', () => {
    const wrapper = mount(DiscardPile, { props: { count: 0 } })

    expect(wrapper.findComponent(PlayingCard).exists()).toBe(false)
    expect(wrapper.find('.border-dashed').exists()).toBe(true)
  })

  it('emits click when enabled', async () => {
    const wrapper = mount(DiscardPile, { props: { count: 1, disabled: false } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('does not emit click when disabled', async () => {
    const wrapper = mount(DiscardPile, { props: { count: 1, disabled: true } })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeUndefined()
  })
})
