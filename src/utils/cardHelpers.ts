import type { Card, Rank } from '@/types/canasta'
import {
  Hearts,
  Diamonds,
  Clubs,
  Spades,
  Four,
  Five,
  Six,
  Seven,
  Eight,
  Nine,
  Ten,
  Jack,
  Queen,
  King,
  Ace,
  Two,
  Joker,
  Three,
  Wild,
} from '@/types/canasta'

export const isWildCard = (card: Card): boolean => {
  return card.rank === Two || card.rank === Joker
}

export const isRedThree = (card: Card): boolean => {
  return card.rank === Three && (card.suit === Hearts || card.suit === Diamonds)
}

export const isBlackThree = (card: Card): boolean => {
  return card.rank === Three && (card.suit === Clubs || card.suit === Spades)
}

export const isRed = (card: Card): boolean => {
  return card.suit === Hearts || card.suit === Diamonds
}

export const isBlack = (card: Card): boolean => {
  return card.suit === Clubs || card.suit === Spades
}

export const cardsMatchRank = (cards: Card[]): boolean => {
  if (cards.length === 0) return false

  const firstNonWild = cards.find((c) => !isWildCard(c))
  if (!firstNonWild) return true // All wild cards match

  return cards.every((c) => isWildCard(c) || c.rank === firstNonWild.rank)
}

// Mirrors internal/canasta/cards.go's pointValues table and Card.Value() —
// black threes are the one negative case in this ruleset (a deliberate
// deviation from standard Canasta scoring), everything else including red
// threes is a plain positive value.
const POINT_VALUES: Partial<Record<number, number>> = {
  [Four]: 5,
  [Five]: 5,
  [Six]: 5,
  [Seven]: 5,
  [Eight]: 10,
  [Nine]: 10,
  [Ten]: 10,
  [Jack]: 10,
  [Queen]: 10,
  [King]: 10,
  [Ace]: 20,
  [Two]: 20,
  [Joker]: 50,
  [Three]: 100,
}

export const cardPointValue = (card: Card): number => {
  const value = POINT_VALUES[card.rank] ?? 0
  return card.rank === Three && isBlack(card) ? -value : value
}

// Mirrors internal/canasta/moves.go's Player.ValidateMeld — the server
// remains authoritative, this is only used to decide when to show the
// create-meld affordance client-side.
export const isValidNewMeld = (cards: Card[]): boolean => {
  if (cards.length < 3) return false
  if (cards.some((c) => c.rank === Three)) return false

  const nonWild = cards.filter((c) => !isWildCard(c))
  if (nonWild.length === 0) return true // all-wild melds have no wildcard cap

  const rank = nonWild[0]!.rank
  if (!nonWild.every((c) => c.rank === rank)) return false

  const wildCount = cards.length - nonWild.length
  if (rank === Seven && wildCount > 0) return false
  return wildCount <= 3
}

// Mirrors internal/canasta/moves.go's Game.PlayRedThree's own card
// validation (rank Three, red suit) — only used to decide when to show
// the red-three create affordance client-side.
export const isValidRedThreePlay = (cards: Card[]): boolean => {
  return cards.length > 0 && cards.every(isRedThree)
}

// Splits a batch of red threes into the ones that arrived via a foot
// pickup vs. everything else (initial hand or a stock draw) — the wire
// message only carries one fromFoot flag per play_red_three call, so a
// mixed batch has to be sent as (up to) two separate calls. See
// game.ts's footOriginCardIds for how membership is tracked.
export const splitByFootOrigin = (
  cards: Card[],
  footOriginCardIds: Set<number>,
): { footIds: number[]; handIds: number[] } => {
  const footIds: number[] = []
  const handIds: number[] = []
  for (const card of cards) {
    ;(footOriginCardIds.has(card.id) ? footIds : handIds).push(card.id)
  }
  return { footIds, handIds }
}

// Mirrors internal/canasta/moves.go's Game.AddToMeld exactly, including
// checking wildcard count cumulatively across the whole batch being added
// (the server increments meld.WildCount once per wild card in the loop
// and bails as soon as it exceeds 3) — except an all-wild meld, which has
// no wildcard cap at all, same as isValidNewMeld's allowance when the
// meld is first created. Works the same whether the meld is one of the
// player's staging melds or one of the team's official melds — the
// server now looks in both (see TeamMelds.vue).
export const isValidAddToMeld = (
  meld: { rank: Rank; wildCount: number },
  cards: Card[],
): boolean => {
  if (cards.length === 0) return false

  let wildCount = meld.wildCount
  for (const card of cards) {
    const wild = isWildCard(card)
    if (card.rank !== meld.rank && !wild) return false
    if (card.rank === Three) return false
    if (meld.rank === Seven && wild) return false
    if (wild) {
      wildCount++
      if (meld.rank !== Wild && wildCount > 3) return false
    }
  }
  return true
}

// Mirrors internal/canasta/moves.go's Game.BurnCards exactly, including
// checking wildcard count cumulatively across the whole selection being
// burned (seeded from the canasta's own existing cards, since the
// generated Canasta type has no wildCount field the way Meld does). The
// server has no rollback — a partially-invalid batch can mutate the
// canasta before erroring on a later card — so this validates the whole
// selection up front, never just per-card. Only used to decide when to
// show the burn affordance client-side; the server remains authoritative.
export const isValidBurn = (
  canasta: { rank: Rank; natural: boolean; cards: Card[] },
  cards: Card[],
): boolean => {
  if (cards.length === 0) return false

  let wildCount = canasta.cards.filter(isWildCard).length
  for (const card of cards) {
    const wild = isWildCard(card)
    if (wild && canasta.natural) return false
    if (card.rank !== canasta.rank && !wild) return false
    if (canasta.rank === Three) return false
    if (canasta.rank === Seven && wild) return false
    if (wild) {
      wildCount++
      if (wildCount > 3) return false
    }
  }
  return true
}

// Mirrors internal/canasta/moves.go's PickUpDiscardPile frozen check —
// only used to decide when to show the pile as pickable client-side.
export const isPileFrozen = (topCard: Card): boolean => topCard.rank === Three

// Mirrors internal/canasta/moves.go's PickUpDiscardPile card-matching
// logic exactly, including the wild-top-card special case (every
// selected card must itself be wild when the top card is). The go-down
// point-requirement check is deliberately NOT mirrored here — same as
// meetsGoDownRequirement being separate from meld validity below — the
// server remains authoritative on scoring; a rejected pickup surfaces
// through the normal error-toast path.
export const isValidPileMatch = (topCard: Card, cards: Card[]): boolean => {
  if (cards.length < 2) return false
  if (isPileFrozen(topCard)) return false

  const topWild = isWildCard(topCard)
  return cards.every((c) => (topWild ? isWildCard(c) : c.rank === topCard.rank || isWildCard(c)))
}

// Mirrors internal/canasta/canasta.go's meldRequirements — total staged
// meld points needed to go down, keyed by hand number. The game only ever
// runs hands 1-4 (see Game.EndHand); Infinity is a defensive fallback so
// an unexpected hand number hides the go-down button rather than
// wrongly showing it.
const MELD_REQUIREMENTS: Partial<Record<number, number>> = { 1: 50, 2: 90, 3: 120, 4: 150 }

// Mirrors internal/canasta/canasta.go's Meld.Score() — a plain sum of
// every card's point value, no canasta bonuses (those only apply to
// completed canastas, never to in-progress melds).
export const meldsPointTotal = (melds: { cards: Card[] }[]): number =>
  melds.reduce(
    (sum, meld) => sum + meld.cards.reduce((cardSum, card) => cardSum + cardPointValue(card), 0),
    0,
  )

export const meetsGoDownRequirement = (melds: { cards: Card[] }[], handNumber: number): boolean =>
  meldsPointTotal(melds) >= (MELD_REQUIREMENTS[handNumber] ?? Infinity)

// Mirrors internal/canasta/canasta.go's Team.MeetsGoOutRequirements
// exactly (see also Canasta.Score's identical four-way partition): one
// natural, one unnatural, one sevens, and one wildcards canasta, treated
// as strictly distinct buckets — a sevens or wildcards canasta doesn't
// also satisfy the generic natural/unnatural requirement.
export const meetsGoOutRequirements = (canastas: { rank: Rank; natural: boolean }[]): boolean => {
  let hasNatural = false
  let hasUnnatural = false
  let hasSevens = false
  let hasWildcards = false

  for (const c of canastas) {
    if (c.rank === Wild) hasWildcards = true
    else if (c.rank === Seven) hasSevens = true
    else if (c.natural) hasNatural = true
    else hasUnnatural = true
  }

  return hasNatural && hasUnnatural && hasSevens && hasWildcards
}

// Mirrors internal/canasta's completesGoOutRequirements exactly: whether
// adding a hypothetical new canasta of the given rank/naturalness to
// the team's existing ones would satisfy the go-out requirements — used
// to let a move that would otherwise strand a player's hand proceed
// anyway when the move itself completes the team's last required
// canasta type (see wouldStrandHand / completesLastCanastaAllowingOneCard
// below).
export const completesGoOutRequirements = (
  canastas: { rank: Rank; natural: boolean }[],
  rank: Rank,
  natural: boolean,
): boolean => meetsGoOutRequirements([...canastas, { rank, natural }])

// Mirrors internal/canasta's wouldStrandHand exactly: NewMeld,
// AddToMeld, and BurnCards all refuse to leave a hand below 2 cards
// unless the team can already go out — Discard itself refuses to
// discard from a 1-card hand without that permission, so a player left
// at 1 card any other way could never end their turn again.
export const wouldStrandHand = (handSize: number, cardsToPlay: number, canGoOut: boolean): boolean =>
  !canGoOut && handSize - cardsToPlay < 2

// Mirrors internal/canasta's completesLastCanastaAllowingOneCard
// exactly: a move that would otherwise strand the hand may proceed
// anyway when the resulting hand is exactly 1 card (never 0 — a player
// needs a card left to actually discard once granted permission — see
// wouldStrandHand above) and the move itself completes the team's last
// required canasta type, so the player can then request go-out
// permission for exactly this situation.
export const completesLastCanastaAllowingOneCard = (
  canastas: { rank: Rank; natural: boolean }[],
  resultingHandSize: number,
  becomesCanasta: boolean,
  rank: Rank,
  natural: boolean,
): boolean =>
  resultingHandSize === 1 && becomesCanasta && completesGoOutRequirements(canastas, rank, natural)

export const formatCard = (card: Card): string => {
  const rankNames = ['4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2', 'Joker', '3']
  const suitSymbols = ['♥', '♦', '♣', '♠']

  const rankName = rankNames[card.rank] || '?'
  const suitSymbol = card.rank !== Joker ? suitSymbols[card.suit] : ''

  return `${rankName}${suitSymbol}`
}
