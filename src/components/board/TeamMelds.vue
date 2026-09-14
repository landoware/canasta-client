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
import { PhaseDrawing, PhasePlaying } from '@/types/canasta'
import {
  isValidNewMeld,
  isValidAddToMeld,
  isValidBurn,
  isValidRedThreePlay,
  isRedThree,
  meetsGoDownRequirement,
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

const canCreateMeld = computed(() => canMeld.value && isValidNewMeld(selectedCards.value))

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
    .filter((meld) => isValidAddToMeld(meld, selectedCards.value))
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
  if (!props.gameStore.canPlay) return new Set<number>()
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
  props.gameStore.playRedThree([...props.selectedCardIds])
  awaitingRedThreeDraw.value = true
  emit('melded')
}

// Drives both halves of this feature reactively, off of the hand itself
// (which is what actually changes once a play_red_three round-trip
// completes — sendMove's pendingMove guard means a follow-up move can't
// just be sent immediately after playRedThree()):
//  - auto-play: with the setting on, any red three(s) sitting in hand at
//    the start of a turn get played automatically, in one batch.
//  - auto-draw: once no red three remains in hand (whether cleared by
//    auto-play or a manual play via onPlayRedThree above), fires the
//    turn's actual normal draw — but only for a play *this client*
//    started, not just because a turn happened to start empty-handed of
//    red threes (a plain new turn shouldn't auto-draw on its own).
// A red three played from hand always gets an immediate replacement card
// (see PlayRedThree in moves.go), which can itself be a further red
// three — unlike the normal draw, that path doesn't loop to clear it, so
// this can legitimately fire more than once per turn.
watch(
  () => [props.gameStore.myHand, props.gameStore.canDraw] as const,
  ([hand, canDraw]) => {
    if (!canDraw) return
    const heldRedThrees = hand.filter(isRedThree)

    if (heldRedThrees.length === 0) {
      if (awaitingRedThreeDraw.value) {
        awaitingRedThreeDraw.value = false
        props.gameStore.drawFromDeck()
      }
      return
    }

    if (settings.autoPlayRedThrees) {
      awaitingRedThreeDraw.value = true
      props.gameStore.playRedThree(heldRedThrees.map((card) => card.id))
    }
  },
  // A red three can already be sitting in hand the moment this mounts
  // (e.g. reloading mid-turn) — this shouldn't need a subsequent hand
  // change to notice that and auto-play it.
  { immediate: true },
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
