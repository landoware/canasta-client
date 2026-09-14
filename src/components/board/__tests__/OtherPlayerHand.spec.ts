import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import OtherPlayerHand from '../OtherPlayerHand.vue'
import PlayingCard from '../PlayingCard.vue'
import FootPile from '../FootPile.vue'
import {
  otherHandHalfWidthExpr,
  otherHandHalfHeightExpr,
  footRotationOvershootExpr,
} from '@/utils/handLayout'

describe('OtherPlayerHand', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('fans one face-down card per card in a 15-or-fewer hand', () => {
    const wrapper = mount(OtherPlayerHand, {
      props: { name: 'Bob', handLength: 11, hasFoot: false, isCurrentTurn: false, position: 'left' },
    })

    const cards = wrapper.findAllComponents(PlayingCard)
    expect(cards).toHaveLength(11)
    cards.forEach((card) => {
      expect(card.props('card')).toBeUndefined() // face-down: no `card`, just a back
      expect(card.props('back')).toBe('red')
    })
  })

  describe('card back color', () => {
    it("colors the partner's (top) hand and foot blue, matching the draw deck", () => {
      const wrapper = mount(OtherPlayerHand, {
        props: { name: 'Bob', handLength: 5, hasFoot: true, isCurrentTurn: false, position: 'top' },
      })

      wrapper.findAllComponents(PlayingCard).forEach((card) => {
        expect(card.props('back')).toBe('blue')
      })
      expect(wrapper.findComponent(FootPile).props('back')).toBe('blue')
    })

    it.each(['left', 'right'] as const)(
      "colors the %s opponent's hand and foot red",
      (position) => {
        const wrapper = mount(OtherPlayerHand, {
          props: { name: 'Bob', handLength: 5, hasFoot: true, isCurrentTurn: false, position },
        })

        wrapper.findAllComponents(PlayingCard).forEach((card) => {
          expect(card.props('back')).toBe('red')
        })
        expect(wrapper.findComponent(FootPile).props('back')).toBe('red')
      },
    )

    it("colors the partner's stacked (16+ card) hand blue too", () => {
      const wrapper = mount(OtherPlayerHand, {
        props: { name: 'Bob', handLength: 20, hasFoot: false, isCurrentTurn: false, position: 'top' },
      })

      wrapper.findAllComponents(PlayingCard).forEach((card) => {
        expect(card.props('back')).toBe('blue')
      })
    })
  })

  it('shows a capped stack with a count instead of fanning more than 15 cards', () => {
    const wrapper = mount(OtherPlayerHand, {
      props: { name: 'Bob', handLength: 23, hasFoot: false, isCurrentTurn: false, position: 'left' },
    })

    // capped at 4 stacked backs regardless of the real count
    expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(4)
    expect(wrapper.text()).toContain('23')
  })

  it('renders the player name', () => {
    const wrapper = mount(OtherPlayerHand, {
      props: { name: 'Carol', handLength: 5, hasFoot: false, isCurrentTurn: false, position: 'right' },
    })
    expect(wrapper.text()).toContain('Carol')
  })

  it('stylizes the name distinctly when it is that player\'s turn', () => {
    const notTurn = mount(OtherPlayerHand, {
      props: { name: 'Dave', handLength: 5, hasFoot: false, isCurrentTurn: false, position: 'top' },
    })
    const isTurn = mount(OtherPlayerHand, {
      props: { name: 'Dave', handLength: 5, hasFoot: false, isCurrentTurn: true, position: 'top' },
    })

    const notTurnClasses = notTurn.find('.font-rs-bold.text-lg').classes()
    const isTurnClasses = isTurn.find('.font-rs-bold.text-lg').classes()
    expect(isTurnClasses).not.toEqual(notTurnClasses)
    expect(isTurnClasses.join(' ')).toContain('text-rs-yellow')
  })

  it('is not clickable by default, and clicking the name does not emit select', async () => {
    const wrapper = mount(OtherPlayerHand, {
      props: { name: 'Dave', handLength: 5, hasFoot: false, isCurrentTurn: false, position: 'top' },
    })
    const nameButton = wrapper.find('.font-rs-bold.text-lg')

    expect(nameButton.attributes('disabled')).toBeDefined()
    await nameButton.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('emits select when clicked with clickable set', async () => {
    const wrapper = mount(OtherPlayerHand, {
      props: {
        name: 'Dave',
        handLength: 5,
        hasFoot: false,
        isCurrentTurn: false,
        position: 'top',
        clickable: true,
      },
    })
    const nameButton = wrapper.find('.font-rs-bold.text-lg')

    expect(nameButton.attributes('disabled')).toBeUndefined()
    await nameButton.trigger('click')
    expect(wrapper.emitted('select')).toHaveLength(1)
  })

  describe('foot', () => {
    it('passes hasFoot through to FootPile as visible', () => {
      const down = mount(OtherPlayerHand, {
        props: { name: 'Dave', handLength: 5, hasFoot: true, isCurrentTurn: false, position: 'top' },
      })
      const pickedUp = mount(OtherPlayerHand, {
        props: { name: 'Dave', handLength: 5, hasFoot: false, isCurrentTurn: false, position: 'top' },
      })

      expect(down.findComponent(FootPile).props('visible')).toBe(true)
      expect(pickedUp.findComponent(FootPile).props('visible')).toBe(false)
    })

    it('is never clickable — opponents\' feet are display-only', () => {
      const wrapper = mount(OtherPlayerHand, {
        props: { name: 'Dave', handLength: 5, hasFoot: true, isCurrentTurn: false, position: 'top' },
      })

      expect(wrapper.findComponent(FootPile).props('clickable')).toBeFalsy()
    })

    it.each([
      ['top', 90, 'top-4', 'left'],
      ['left', 0, 'left-4', 'bottom'],
      ['right', 0, 'right-4', 'top'],
    ] as const)(
      'positions the %s seat\'s foot at %s deg, anchored %s with a dynamic %s offset',
      (position, rotateDeg, fixedClass, dynamicProp) => {
        const wrapper = mount(OtherPlayerHand, {
          props: { name: 'Dave', handLength: 5, hasFoot: true, isCurrentTurn: false, position },
        })

        expect(wrapper.findComponent(FootPile).props('rotateDeg')).toBe(rotateDeg)
        const wrapperEl = wrapper.findComponent(FootPile).element.parentElement!
        expect(wrapperEl.classList).toContain(fixedClass)

        const style = wrapperEl.getAttribute('style')!
        expect(style).toContain(`${dynamicProp}: calc(`)
        if (position === 'top') {
          expect(style).toContain(otherHandHalfWidthExpr(5))
          expect(style).toContain(footRotationOvershootExpr())
        } else {
          expect(style).toContain(otherHandHalfHeightExpr(5))
        }
      },
    )

    it('caps the tracked hand size at the fan threshold (15) once the hand switches to a stack', () => {
      const atThreshold = mount(OtherPlayerHand, {
        props: { name: 'Dave', handLength: 15, hasFoot: true, isCurrentTurn: false, position: 'top' },
      })
      const overThreshold = mount(OtherPlayerHand, {
        props: { name: 'Dave', handLength: 23, hasFoot: true, isCurrentTurn: false, position: 'top' },
      })

      const styleAt = atThreshold.findComponent(FootPile).element.parentElement!.getAttribute('style')
      const styleOver = overThreshold
        .findComponent(FootPile)
        .element.parentElement!.getAttribute('style')

      expect(styleOver).toBe(styleAt)
    })
  })
})
