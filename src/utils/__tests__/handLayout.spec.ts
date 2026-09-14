import { describe, it, expect } from 'vitest'
import {
  handHalfWidthExpr,
  otherHandHalfWidthExpr,
  otherHandHalfHeightExpr,
  footRotationOvershootExpr,
} from '../handLayout'

describe('handHalfWidthExpr', () => {
  it('grows the center term with card count', () => {
    expect(handHalfWidthExpr(1)).toContain('0 * 30px')
    expect(handHalfWidthExpr(5)).toContain('2 * 30px')
    expect(handHalfWidthExpr(11)).toContain('5 * 30px')
  })

  it('includes half a card width via the shared --card-base-width/--card-scale vars', () => {
    expect(handHalfWidthExpr(3)).toContain(
      '(var(--card-base-width)*var(--card-scale,1))/2',
    )
  })

  it('is a bare sub-expression, not wrapped in its own calc()', () => {
    expect(handHalfWidthExpr(3)).not.toContain('calc(')
  })
})

describe('otherHandHalfWidthExpr', () => {
  it('grows the center term with card count, using the 20px spacing OtherPlayerHand uses', () => {
    expect(otherHandHalfWidthExpr(1)).toContain('0 * 20px')
    expect(otherHandHalfWidthExpr(5)).toContain('2 * 20px')
  })

  it('includes half a 0.75x-scale card width, not a full-scale one', () => {
    expect(otherHandHalfWidthExpr(3)).toContain(
      '(var(--card-base-width)*var(--card-scale,1)*0.75)/2',
    )
  })

  it('is a bare sub-expression, not wrapped in its own calc()', () => {
    expect(otherHandHalfWidthExpr(3)).not.toContain('calc(')
  })
})

describe('otherHandHalfHeightExpr', () => {
  it('grows the center term with card count, using the 20px spacing OtherPlayerHand uses', () => {
    expect(otherHandHalfHeightExpr(1)).toContain('0 * 20px')
    expect(otherHandHalfHeightExpr(5)).toContain('2 * 20px')
  })

  it('measures the 0.75x-scale card\'s height (via the 1065/769 aspect ratio), not its width', () => {
    expect(otherHandHalfHeightExpr(3)).toContain(
      '(var(--card-base-width)*var(--card-scale,1)*0.75*1065/769)/2',
    )
  })
})

describe('footRotationOvershootExpr', () => {
  it('is the difference between a 0.75x-scale card\'s height and width, halved', () => {
    const width = 'var(--card-base-width)*var(--card-scale,1)*0.75'
    expect(footRotationOvershootExpr()).toBe(`((${width}*1065/769) - (${width})) / 2`)
  })
})
