// Mirrors PlayerHand.vue's own cardLayouts geometry — half the on-screen
// width of the fan, from its centerline out to the outermost card's outer
// edge, as a CSS calc() sub-expression (no enclosing `calc(...)`, so
// callers can drop it straight into their own calc() alongside other
// terms like `50vw`). Used to keep MyFoot and the Sort button hugging
// the hand's actual edge as it grows/shrinks with card count, instead of
// sitting at a fixed screen position.
const CARD_SPACING_PX = 30

export function handHalfWidthExpr(cardCount: number): string {
  const center = (cardCount - 1) / 2
  return `(${center} * ${CARD_SPACING_PX}px + (var(--card-base-width)*var(--card-scale,1))/2)`
}

// OtherPlayerHand.vue's own fan geometry — different constants than
// PlayerHand's (20px spacing, 0.75x-scale cards, not full scale). Its
// `top` seat fans horizontally (half-width matters, same axis as
// PlayerHand); its `left`/`right` seats fan vertically instead
// (half-height matters — same card, just measuring the other axis).
const OTHER_CARD_SPACING_PX = 20
const OTHER_CARD_WIDTH_EXPR = 'var(--card-base-width)*var(--card-scale,1)*0.75'
const OTHER_CARD_HEIGHT_EXPR = `${OTHER_CARD_WIDTH_EXPR}*1065/769`

function otherHandHalfExtentExpr(cardCount: number, dimensionExpr: string): string {
  const center = (cardCount - 1) / 2
  return `(${center} * ${OTHER_CARD_SPACING_PX}px + (${dimensionExpr})/2)`
}

export function otherHandHalfWidthExpr(cardCount: number): string {
  return otherHandHalfExtentExpr(cardCount, OTHER_CARD_WIDTH_EXPR)
}

export function otherHandHalfHeightExpr(cardCount: number): string {
  return otherHandHalfExtentExpr(cardCount, OTHER_CARD_HEIGHT_EXPR)
}

// Shared by any FootPile rotated 90deg (MyFoot, and OtherPlayerHand's
// `top` seat) — its visual (post-rotation) width is its own un-rotated
// *height*, wider than the layout box a plain left/right/top/bottom
// offset actually positions. This is the extra half-width the rotation
// adds on each side. Same expression regardless of caller — FootPile's
// own 0.75x-scale dimensions never change.
export function footRotationOvershootExpr(): string {
  return `((${OTHER_CARD_WIDTH_EXPR}*1065/769) - (${OTHER_CARD_WIDTH_EXPR})) / 2`
}
