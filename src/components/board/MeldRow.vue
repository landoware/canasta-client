<script setup lang="ts">
// A horizontal row of melds/canastas — each group renders as a tight
// face-up stack of its own cards (matching DeckPile's small-offset
// stacking, not a wide fan), sized the same as the deck/discard piles,
// with its card count shown underneath (same treatment as DiscardPile).
// Optionally appends a dashed "create meld here" tile, and/or makes
// individual groups clickable "add selected cards here" targets — used
// on both the melds row, for add-to-meld, and the canastas row, for
// burning (see TeamMelds.vue for both). Clicking a group that ISN'T
// currently a valid target instead toggles an expanded, fanned-out view
// of all its cards (one at a time) — see onTileClick.
import { ref, onMounted, onBeforeUnmount } from "vue";
import type { Card } from "@/types/canasta";
import { isRed, isBlack, isWildCard } from "@/utils/cardHelpers";
import PlayingCard from "./PlayingCard.vue";

type ExpandedStyle = { left: string; top: string };

const props = defineProps<{
  groups: { id: number; cards: Card[] }[];
  showCreateAffordance?: boolean;
  // True while groups are this player's own not-yet-committed staging
  // melds rather than the team's official melds (see game.ts's
  // hasGoneDown) — dims the stacks so staging melds read as provisional.
  dimmed?: boolean;
  // Group ids that currently accept the player's selected cards (via
  // add-to-meld) — rendered as a highlighted, clickable tile.
  clickableGroupIds?: Set<number>;
  // Forwarded to each stacked tile's PlayingCards (never the expanded
  // Teleport fan below, which stays full detail) — set by FitToArea
  // when it has to shrink this row below the user's configured scale,
  // since raster card art blurs at that point regardless of the global
  // cardScale setting.
  compact?: boolean;
  // OpponentMelds wraps this whole row in a -rotate-90/rotate-90
  // ancestor to match that opponent's orientation (see its own
  // comment) — the card art rotating along with it reads fine, but the
  // card-count label needs to counter-rotate back to upright, same
  // fix as OtherPlayerHand's own hand count. 'left'/'right' name which
  // ancestor rotation to cancel; omit for an unrotated row (TeamMelds).
  counterRotate?: 'left' | 'right';
}>();
const emit = defineEmits<{ create: []; "select-group": [id: number] }>();

const STEP_PX = 2;
// Same fan spacing PlayerHand uses for the player's own hand — the
// expanded view is meant to read as "the same fan, just for this meld".
const FAN_SPACING_PX = 30;
const TILE_SIZE_CLASS =
  "w-[calc(var(--card-base-width)*var(--card-scale,1)*0.75)] h-[calc(var(--card-base-width)*var(--card-scale,1)*0.75*1065/769)]";

function isClickable(id: number): boolean {
  return props.clickableGroupIds?.has(id) ?? false;
}

// A meld's top card (the last one rendered/stacked, so the most visible)
// is chosen for an at-a-glance "is this natural?" signal: a natural
// meld — no wildcards used — prefers a red card on top, one boosted with
// wildcards prefers black. Falls back to the cards' own order when the
// meld has no card of the preferred color at all.
function stackOrder(cards: Card[]): Card[] {
  const preferRed = !cards.some(isWildCard);
  const index = cards.findIndex((card) => (preferRed ? isRed(card) : isBlack(card)));
  if (index === -1 || index === cards.length - 1) return cards;

  const reordered = [...cards];
  const [preferred] = reordered.splice(index, 1);
  reordered.push(preferred!);
  return reordered;
}

const expandedId = ref<number | null>(null);
const expandedStyle = ref<ExpandedStyle | null>(null);

// Keeps clear of the viewport edges — a canasta's expanded fan is
// unbounded in card count (unlike a meld, capped low in practice) and
// easily wider than the screen, especially when its tile itself isn't
// centered on screen (e.g. one of several melds/canastas side by side).
const VIEWPORT_MARGIN_PX = 16;

// Anchored to the clicked tile's actual on-screen position (not just a
// CSS percentage of its own, possibly off-center, row) and clamped to
// stay fully on-screen — teleported to <body> so this fixed positioning
// is always viewport-relative, never relative to some transformed
// ancestor upstream (fans/rotations are used throughout this board).
function computeExpandedStyle(tileEl: HTMLElement, cardCount: number): ExpandedStyle {
  const rect = tileEl.getBoundingClientRect();
  // The stack tile itself renders at 0.75x card scale (see TILE_SIZE_CLASS);
  // the expanded cards render at full scale, same as PlayerHand's own hand.
  const fullCardWidth = rect.width / 0.75;
  const fullCardHeight = (fullCardWidth * 1065) / 769;
  const fanWidth = fullCardWidth + (cardCount - 1) * FAN_SPACING_PX;

  const viewportWidth = window.innerWidth;
  const tileCenterX = rect.left + rect.width / 2;
  const halfFan = fanWidth / 2;
  const minCenterX = VIEWPORT_MARGIN_PX + halfFan;
  const maxCenterX = viewportWidth - VIEWPORT_MARGIN_PX - halfFan;
  // A fan wider than the viewport can't be fully clamped on-screen either
  // way — falls back to centering on the viewport as the least-bad option.
  const centerX = minCenterX > maxCenterX ? viewportWidth / 2 : Math.min(Math.max(tileCenterX, minCenterX), maxCenterX);

  const spaceAbove = rect.top;
  const top =
    spaceAbove >= fullCardHeight + VIEWPORT_MARGIN_PX
      ? rect.top - fullCardHeight - VIEWPORT_MARGIN_PX
      : rect.bottom + VIEWPORT_MARGIN_PX;

  return { left: `${centerX}px`, top: `${top}px` };
}

function closeExpanded(): void {
  expandedId.value = null;
  expandedStyle.value = null;
}

function onTileClick(groupId: number, event: MouseEvent): void {
  if (isClickable(groupId)) {
    emit("select-group", groupId);
    return;
  }
  if (expandedId.value === groupId) {
    closeExpanded();
    return;
  }
  const group = props.groups.find((g) => g.id === groupId);
  if (!group) return;
  // Stops this same click from also reaching the document-level
  // listener below, which would otherwise immediately collapse the
  // expansion this click just opened/switched to (a native click event
  // bubbles synchronously, before Vue re-renders).
  event.stopPropagation();
  expandedStyle.value = computeExpandedStyle(event.currentTarget as HTMLElement, group.cards.length);
  expandedId.value = groupId;
}

// Clicking anywhere else on the screen closes an open expansion — the
// standard "backdrop click" pattern. Doesn't fire for the click that
// opens/switches an expansion in the first place (see stopPropagation
// above), so switching directly between tiles still works in one click.
function handleDocumentClick(): void {
  if (expandedId.value !== null) closeExpanded();
}

onMounted(() => document.addEventListener("click", handleDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", handleDocumentClick));
</script>

<template>
  <div class="flex flex-wrap items-start justify-center gap-4">
    <button v-for="group in groups" :key="group.id" type="button" class="relative pointer-events-auto cursor-pointer"
      :class="[
        TILE_SIZE_CLASS,
        isClickable(group.id)
          ? '[filter:drop-shadow(0_0_6px_var(--color-card-blue))_drop-shadow(0_0_14px_var(--color-card-blue))]'
          : 'hover:-translate-y-0.5',
      ]" @click="onTileClick(group.id, $event)">
      <!-- dimmed only ever applies to this stack/count, never to the
           expanded view below — it's a "provisional" cue for the tiny
           tile, but would just wash out an already-overlapping fan of
           full-size cards meant to be read clearly. -->
      <div class="absolute inset-0" :class="dimmed ? 'opacity-50' : ''">
        <PlayingCard v-for="(card, i) in stackOrder(group.cards)" :key="card.id" :card="card" :compact="compact"
          class="!absolute !left-0 !top-0"
          :style="{ transform: `translate(${i * STEP_PX}px, ${-(i * STEP_PX)}px)`, zIndex: i }" />
        <span
          class="absolute -bottom-6 left-1/2 -translate-x-1/2 font-rs-bold text-card-white"
          :class="{ 'rotate-90': counterRotate === 'left', '-rotate-90': counterRotate === 'right' }"
          >{{
          group.cards.length
          }}</span>
      </div>

      <!-- Expanded view: every card fanned out exactly like PlayerHand's
           own hand fan (same spacing, same full card width, same
           translate-based centering) — teleported to <body> and
           positioned in viewport pixels (see computeExpandedStyle) so it's
           always centered above the actual tile and clamped fully
           on-screen, regardless of where that tile sits in its row or how
           wide the fan is (a canasta's card count is unbounded). -->
      <Teleport to="body">
        <div v-if="expandedId === group.id && expandedStyle" class="fixed"
          :style="{ left: expandedStyle.left, top: expandedStyle.top, zIndex: 999 }">
          <PlayingCard v-for="(card, i) in group.cards" :key="card.id" :card="card" class="!absolute !top-0 !left-0"
            :style="{
              // Inline width (not a class) so it reliably beats PlayingCard's
              // own hardcoded `w-full` — Tailwind doesn't otherwise guarantee
              // a plain utility class wins based on where it appears in the
              // template (see PlayerHand/DeckPile's card-sizing overrides).
              width: 'calc(var(--card-base-width)*var(--card-scale,1))',
              transform: `translate(calc(-50% + ${(i - (group.cards.length - 1) / 2) * FAN_SPACING_PX}px), 0)`,
              zIndex: i,
            }" />
        </div>
      </Teleport>
    </button>
    <button v-if="showCreateAffordance" type="button"
      class="relative flex items-center justify-center rounded-2xl border-2 border-dashed border-card-white/40 pointer-events-auto hover:border-card-white"
      :class="TILE_SIZE_CLASS" aria-label="Create meld from selected cards" @click="emit('create')">
      <span class="font-rs-bold text-4xl text-card-white">+</span>
    </button>
  </div>
</template>
