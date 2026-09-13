<script setup lang="ts">
// The player's own hand, fanned across the bottom of the screen. Selection
// is a controlled prop, not local state: the move model is "select card(s),
// then click where they go" (e.g. the discard pile), and the destination
// (a sibling of this component) needs to see the same selection GameView
// does, so GameView owns it and this component just requests toggles.
//
// Manual reordering (click-and-drag) is different: it's purely cosmetic
// hand arrangement, not gameplay intent, so the drag gesture and its live
// preview are handled entirely locally — only the final drop position is
// reported to the parent (see useSortableHand.moveCard).
import { ref, computed } from "vue";
import type { Card } from "@/types/canasta";
import PlayingCard from "./PlayingCard.vue";

const props = defineProps<{ cards: Card[]; selectedIds: Set<number> }>();
const emit = defineEmits<{ toggle: [id: number]; reorder: [id: number, toIndex: number] }>();

const hoveredId = ref<number | null>(null);

function isSelected(id: number): boolean {
  return props.selectedIds.has(id);
}

const CARD_SPACING_PX = 30;
const SELECTED_LIFT_PERCENT = 20;
const HOVERED_LIFT_PERCENT = 10;
const DRAGGED_LIFT_PERCENT = 15;
// How far the pointer has to move before a press counts as a drag rather
// than a click — keeps ordinary card selection from being eaten by drag
// handling on a slightly-jittery click.
const DRAG_THRESHOLD_PX = 6;

type DragState = {
  id: number;
  pointerId: number;
  startClientX: number;
  startIndex: number;
  deltaX: number;
  dragging: boolean;
};

const dragState = ref<DragState | null>(null);

// The order actually rendered: props.cards, except while a drag has passed
// the threshold, when the dragged card is spliced into whichever slot it
// currently overlaps so the rest of the fan visibly makes room for it.
const displayOrder = computed<Card[]>(() => {
  const drag = dragState.value;
  if (!drag || !drag.dragging) return props.cards;

  const count = props.cards.length;
  const fromIndex = props.cards.findIndex((card) => card.id === drag.id);
  if (fromIndex === -1) return props.cards;

  // The center term used to compute the dragged card's on-screen offset
  // cancels out here — the slot it currently overlaps is just its
  // starting index shifted by however many card-widths the pointer moved.
  const rawSlot = drag.startIndex + drag.deltaX / CARD_SPACING_PX;
  const targetIndex = Math.max(0, Math.min(count - 1, Math.round(rawSlot)));

  const next = [...props.cards];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, moved!);
  return next;
});

const cardLayouts = computed(() => {
  const cards = displayOrder.value;
  const count = cards.length;
  const center = (count - 1) / 2;
  const drag = dragState.value;

  return cards.map((card, i) => {
    const isDragged = drag?.dragging === true && drag.id === card.id;
    const liftPercent =
      (isSelected(card.id) ? SELECTED_LIFT_PERCENT : 0) +
      (hoveredId.value === card.id && !isDragged ? HOVERED_LIFT_PERCENT : 0) +
      (isDragged ? DRAGGED_LIFT_PERCENT : 0);
    // The dragged card tracks the raw pointer delta from its starting slot
    // instead of snapping to displayOrder's grid, so it follows the cursor
    // smoothly while everything else animates into its new position.
    const offsetPx = isDragged
      ? (drag!.startIndex - center) * CARD_SPACING_PX + drag!.deltaX
      : (i - center) * CARD_SPACING_PX;

    return {
      card,
      isDragged,
      // z-index always tracks fan order (never bumped for selection, hover,
      // or an active drag), so a raised or dragged card still stays tucked
      // under whichever cards currently sit to its right in the preview.
      style: {
        transform: `translate(calc(-50% + ${offsetPx}px), -${liftPercent}%)`,
        zIndex: i,
      },
    };
  });
});

// A real mouse always fires a native `click` after `pointerup` — preventDefault
// can't stop that (it only ever suppresses touch/pen's synthetic compat
// events, never a genuine mouse click) — so a completed drag is reported
// through the pointer handlers below, and this flag tells the click that
// follows right behind it to skip toggling selection. Reset at the start
// of the next press too, in case some browser/pointer type doesn't fire
// that trailing click at all (e.g. a suppressed touch compat click),
// so a stale flag can't wrongly eat more than one future click.
let suppressNextToggle = false;

function onPointerDown(event: PointerEvent, cardId: number, index: number): void {
  suppressNextToggle = false;
  // Stops touch from scrolling the page while a card is being dragged.
  event.preventDefault();
  // Optional call: not implemented in every test/embedded environment,
  // and dragging still works without it — it just also keeps tracking
  // the pointer if it strays outside the card's own bounds mid-drag.
  (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  dragState.value = {
    id: cardId,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startIndex: index,
    deltaX: 0,
    dragging: false,
  };
}

function onPointerMove(event: PointerEvent): void {
  const drag = dragState.value;
  if (!drag || event.pointerId !== drag.pointerId) return;

  const deltaX = event.clientX - drag.startClientX;
  if (!drag.dragging && Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
  dragState.value = { ...drag, deltaX, dragging: true };
}

function onPointerUp(event: PointerEvent): void {
  const drag = dragState.value;
  if (!drag || event.pointerId !== drag.pointerId) return;

  if (drag.dragging) {
    suppressNextToggle = true;
    const toIndex = displayOrder.value.findIndex((card) => card.id === drag.id);
    if (toIndex !== -1 && toIndex !== drag.startIndex) {
      emit("reorder", drag.id, toIndex);
    }
  }
  // A plain (non-drag) press is left for the click handler below to turn
  // into a toggle — mouse and keyboard both naturally produce a `click`,
  // so there's no need to emit one from here too.
  dragState.value = null;
}

function onPointerCancel(event: PointerEvent): void {
  if (dragState.value?.pointerId !== event.pointerId) return;
  dragState.value = null;
}

// Handles both a plain mouse/touch click and genuine keyboard activation
// (Enter/Space) — see suppressNextToggle above for why a click that was
// actually the tail end of a drag doesn't toggle selection here too.
function onCardClick(cardId: number): void {
  if (suppressNextToggle) {
    suppressNextToggle = false;
    return;
  }
  emit("toggle", cardId);
}
</script>

<template>
  <div class="fixed inset-x-0 bottom-0 flex translate-y-1/2 justify-center pointer-events-none">
    <!-- Height is derived from the same scaled card width (via the PNG's
         769:1065 aspect ratio) rather than an independent fixed clamp, so
         translate-y-1/2 above stays "half a card tall" at any --card-scale
         instead of drifting the whole hand offscreen at small scales. -->
    <div
      class="relative h-[calc(var(--card-base-width)*var(--card-scale,1)*1065/769)] w-full max-w-5xl"
    >
      <!-- Selected highlight is a drop-shadow, not a ring/border: it
           follows the PNG's actual alpha shape rather than our CSS box —
           the source art has transparent padding and its own corner
           radius that don't line up with a CSS border-radius. -->
      <button v-for="(layout, i) in cardLayouts" :key="layout.card.id" type="button"
        class="absolute bottom-0 left-1/2 w-[calc(var(--card-base-width)*var(--card-scale,1))] pointer-events-auto cursor-grab touch-none"
        :class="[
          layout.isDragged ? 'cursor-grabbing' : 'transition-all duration-150',
          isSelected(layout.card.id)
            ? '[filter:drop-shadow(0_0_6px_var(--color-card-blue))_drop-shadow(0_0_14px_var(--color-card-blue))]'
            : '',
        ]" :style="layout.style" :data-selected="isSelected(layout.card.id)"
        :data-dragging="layout.isDragged" @click="onCardClick(layout.card.id)"
        @pointerdown="onPointerDown($event, layout.card.id, i)" @pointermove="onPointerMove"
        @pointerup="onPointerUp" @pointercancel="onPointerCancel" @mouseenter="hoveredId = layout.card.id"
        @mouseleave="hoveredId = null">
        <PlayingCard :card="layout.card" />
      </button>
    </div>
  </div>
</template>
