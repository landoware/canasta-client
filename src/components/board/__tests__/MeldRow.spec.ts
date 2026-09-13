import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MeldRow from '../MeldRow.vue'
import PlayingCard from '../PlayingCard.vue'
import { Hearts, Diamonds, Four, Five, Six } from '@/types/canasta'

describe('MeldRow', () => {
  it('renders one card-shaped group per meld/canasta, each with its own cards', () => {
    const groups = [
      {
        id: 1,
        cards: [
          { id: 1, suit: Hearts, rank: Four },
          { id: 2, suit: Diamonds, rank: Four },
        ],
      },
      {
        id: 2,
        cards: [{ id: 3, suit: Hearts, rank: Five }],
      },
    ]

    const wrapper = mount(MeldRow, { props: { groups } })
    const cards = wrapper.findAllComponents(PlayingCard)

    expect(cards).toHaveLength(3)
    expect(cards[0]!.props('card')).toEqual(groups[0]!.cards[0])
    expect(cards[1]!.props('card')).toEqual(groups[0]!.cards[1])
    expect(cards[2]!.props('card')).toEqual(groups[1]!.cards[0])
  })

  it('renders nothing when there are no groups', () => {
    const wrapper = mount(MeldRow, { props: { groups: [] } })
    expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(0)
  })

  it('stacks each card in a group with a tight, DeckPile-style offset', () => {
    const groups = [
      {
        id: 1,
        cards: [
          { id: 1, suit: Hearts, rank: Six },
          { id: 2, suit: Diamonds, rank: Six },
          { id: 3, suit: Hearts, rank: Six },
        ],
      },
    ]

    const wrapper = mount(MeldRow, { props: { groups } })
    const cards = wrapper.findAllComponents(PlayingCard)

    const transforms = cards.map((c) => c.attributes('style'))
    expect(transforms[0]).toContain('translate(0px, 0px)')
    expect(transforms[1]).toContain('translate(2px, -2px)')
    expect(transforms[2]).toContain('translate(4px, -4px)')
  })

  it('shows the card count underneath each group', () => {
    const groups = [
      {
        id: 1,
        cards: [
          { id: 1, suit: Hearts, rank: Four },
          { id: 2, suit: Diamonds, rank: Four },
          { id: 3, suit: Hearts, rank: Four },
        ],
      },
      {
        id: 2,
        cards: [{ id: 4, suit: Hearts, rank: Five }],
      },
    ]

    const wrapper = mount(MeldRow, { props: { groups } })
    const text = wrapper.text()

    expect(text).toContain('3')
    expect(text).toContain('1')
  })

  it('is not dimmed by default, and dims when dimmed is true', () => {
    const groups = [{ id: 1, cards: [{ id: 1, suit: Hearts, rank: Four }] }]

    const notDimmed = mount(MeldRow, { props: { groups } })
    const dimmed = mount(MeldRow, { props: { groups, dimmed: true } })

    expect(notDimmed.find('.relative').classes()).not.toContain('opacity-50')
    expect(dimmed.find('.relative').classes()).toContain('opacity-50')
  })

  it('does not render the create-meld tile by default', () => {
    const wrapper = mount(MeldRow, { props: { groups: [] } })
    expect(wrapper.find('button[aria-label="Create meld from selected cards"]').exists()).toBe(
      false,
    )
  })

  it('renders the create-meld tile when showCreateAffordance is true, and emits create on click', async () => {
    const wrapper = mount(MeldRow, { props: { groups: [], showCreateAffordance: true } })

    const tile = wrapper.find('button[aria-label="Create meld from selected cards"]')
    expect(tile.exists()).toBe(true)

    await tile.trigger('click')
    expect(wrapper.emitted('create')).toHaveLength(1)
  })

  it('disables group tiles by default', () => {
    const groups = [{ id: 1, cards: [{ id: 1, suit: Hearts, rank: Four }] }]
    const wrapper = mount(MeldRow, { props: { groups } })

    const tile = wrapper.findAll('button').find((b) => !b.attributes('aria-label'))
    expect(tile!.attributes('disabled')).toBeDefined()
  })

  it('enables and highlights only the tiles whose id is in clickableGroupIds', () => {
    const groups = [
      { id: 1, cards: [{ id: 1, suit: Hearts, rank: Four }] },
      { id: 2, cards: [{ id: 2, suit: Hearts, rank: Five }] },
    ]
    const wrapper = mount(MeldRow, { props: { groups, clickableGroupIds: new Set([2]) } })
    const tiles = wrapper.findAll('button').filter((b) => !b.attributes('aria-label'))

    expect(tiles[0]!.attributes('disabled')).toBeDefined()
    expect(tiles[1]!.attributes('disabled')).toBeUndefined()
    expect(tiles[1]!.classes().join(' ')).toContain('drop-shadow')
  })

  it('emits select-group with the id when a clickable tile is clicked', async () => {
    const groups = [{ id: 1, cards: [{ id: 1, suit: Hearts, rank: Four }] }]
    const wrapper = mount(MeldRow, { props: { groups, clickableGroupIds: new Set([1]) } })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('select-group')).toEqual([[1]])
  })

  it('does not emit select-group when a disabled tile is clicked', async () => {
    const groups = [{ id: 1, cards: [{ id: 1, suit: Hearts, rank: Four }] }]
    const wrapper = mount(MeldRow, { props: { groups } })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('select-group')).toBeUndefined()
  })
})
