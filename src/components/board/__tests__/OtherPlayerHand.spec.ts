import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OtherPlayerHand from '../OtherPlayerHand.vue'
import PlayingCard from '../PlayingCard.vue'

describe('OtherPlayerHand', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fans one face-down card per card in a 15-or-fewer hand', () => {
    const wrapper = mount(OtherPlayerHand, {
      props: { name: 'Bob', handLength: 11, isCurrentTurn: false, position: 'top' },
    })

    const cards = wrapper.findAllComponents(PlayingCard)
    expect(cards).toHaveLength(11)
    cards.forEach((card) => {
      expect(card.props('card')).toBeUndefined() // face-down: no `card`, just a back
      expect(card.props('back')).toBe('red')
    })
  })

  it('shows a capped stack with a count instead of fanning more than 15 cards', () => {
    const wrapper = mount(OtherPlayerHand, {
      props: { name: 'Bob', handLength: 23, isCurrentTurn: false, position: 'left' },
    })

    // capped at 4 stacked backs regardless of the real count
    expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(4)
    expect(wrapper.text()).toContain('23')
  })

  it('renders the player name', () => {
    const wrapper = mount(OtherPlayerHand, {
      props: { name: 'Carol', handLength: 5, isCurrentTurn: false, position: 'right' },
    })
    expect(wrapper.text()).toContain('Carol')
  })

  it('stylizes the name distinctly when it is that player\'s turn', () => {
    const notTurn = mount(OtherPlayerHand, {
      props: { name: 'Dave', handLength: 5, isCurrentTurn: false, position: 'top' },
    })
    const isTurn = mount(OtherPlayerHand, {
      props: { name: 'Dave', handLength: 5, isCurrentTurn: true, position: 'top' },
    })

    const notTurnClasses = notTurn.find('.font-rs-bold.text-lg').classes()
    const isTurnClasses = isTurn.find('.font-rs-bold.text-lg').classes()
    expect(isTurnClasses).not.toEqual(notTurnClasses)
    expect(isTurnClasses.join(' ')).toContain('text-rs-yellow')
  })

  it('is not clickable by default, and clicking the name does not emit select', async () => {
    const wrapper = mount(OtherPlayerHand, {
      props: { name: 'Dave', handLength: 5, isCurrentTurn: false, position: 'top' },
    })
    const nameButton = wrapper.find('.font-rs-bold.text-lg')

    expect(nameButton.attributes('disabled')).toBeDefined()
    await nameButton.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('emits select when clicked with clickable set', async () => {
    const wrapper = mount(OtherPlayerHand, {
      props: { name: 'Dave', handLength: 5, isCurrentTurn: false, position: 'top', clickable: true },
    })
    const nameButton = wrapper.find('.font-rs-bold.text-lg')

    expect(nameButton.attributes('disabled')).toBeUndefined()
    await nameButton.trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })
})
