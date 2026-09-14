import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FootPile from '../FootPile.vue'
import PlayingCard from '../PlayingCard.vue'

describe('FootPile', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders nothing once the foot has been picked up', () => {
    const wrapper = mount(FootPile, { props: { visible: false, rotateDeg: 0 } })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('div').exists()).toBe(false)
    expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(0)
  })

  it('renders a capped 4-card face-down stack while still down', () => {
    const wrapper = mount(FootPile, { props: { visible: true, rotateDeg: 0 } })

    const cards = wrapper.findAllComponents(PlayingCard)
    expect(cards).toHaveLength(4)
    cards.forEach((card) => {
      expect(card.props('card')).toBeUndefined()
      expect(card.props('back')).toBe('red')
    })
  })

  it('renders a plain div, not a button, when not clickable', () => {
    const wrapper = mount(FootPile, { props: { visible: true, rotateDeg: 0, clickable: false } })

    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('renders a button and emits pick-up on click when clickable', async () => {
    const wrapper = mount(FootPile, { props: { visible: true, rotateDeg: 0, clickable: true } })

    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    await button.trigger('click')
    expect(wrapper.emitted('pick-up')).toHaveLength(1)
  })

  it('does not emit pick-up on click when not clickable', async () => {
    const wrapper = mount(FootPile, { props: { visible: true, rotateDeg: 0, clickable: false } })

    await wrapper.find('div').trigger('click')
    expect(wrapper.emitted('pick-up')).toBeUndefined()
  })

  it('applies opacity when dimmed, full opacity otherwise', () => {
    const dimmed = mount(FootPile, { props: { visible: true, rotateDeg: 0, dimmed: true } })
    const notDimmed = mount(FootPile, { props: { visible: true, rotateDeg: 0, dimmed: false } })

    expect(dimmed.find('div').classes()).toContain('opacity-50')
    expect(notDimmed.find('div').classes()).not.toContain('opacity-50')
  })

  it('applies the given rotateDeg as a transform', () => {
    const wrapper = mount(FootPile, { props: { visible: true, rotateDeg: 90 } })

    expect(wrapper.find('div').attributes('style')).toContain('transform: rotate(90deg)')
  })
})
