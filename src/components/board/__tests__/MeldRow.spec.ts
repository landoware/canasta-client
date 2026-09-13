import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import MeldRow from '../MeldRow.vue'
import PlayingCard from '../PlayingCard.vue'
import { Hearts, Diamonds, Clubs, Spades, Four, Five, Six, Two } from '@/types/canasta'

// getBoundingClientRect always reports all-zero in jsdom — the
// viewport-clamping tests below stub it (and window.innerWidth) with a
// controlled rect standing in for the clicked tile's real on-screen size
// and position.
function stubTileRect(rect: Partial<DOMRect>): void {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 90,
    height: 124,
    right: 90,
    bottom: 124,
    x: 0,
    y: 0,
    toJSON: () => '',
    ...rect,
  })
}

describe('MeldRow', () => {
  it('renders one card-shaped group per meld/canasta, each with its own cards', () => {
    const groups = [
      {
        id: 1,
        // Already in preferred stacking order (red last) so this test's
        // ordering isn't disturbed by the top-card-color preference,
        // which has its own dedicated tests below.
        cards: [
          { id: 1, suit: Clubs, rank: Four },
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
        // Already in preferred stacking order (red last) so this test's
        // offsets aren't disturbed by the top-card-color preference,
        // which has its own dedicated tests below.
        cards: [
          { id: 1, suit: Diamonds, rank: Six },
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

  describe('top-card color preference', () => {
    it('prefers a red card on top of a natural (no-wildcard) meld', () => {
      const groups = [
        {
          id: 1,
          cards: [
            { id: 1, suit: Clubs, rank: Four },
            { id: 2, suit: Hearts, rank: Four },
            { id: 3, suit: Spades, rank: Four },
          ],
        },
      ]

      const wrapper = mount(MeldRow, { props: { groups } })
      const ids = wrapper.findAllComponents(PlayingCard).map((c) => c.props('card')!.id)

      expect(ids).toEqual([1, 3, 2]) // card 2 (red) moved to the top
    })

    it('leaves the order alone when a natural meld has no red card at all', () => {
      const groups = [
        {
          id: 1,
          cards: [
            { id: 1, suit: Clubs, rank: Four },
            { id: 2, suit: Spades, rank: Four },
          ],
        },
      ]

      const wrapper = mount(MeldRow, { props: { groups } })
      const ids = wrapper.findAllComponents(PlayingCard).map((c) => c.props('card')!.id)

      expect(ids).toEqual([1, 2])
    })

    it('prefers a black card on top of a meld that includes a wildcard', () => {
      const groups = [
        {
          id: 1,
          cards: [
            { id: 1, suit: Hearts, rank: Four },
            { id: 2, suit: Clubs, rank: Four },
            { id: 3, suit: Diamonds, rank: Two }, // wildcard
          ],
        },
      ]

      const wrapper = mount(MeldRow, { props: { groups } })
      const ids = wrapper.findAllComponents(PlayingCard).map((c) => c.props('card')!.id)

      expect(ids).toEqual([1, 3, 2]) // card 2 (black) moved to the top
    })

    it('does not reorder when the preferred color is already on top', () => {
      const groups = [
        {
          id: 1,
          cards: [
            { id: 1, suit: Clubs, rank: Four },
            { id: 2, suit: Spades, rank: Four },
            { id: 3, suit: Hearts, rank: Four },
          ],
        },
      ]

      const wrapper = mount(MeldRow, { props: { groups } })
      const ids = wrapper.findAllComponents(PlayingCard).map((c) => c.props('card')!.id)

      expect(ids).toEqual([1, 2, 3])
    })
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

    expect(notDimmed.find('.absolute.inset-0').classes()).not.toContain('opacity-50')
    expect(dimmed.find('.absolute.inset-0').classes()).toContain('opacity-50')
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

  it('never disables a group tile — every tile is clickable, addable or not', () => {
    const groups = [
      { id: 1, cards: [{ id: 1, suit: Hearts, rank: Four }] },
      { id: 2, cards: [{ id: 2, suit: Hearts, rank: Five }] },
    ]
    const wrapper = mount(MeldRow, { props: { groups, clickableGroupIds: new Set([2]) } })
    const tiles = wrapper.findAll('button').filter((b) => !b.attributes('aria-label'))

    expect(tiles[0]!.attributes('disabled')).toBeUndefined()
    expect(tiles[1]!.attributes('disabled')).toBeUndefined()
  })

  it('highlights only the tiles whose id is in clickableGroupIds', () => {
    const groups = [
      { id: 1, cards: [{ id: 1, suit: Hearts, rank: Four }] },
      { id: 2, cards: [{ id: 2, suit: Hearts, rank: Five }] },
    ]
    const wrapper = mount(MeldRow, { props: { groups, clickableGroupIds: new Set([2]) } })
    const tiles = wrapper.findAll('button').filter((b) => !b.attributes('aria-label'))

    expect(tiles[0]!.classes().join(' ')).not.toContain('drop-shadow')
    expect(tiles[1]!.classes().join(' ')).toContain('drop-shadow')
  })

  it('emits select-group with the id when a clickable (addable) tile is clicked', async () => {
    const groups = [{ id: 1, cards: [{ id: 1, suit: Hearts, rank: Four }] }]
    const wrapper = mount(MeldRow, { props: { groups, clickableGroupIds: new Set([1]) } })

    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('select-group')).toEqual([[1]])
  })

  describe('expanding a meld', () => {
    const groups = [
      {
        id: 1,
        cards: [
          { id: 1, suit: Hearts, rank: Four },
          { id: 2, suit: Diamonds, rank: Four },
          { id: 3, suit: Clubs, rank: Four },
        ],
      },
      { id: 2, cards: [{ id: 4, suit: Hearts, rank: Five }] },
    ]

    it('is collapsed by default (no expanded copy of the cards rendered)', () => {
      const wrapper = mount(MeldRow, { props: { groups } })
      // Only the tight stack's 4 cards total, no extra expanded copies.
      expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(4)
    })

    it('expands on click of a non-addable tile instead of emitting select-group', async () => {
      const wrapper = mount(MeldRow, { props: { groups } })
      const [firstTile] = wrapper.findAll('button')

      await firstTile!.trigger('click')

      expect(wrapper.emitted('select-group')).toBeUndefined()
      // The 3 stacked cards plus 3 more in the expanded fan.
      expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(4 + 3)
    })

    it('fans the expanded cards out like PlayerHand, centered and spread by 30px per card', async () => {
      const wrapper = mount(MeldRow, { props: { groups } })
      const [firstTile] = wrapper.findAll('button')

      await firstTile!.trigger('click')

      const expandedCards = wrapper
        .findAllComponents(PlayingCard)
        .filter((c) => c.props('card')?.rank === Four)
        .slice(-3) // last 3 rendered are the expanded fan, not the stack

      const transforms = expandedCards.map((c) => c.attributes('style'))
      expect(transforms[0]).toContain('translate(calc(-50% + -30px)')
      expect(transforms[1]).toContain('translate(calc(-50% + 0px)')
      expect(transforms[2]).toContain('translate(calc(-50% + 30px)')
    })

    it('collapses again when the same tile is clicked a second time', async () => {
      const wrapper = mount(MeldRow, { props: { groups } })
      const [firstTile] = wrapper.findAll('button')

      await firstTile!.trigger('click')
      await firstTile!.trigger('click')

      expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(4)
    })

    it('switches the expansion to a different tile rather than showing both at once', async () => {
      const wrapper = mount(MeldRow, { props: { groups } })
      const [firstTile, secondTile] = wrapper.findAll('button')

      await firstTile!.trigger('click')
      await secondTile!.trigger('click')

      // First meld's stack (3) + second meld's stack (1) + second meld's
      // own single card expanded (1) — first meld's expansion collapsed.
      expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(3 + 1 + 1)
    })

    it('does not expand an addable tile — it emits select-group instead', async () => {
      const wrapper = mount(MeldRow, { props: { groups, clickableGroupIds: new Set([1]) } })
      const [firstTile] = wrapper.findAll('button')

      await firstTile!.trigger('click')

      expect(wrapper.emitted('select-group')).toEqual([[1]])
      expect(wrapper.findAllComponents(PlayingCard)).toHaveLength(4) // not expanded
    })

    describe('positioning the expanded view', () => {
      // Teleport(to: 'body') moves the expanded view's real DOM node out
      // from under `wrapper.element` and into the actual document body, so
      // it has to be queried there directly — wrapper.find() only searches
      // wrapper's own subtree and never sees it. Every stray node is
      // cleared before each case so an unmounted-but-never-cleaned-up
      // teleport from an earlier test can't be mistaken for this one's.
      let wrapper: ReturnType<typeof mount> | undefined

      beforeEach(() => {
        // Earlier tests in this file expand a meld via the same Teleport
        // target and never unmount, so clear anything they left behind
        // before asserting on "the" teleported node here.
        document.querySelectorAll('.fixed').forEach((el) => el.remove())
      })

      afterEach(() => {
        wrapper?.unmount()
        wrapper = undefined
        document.querySelectorAll('.fixed').forEach((el) => el.remove())
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
      })

      function expandedStyle(): string {
        return document.querySelector('.fixed')!.getAttribute('style')!
      }

      it('centers the expanded view on the tile when there is room on every side', async () => {
        stubTileRect({ left: 400, top: 300, width: 90, bottom: 424 })
        vi.stubGlobal('innerWidth', 1200)

        wrapper = mount(MeldRow, { props: { groups } })
        await wrapper.findAll('button')[0]!.trigger('click')

        const style = expandedStyle()
        expect(style).toContain('left: 445px') // tile's own horizontal center (400 + 90/2)
        // Above the tile (a smaller top than the tile's own top of 300).
        expect(Number(/top: ([\d.]+)px/.exec(style)![1])).toBeLessThan(300)
      })

      it('clamps to the left viewport edge instead of following the tile off-screen', async () => {
        stubTileRect({ left: 0, top: 300, width: 90, bottom: 424 })
        vi.stubGlobal('innerWidth', 1200)

        wrapper = mount(MeldRow, { props: { groups } })
        await wrapper.findAll('button')[0]!.trigger('click')

        // Fan width for 3 cards: (90/0.75) + 2*30 = 180 -> half = 90, +16px margin = 106.
        expect(expandedStyle()).toContain('left: 106px')
      })

      it('clamps to the right viewport edge instead of following the tile off-screen', async () => {
        stubTileRect({ left: 450, top: 300, width: 90, bottom: 424 })
        vi.stubGlobal('innerWidth', 500)

        wrapper = mount(MeldRow, { props: { groups } })
        await wrapper.findAll('button')[0]!.trigger('click')

        // 500 - 16px margin - 90px half-fan = 394.
        expect(expandedStyle()).toContain('left: 394px')
      })

      it('falls back to centering on the viewport when the fan is wider than the whole screen', async () => {
        const manyCards = Array.from({ length: 20 }, (_, i) => ({ id: i, suit: Hearts, rank: Four }))
        stubTileRect({ left: 400, top: 300, width: 90, bottom: 424 })
        vi.stubGlobal('innerWidth', 400)

        wrapper = mount(MeldRow, { props: { groups: [{ id: 1, cards: manyCards }] } })
        await wrapper.findAll('button')[0]!.trigger('click')

        expect(expandedStyle()).toContain('left: 200px') // 400 / 2
      })

      it('flips below the tile when there is not enough room above it', async () => {
        stubTileRect({ left: 400, top: 20, width: 90, bottom: 144 })
        vi.stubGlobal('innerWidth', 1200)

        wrapper = mount(MeldRow, { props: { groups } })
        await wrapper.findAll('button')[0]!.trigger('click')

        // Below the tile's own bottom edge (144) plus the 16px margin.
        expect(expandedStyle()).toContain('top: 160px')
      })
    })
  })
})
