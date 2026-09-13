import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PlayingCard from '../PlayingCard.vue'
import { cardImageUrl, cardBackUrl } from '@/utils/cardImages'
import { formatCard } from '@/utils/cardHelpers'
import { Hearts, Joker, Seven } from '@/types/canasta'

describe('PlayingCard', () => {
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
})
