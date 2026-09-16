<script setup lang="ts">
// Store-aware wrapper, following CenterPile.vue's pattern. Places
// in-progress melds and completed canastas at the two screen positions
// "halfway between the draw/discard pile and [a hand]" — halfway to the
// player's own hand (bottom) by default, halfway to the partner's hand
// (top) for the other — swappable via the meldsPosition setting. Also
// hosts the create-meld affordance (melds row only — new melds are never
// created directly as canastas).
import { computed, ref, watch } from 'vue'
import type { GameStore } from '@/stores/game'
import { useSettingsStore, MeldsPositionBottom } from '@/stores/settings'
import { PhaseDrawing, PhasePlaying, Wild } from '@/types/canasta'
import type { Rank } from '@/types/canasta'
import {
  isValidNewMeld,
  isValidAddToMeld,
  isValidBurn,
  isValidRedThreePlay,
  isRedThree,
  isWildCard,
  meetsGoDownRequirement,
  wouldStrandHand,
  completesLastCanastaAllowingOneCard,
  splitByFootOrigin,
} from '@/utils/cardHelpers'
import MeldRow from './MeldRow.vue'
import FitToArea from './FitToArea.vue'
import Button from '@/components/Button.vue'

const props = defineProps<{ gameStore: GameStore; selectedCardIds: Set<number> }>()
const emit = defineEmits<{ melded: [] }>()
const settings = useSettingsStore()

const meldsAtBottom = computed(() => settings.meldsPosition === MeldsPositionBottom)

// top-1/4 / top-3/4 (25%/75% of the viewport) are the literal midpoints
// between the center (where CenterPile sits) and the top/bottom edges
// (where the partner's and the player's hands sit).
const bottomPositionClass = 'top-3/4 -translate-y-1/2'
const topPositionClass = 'top-1/4 -translate-y-1/2'

const selectedCards = computed(() =>
  props.gameStore.myHand.filter((card) => props.selectedCardIds.has(card.id)),
)

// New meld / add-to-meld may also run during the draw phase, but only
// while staging (before going down) — mirrors dispatch.go's
// meldAllowedInDrawPhase carve-out, which lets a player stage a meld
// before picking up the discard pile without loosening the phase rule
// for a player extending their team's real, already-gone-down melds.
const canMeld = computed(
  () =>
    props.gameStore.isMyTurn &&
    !props.gameStore.pendingMove &&
    (props.gameStore.currentPhase === PhasePlaying ||
      (props.gameStore.currentPhase === PhaseDrawing && !props.gameStore.hasGoneDown)),
)

// Melding/adding/burning the current selection must never leave the
// hand stranded at fewer than 2 cards without go-out permission — see
// cardHelpers.wouldStrandHand, mirroring internal/canasta's own rule
// exactly (Discard itself refuses to discard from a 1-card hand without
// that permission, so nothing else may leave one either).
const selectionWouldStrandHand = computed(() =>
  wouldStrandHand(props.gameStore.myHand.length, selectedCards.value.length, props.gameStore.canGoOut),
)

// A create-meld/add-to-meld that would strand the hand may still be
// allowed when it's this exact move that completes the team's last
// required canasta type — see cardHelpers.completesLastCanastaAllowingOneCard,
// mirroring moves.go's identical escape hatch exactly (only relevant
// once gone down and reaching 7+ cards; a staging meld never
// immediately becomes a canasta).
const createMeldCompletesGoOut = computed(() => {
  if (!props.gameStore.hasGoneDown || selectedCards.value.length < 7) return false
  const nonWild = selectedCards.value.filter((c) => !isWildCard(c))
  const rank: Rank = nonWild.length > 0 ? nonWild[0]!.rank : Wild
  const natural = nonWild.length === selectedCards.value.length
  const resultingHandSize = props.gameStore.myHand.length - selectedCards.value.length
  return completesLastCanastaAllowingOneCard(
    props.gameStore.myTeamCanastas,
    resultingHandSize,
    true,
    rank,
    natural,
  )
})

const canCreateMeld = computed(
  () =>
    canMeld.value &&
    (!selectionWouldStrandHand.value || createMeldCompletesGoOut.value) &&
    isValidNewMeld(selectedCards.value),
)

function onCreateMeld(): void {
  if (!canCreateMeld.value) return
  props.gameStore.newMeld([...props.selectedCardIds])
  emit('melded')
}

// Add-to-meld works against whichever list myTeamMelds currently is —
// staging melds pre-go-down, the team's official melds after (see
// AddToMeld in moves.go, which now checks both). myTeamMelds is always
// entirely one or the other, so no extra gating is needed here.
const addableMeldIds = computed(() => {
  if (!canMeld.value) return new Set<number>()
  const ids = props.gameStore.myTeamMelds
    .filter((meld) => {
      if (!isValidAddToMeld(meld, selectedCards.value)) return false
      if (!selectionWouldStrandHand.value) return true
      // Escape hatch: only relevant for official (already-gone-down)
      // melds reaching 7+ cards — staging melds never immediately
      // become canastas via AddToMeld (see moves.go).
      if (!props.gameStore.hasGoneDown) return false
      const addedWildCount = selectedCards.value.filter(isWildCard).length
      const resultingSize = meld.cards.length + selectedCards.value.length
      const resultingHandSize = props.gameStore.myHand.length - selectedCards.value.length
      const natural = meld.wildCount + addedWildCount === 0
      return completesLastCanastaAllowingOneCard(
        props.gameStore.myTeamCanastas,
        resultingHandSize,
        resultingSize >= 7,
        meld.rank,
        natural,
      )
    })
    .map((meld) => meld.id)
  return new Set(ids)
})

function onSelectMeld(meldId: number): void {
  if (!addableMeldIds.value.has(meldId)) return
  props.gameStore.addToMeld([...props.selectedCardIds], meldId)
  emit('melded')
}

// Burning uses the same "select cards, click the target" shape as
// add-to-meld, but against the team's completed canastas — see
// BurnCards in moves.go. Unlike myTeamMelds (staging pre-go-down,
// official after), myTeamCanastas is always the team's real,
// already-scored canastas.
const burnableCanastaIds = computed(() => {
  if (!props.gameStore.canPlay || selectionWouldStrandHand.value) return new Set<number>()
  const ids = props.gameStore.myTeamCanastas
    .filter((canasta) => isValidBurn(canasta, selectedCards.value))
    .map((canasta) => canasta.id)
  return new Set(ids)
})

function onSelectCanasta(canastaId: number): void {
  if (!burnableCanastaIds.value.has(canastaId)) return
  props.gameStore.burnCards([...props.selectedCardIds], canastaId)
  emit('melded')
}

// Go down is only ever about the staged melds already on the table (no
// card selection involved), so it just needs canPlay + the point
// threshold for the current hand — see cardHelpers.meetsGoDownRequirement.
const canGoDown = computed(
  () =>
    props.gameStore.canPlay &&
    !props.gameStore.hasGoneDown &&
    meetsGoDownRequirement(props.gameStore.myTeamMelds, props.gameStore.handNumber),
)

function onGoDown(): void {
  if (!canGoDown.value) return
  props.gameStore.goDown()
}

// Red threes display alongside the canastas — like a canasta, a red
// three is a completed, scored group rather than something still in
// play. Sentinel id: real group ids come from actual card ids (always
// >= 0), so -1 can never collide with one.
const RED_THREES_GROUP_ID = -1
const redThreeGroups = computed(() =>
  props.gameStore.myRedThrees.length > 0
    ? [{ id: RED_THREES_GROUP_ID, cards: props.gameStore.myRedThrees }]
    : [],
)

// Playing red threes is only ever allowed at the very start of a turn
// (before the normal draw — see PlayRedThree in moves.go), same window
// as canDraw.
const canPlayRedThree = computed(
  () => props.gameStore.canDraw && isValidRedThreePlay(selectedCards.value),
)

// Set right after this client asks to play red three(s) (manually or
// automatically); the watcher below fires the follow-up normal draw once
// none remain in hand — see it for why that's not immediate.
const awaitingRedThreeDraw = ref(false)

function onPlayRedThree(): void {
  if (!canPlayRedThree.value) return
  // The wire message only carries one fromFoot flag per call, so a
  // selection mixing foot-origin and hand-origin red threes (a narrow
  // edge case — see splitByFootOrigin) can only send one group now; the
  // other stays selected/in hand and goes out on a follow-up click, or
  // via the auto-play watcher below.
  const { footIds, handIds } = splitByFootOrigin(selectedCards.value, props.gameStore.footOriginCardIds)
  if (footIds.length > 0) {
    props.gameStore.playRedThree(footIds, true)
  } else {
    props.gameStore.playRedThree(handIds, false)
  }
  awaitingRedThreeDraw.value = true
  emit('melded')
}

// Once this client has played a red three (via onPlayRedThree above) and
// none remain in hand, fires the turn's actual normal draw — but only
// for a play *this client* started, not just because a turn happened to
// start empty-handed of red threes (a plain new turn shouldn't auto-draw
// on its own). This reacts off the hand itself since sendMove's
// pendingMove guard means a follow-up move can't just be sent
// immediately after playRedThree() — the hand change is what signals the
// round trip completed. A hand holding both a foot-origin and a
// hand-origin red three needs two separate play_red_three calls (see
// onPlayRedThree/splitByFootOrigin); this fires once after each,
// eventually drawing once the hand is clear of both.
watch(
  () => [props.gameStore.myHand, props.gameStore.canDraw] as const,
  ([hand, canDraw]) => {
    if (!canDraw) return
    const heldRedThrees = hand.filter(isRedThree)

    if (heldRedThrees.length === 0 && awaitingRedThreeDraw.value) {
      awaitingRedThreeDraw.value = false
      props.gameStore.drawFromDeck()
    }
  },
)
</script>

<template>
  <div
    class="fixed inset-x-0 flex items-center justify-center gap-4 pointer-events-none"
    :class="meldsAtBottom ? bottomPositionClass : topPositionClass"
  >
    <FitToArea max-width="min(90vw, 64rem)" max-height="clamp(10rem, 24vh, 20rem)" v-slot="{ compact }">
      <MeldRow
        :groups="gameStore.myTeamMelds"
        :show-create-affordance="canCreateMeld"
        :dimmed="!gameStore.hasGoneDown"
        :clickable-group-ids="addableMeldIds"
        :compact="compact"
        @create="onCreateMeld"
        @select-group="onSelectMeld"
      />
    </FitToArea>
    <Button v-if="canGoDown" label="Go down" class="pointer-events-auto" @click="onGoDown" />
  </div>
  <div
    class="fixed inset-x-0 flex items-center justify-center pointer-events-none"
    :class="meldsAtBottom ? topPositionClass : bottomPositionClass"
  >
    <FitToArea max-width="min(90vw, 64rem)" max-height="clamp(10rem, 24vh, 20rem)" v-slot="{ compact }">
      <MeldRow
        :groups="[...gameStore.myTeamCanastas, ...redThreeGroups]"
        :show-create-affordance="canPlayRedThree"
        :clickable-group-ids="burnableCanastaIds"
        :compact="compact"
        @create="onPlayRedThree"
        @select-group="onSelectCanasta"
      />
    </FitToArea>
  </div>
</template>
