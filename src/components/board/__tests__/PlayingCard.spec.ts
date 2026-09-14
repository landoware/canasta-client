import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PlayingCard from '../PlayingCard.vue'
import { cardImageUrl, cardBackUrl } from '@/utils/cardImages'
import { formatCard } from '@/utils/cardHelpers'
import { useSettingsStore } from '@/stores/settings'
import { Hearts, Joker, Seven, Spades } from '@/types/canasta'

describe('PlayingCard', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the blue back by default', () => {
    const wrapper = mount(PlayingCard)
    expect(wrapper.find('img').attributes('src')).toBe(cardBackUrl('blue'))
  })

  it('renders the red back when requested', () => {
    const wrapper = mount(PlayingCard, { props: { back: 'red' } })
    expect(wrapper.find('img').attributes('src')).toBe(cardBackUrl('red'))
  })

  it('renders a card face with a matching image and alt text', () => {
    const card = { id: 1, suit: Hearts, rank: Seven }
    const wrapper = mount(PlayingCard, { props: { card } })
    const img = wrapper.find('img')
    expect(img.attributes('src')).toBe(cardImageUrl(card))
    expect(img.attributes('alt')).toBe(formatCard(card))
  })

  it('renders a joker as an image, not the text fallback', () => {
    const card = { id: 2, suit: Hearts, rank: Joker }
    const wrapper = mount(PlayingCard, { props: { card } })
    expect(wrapper.find('img').exists()).toBe(true)
    expect(wrapper.find('img').attributes('src')).toBe(cardImageUrl(card))
  })

  describe('compact rendering', () => {
    it('renders the compact face instead of an image once cardScale drops below 1', () => {
      useSettingsStore().cardScale = 0.75
      const card = { id: 1, suit: Hearts, rank: Seven }
      const wrapper = mount(PlayingCard, { props: { card } })

      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.text()).toContain(formatCard(card))
    })

    it('still renders the back image once cardScale drops below 1 — backs have no index text to lose', () => {
      useSettingsStore().cardScale = 0.5
      const wrapper = mount(PlayingCard, { props: { back: 'red' } })

      expect(wrapper.find('img').attributes('src')).toBe(cardBackUrl('red'))
    })

    it('still renders the back image when compact is forced explicitly', () => {
      const wrapper = mount(PlayingCard, { props: { back: 'blue', compact: true } })

      expect(wrapper.find('img').attributes('src')).toBe(cardBackUrl('blue'))
    })

    it('shows a large center rank/suit mark in addition to the corner marks', () => {
      useSettingsStore().cardScale = 0.5
      const card = { id: 1, suit: Hearts, rank: Seven }
      const wrapper = mount(PlayingCard, { props: { card } })

      const marks = wrapper.findAll('span').filter((s) => s.text() === formatCard(card))
      // Top-left corner, mirrored bottom-right corner, and the large center mark.
      expect(marks).toHaveLength(3)
    })

    it('goes compact via the explicit prop even at full (1x) scale', () => {
      const card = { id: 1, suit: Hearts, rank: Seven }
      const wrapper = mount(PlayingCard, { props: { card, compact: true } })

      expect(wrapper.find('img').exists()).toBe(false)
    })

    it('stays image-based at 1x scale when compact is not set', () => {
      const card = { id: 1, suit: Hearts, rank: Seven }
      const wrapper = mount(PlayingCard, { props: { card } })

      expect(wrapper.find('img').exists()).toBe(true)
    })

    it('colors black-suit corner marks differently from red-suit ones', () => {
      useSettingsStore().cardScale = 0.5
      const red = mount(PlayingCard, { props: { card: { id: 1, suit: Hearts, rank: Seven } } })
      const black = mount(PlayingCard, { props: { card: { id: 2, suit: Spades, rank: Seven } } })

      expect(red.find('.text-card-red').exists()).toBe(true)
      expect(black.find('.text-card-black').exists()).toBe(true)
      expect(black.find('.text-card-red').exists()).toBe(false)
    })
  })
})
