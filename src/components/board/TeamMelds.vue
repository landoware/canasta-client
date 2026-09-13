<script setup lang="ts">
// Store-aware wrapper, following CenterPile.vue's pattern. Places
// in-progress melds and completed canastas at the two screen positions
// "halfway between the draw/discard pile and [a hand]" — halfway to the
// player's own hand (bottom) by default, halfway to the partner's hand
// (top) for the other — swappable via the meldsPosition setting. Also
// hosts the create-meld affordance (melds row only — new melds are never
// created directly as canastas).
import { computed } from 'vue'
import type { GameStore } from '@/stores/game'
import { useSettingsStore, MeldsPositionBottom } from '@/stores/settings'
import { isValidNewMeld, meetsGoDownRequirement } from '@/utils/cardHelpers'
import MeldRow from './MeldRow.vue'
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
const canCreateMeld = computed(
  () => props.gameStore.canPlay && isValidNewMeld(selectedCards.value),
)

function onCreateMeld(): void {
  if (!canCreateMeld.value) return
  props.gameStore.newMeld([...props.selectedCardIds])
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
</script>

<template>
  <div
    class="fixed inset-x-0 flex items-center justify-center gap-4 pointer-events-none"
    :class="meldsAtBottom ? bottomPositionClass : topPositionClass"
  >
    <MeldRow
      :groups="gameStore.myTeamMelds"
      :show-create-affordance="canCreateMeld"
      :dimmed="!gameStore.hasGoneDown"
      @create="onCreateMeld"
    />
    <Button v-if="canGoDown" label="Go down" class="pointer-events-auto" @click="onGoDown" />
  </div>
  <div
    class="fixed inset-x-0 flex items-center justify-center pointer-events-none"
    :class="meldsAtBottom ? topPositionClass : bottomPositionClass"
  >
    <MeldRow :groups="gameStore.myTeamCanastas" />
  </div>
</template>
