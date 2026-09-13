import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeckPile from '../DeckPile.vue'
import PlayingCard from '../PlayingCard.vue'

describe('DeckPile', () => {
  it('emits draw on click when enabled', async () => {
    const wrapper = mount(DeckPile, { props: { count: 52 } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('draw')).toHaveLength(1)
    expect(wrapper.text()).toContain('52')
  })

  it('does not emit draw when disabled', async () => {
    const wrapper = mount(DeckPile, { props: { count: 52, disabled: true } })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('draw')).toBeUndefined()
  })

  it('does not emit draw and shows an empty state at count 0', async () => {
    const wrapper = mount(DeckPile, { props: { count: 0 } })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('draw')).toBeUndefined()
    expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(0)
  })

  it('caps the visible stack depth at 4 regardless of a larger count', () => {
    const wrapper = mount(DeckPile, { props: { count: 40 } })
    expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(4)
  })

  it('renders one layer per card below the cap', () => {
    const wrapper = mount(DeckPile, { props: { count: 3 } })
    expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(3)
  })
})
